import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface Requirements {
  general_liability: number;
  auto_liability: number;
  workers_comp: string | number;
  employers_liability: number;
  company_name?: string;
  require_additional_insured?: boolean;
  require_waiver_of_subrogation?: boolean;
  custom_coverages?: Array<{
    type: string;
    amount: number;
    required: boolean;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { pdfBase64, requirements } = await req.json();

    if (!pdfBase64) {
      throw new Error('No PDF data provided');
    }

    const reqs: Requirements = requirements || {
      general_liability: 1000000,
      auto_liability: 1000000,
      workers_comp: 'Statutory',
      employers_liability: 500000
    };

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
          },
          {
            type: 'text',
            text: `Extract ALL insurance coverage data from this Certificate of Insurance (likely an ACORD 25 or similar form).

Read the entire document carefully and extract EVERY policy and coverage type listed, not just the common ones.

ALWAYS EXTRACT:
1. INSURED/COMPANY NAME - The business or person who holds the insurance
2. INSURANCE COMPANY - The carrier/insurer name
3. CERTIFICATE HOLDER - Who the certificate was issued to
4. ADDITIONAL INSURED - Check Description of Operations section
5. WAIVER OF SUBROGATION - Check Description of Operations section

STANDARD COVERAGES (extract if present on the certificate):
- GENERAL LIABILITY - "Each Occurrence" limit and "General Aggregate"
- AUTOMOBILE LIABILITY - "Combined Single Limit"
- WORKERS COMPENSATION - Usually "Statutory"
- EMPLOYERS LIABILITY - "Each Accident" amount

ADDITIONAL COVERAGES (extract ANY other coverage types found, such as):
- Umbrella/Excess Liability
- Professional Liability / Errors & Omissions
- Cyber Liability
- Inland Marine
- Property Insurance
- Pollution Liability
- Builders Risk
- Crime / Fidelity Bond
- Any other coverage type listed on the certificate

Return this JSON structure:
{
  "companyName": "insured company name",
  "expirationDate": "YYYY-MM-DD (earliest expiration across all policies)",
  "generalLiability": {
    "amount": <each occurrence as integer, or null if the field is blank/empty on the form>,
    "aggregate": <general aggregate as integer, or null if blank>,
    "expirationDate": "YYYY-MM-DD"
  },
  "autoLiability": {
    "amount": <combined single limit as integer, or null if blank>,
    "expirationDate": "YYYY-MM-DD"
  },
  "workersComp": {
    "amount": "Statutory",
    "expirationDate": "YYYY-MM-DD"
  },
  "employersLiability": {
    "amount": <each accident amount as integer, or null if blank>,
    "expirationDate": "YYYY-MM-DD"
  },
  "additionalCoverages": [
    {
      "type": "coverage type name (e.g. Umbrella Liability)",
      "amount": <limit as integer>,
      "aggregate": <aggregate limit as integer if listed, otherwise null>,
      "expirationDate": "YYYY-MM-DD"
    }
  ],
  "insuranceCompany": "carrier name",
  "additionalInsured": "yes or no",
  "certificateHolder": "name from certificate holder section",
  "waiverOfSubrogation": "yes or no"
}

IMPORTANT RULES:
- Include ALL coverage types found on the certificate
- If a standard coverage (GL, Auto, WC, EL) section exists on the form but the dollar amount fields are BLANK or EMPTY, set the entire coverage to null — do NOT infer or guess a value
- If a standard coverage is NOT on the certificate at all, set it to null
- Put any non-standard coverages in the "additionalCoverages" array
- If no additional coverages exist, return an empty array []
- ONLY report dollar amounts that are EXPLICITLY printed with a number on the document

NUMBER FORMAT: Convert dollar amounts to plain integers.
- $1,000,000 → 1000000
- $2,000,000 → 2000000
- $500,000 → 500000

DATE FORMAT: Convert to YYYY-MM-DD (e.g., 01/15/2025 → 2025-01-15)

Return ONLY the JSON object, no other text.`
          }
        ]
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('Claude response:', responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not extract JSON from AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    console.log('Extracted data:', JSON.stringify(extractedData));

    const vendorData = buildVendorData(extractedData, reqs);

    return new Response(
      JSON.stringify({ success: true, data: vendorData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to extract data from PDF' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

function buildVendorData(extractedData: any, requirements: Requirements) {
  // Build coverage object - only include coverages that were actually found on the COI
  const coverage: any = {};

  // General Liability
  if (extractedData.generalLiability) {
    const glAmount = extractedData.generalLiability.amount || 0;
    const glAggregate = extractedData.generalLiability.aggregate || (glAmount * 2);
    coverage.generalLiability = {
      amount: glAmount,
      aggregate: glAggregate,
      expirationDate: extractedData.generalLiability.expirationDate,
      compliant: glAmount >= requirements.general_liability
    };
  } else {
    // GL not found on COI - mark as non-compliant if required
    coverage.generalLiability = {
      amount: 0,
      aggregate: 0,
      expirationDate: null,
      compliant: requirements.general_liability <= 0,
      notFound: true
    };
  }

  // Auto Liability
  if (extractedData.autoLiability) {
    coverage.autoLiability = {
      amount: extractedData.autoLiability.amount || 0,
      expirationDate: extractedData.autoLiability.expirationDate,
      compliant: (extractedData.autoLiability.amount || 0) >= requirements.auto_liability
    };
  } else {
    coverage.autoLiability = {
      amount: 0,
      expirationDate: null,
      compliant: requirements.auto_liability <= 0,
      notFound: true
    };
  }

  // Workers Comp
  if (extractedData.workersComp) {
    coverage.workersComp = {
      amount: extractedData.workersComp.amount || 'Statutory',
      expirationDate: extractedData.workersComp.expirationDate,
      compliant: true
    };
  } else {
    coverage.workersComp = {
      amount: null,
      expirationDate: null,
      compliant: true,
      notFound: true
    };
  }

  // Employers Liability
  if (extractedData.employersLiability) {
    coverage.employersLiability = {
      amount: extractedData.employersLiability.amount || 0,
      expirationDate: extractedData.employersLiability.expirationDate,
      compliant: (extractedData.employersLiability.amount || 0) >= requirements.employers_liability
    };
  } else {
    coverage.employersLiability = {
      amount: 0,
      expirationDate: null,
      compliant: requirements.employers_liability <= 0,
      notFound: true
    };
  }

  // Process additional coverages extracted from the COI
  const additionalCoverages = (extractedData.additionalCoverages || []).map((cov: any) => ({
    type: cov.type || 'Unknown Coverage',
    amount: cov.amount || 0,
    aggregate: cov.aggregate || null,
    expirationDate: cov.expirationDate || null
  }));

  const vendorData: any = {
    name: extractedData.companyName || 'Unknown Company',
    expirationDate: extractedData.expirationDate || new Date().toISOString().split('T')[0],
    coverage: coverage,
    additionalCoverages: additionalCoverages,
    rawData: extractedData,
    requirements: requirements,
    additionalInsured: extractedData.additionalInsured || 'no',
    hasAdditionalInsured: (extractedData.additionalInsured || '').toLowerCase() === 'yes',
    hasWaiverOfSubrogation: (extractedData.waiverOfSubrogation || '').toLowerCase() === 'yes',
    certificateHolder: extractedData.certificateHolder || '',
    waiverOfSubrogation: extractedData.waiverOfSubrogation || '',
    insuranceCompany: extractedData.insuranceCompany || ''
  };

  const issues: any[] = [];
  const today = new Date();
  const expirationDate = new Date(vendorData.expirationDate);
  const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration < 0) {
    vendorData.status = 'expired';
    issues.push({ type: 'critical', message: `Policy expired on ${vendorData.expirationDate}` });
  } else if (daysUntilExpiration <= 30) {
    vendorData.status = 'expiring';
    issues.push({ type: 'warning', message: `Policy expiring in ${daysUntilExpiration} days` });
  } else {
    vendorData.status = 'compliant';
  }

  // Check standard coverage compliance
  if (!coverage.generalLiability.compliant) {
    if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
    if (coverage.generalLiability.notFound) {
      issues.push({ type: 'error', message: `General Liability not found on certificate (required $${(requirements.general_liability/1000000).toFixed(1)}M)` });
    } else {
      issues.push({ type: 'error', message: `General Liability $${(coverage.generalLiability.amount/1000000).toFixed(1)}M below required $${(requirements.general_liability/1000000).toFixed(1)}M` });
    }
  }

  if (!coverage.autoLiability.compliant) {
    if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
    if (coverage.autoLiability.notFound) {
      issues.push({ type: 'error', message: `Auto Liability not found on certificate (required $${(requirements.auto_liability/1000000).toFixed(1)}M)` });
    } else {
      issues.push({ type: 'error', message: `Auto Liability $${(coverage.autoLiability.amount/1000000).toFixed(1)}M below required $${(requirements.auto_liability/1000000).toFixed(1)}M` });
    }
  }

  if (!coverage.employersLiability.compliant) {
    if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
    if (coverage.employersLiability.notFound) {
      issues.push({ type: 'error', message: `Employers Liability not found on certificate (required $${(requirements.employers_liability/1000).toFixed(0)}K)` });
    } else {
      issues.push({ type: 'error', message: `Employers Liability $${(coverage.employersLiability.amount/1000).toFixed(0)}K below required $${(requirements.employers_liability/1000).toFixed(0)}K` });
    }
  }

  // Check custom coverage requirements against extracted additional coverages
  if (requirements.custom_coverages && requirements.custom_coverages.length > 0) {
    requirements.custom_coverages.forEach((requiredCoverage: any) => {
      if (!requiredCoverage.required) return;

      const foundCoverage = additionalCoverages.find(
        (cov: any) => cov.type && cov.type.toLowerCase().includes(requiredCoverage.type.toLowerCase())
      );

      if (!foundCoverage) {
        if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
        issues.push({ type: 'error', message: `Missing required coverage: ${requiredCoverage.type}` });
      } else if (foundCoverage.amount < requiredCoverage.amount) {
        if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
        issues.push({ type: 'error', message: `${requiredCoverage.type} $${(foundCoverage.amount / 1000000).toFixed(1)}M below required $${(requiredCoverage.amount / 1000000).toFixed(1)}M` });
      }
    });
  }

  // Check waiver of subrogation requirement
  if (requirements.require_waiver_of_subrogation) {
    if (vendorData.hasWaiverOfSubrogation) {
      // Already set to true above
    } else {
      if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
      vendorData.missingWaiverOfSubrogation = true;
      issues.push({ type: 'error', message: 'Waiver of Subrogation not included' });
    }
  }

  // Check additional insured requirement
  if (requirements.require_additional_insured) {
    if (!vendorData.hasAdditionalInsured) {
      if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
      vendorData.missingAdditionalInsured = true;
      issues.push({ type: 'error', message: 'Missing Additional Insured endorsement' });
    }
  }

  vendorData.issues = issues;
  return vendorData;
}
