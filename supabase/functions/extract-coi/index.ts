import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { pdfBase64, requirements } = await req.json();

    if (!pdfBase64) {
      throw new Error('No PDF data provided');
    }

    // Default requirements if not provided
    const reqs: Requirements = requirements || {
      general_liability: 1000000,
      auto_liability: 1000000,
      workers_comp: 'Statutory',
      employers_liability: 500000,
      custom_coverages: []
    };

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64
            }
          },
          {
            type: 'text',
            text: `You are an expert at extracting data from Certificate of Insurance (COI) documents.

Extract the following information from this COI PDF and return it as a JSON object:

{
  "companyName": "Full legal company name",
  "dba": "Doing Business As name (if any, otherwise null)",
  "expirationDate": "The EARLIEST policy expiration date among all coverages in YYYY-MM-DD format",
  "generalLiability": {
    "amount": number (e.g., 1000000 for $1M),
    "expirationDate": "YYYY-MM-DD"
  },
  "autoLiability": {
    "amount": number,
    "expirationDate": "YYYY-MM-DD"
  },
  "workersComp": {
    "amount": "Statutory" or number,
    "expirationDate": "YYYY-MM-DD"
  },
  "employersLiability": {
    "amount": number,
    "expirationDate": "YYYY-MM-DD"
  },
  "additionalCoverages": [
    {
      "type": "Cyber Liability" | "Professional Liability" | "Umbrella" | etc,
      "amount": number,
      "expirationDate": "YYYY-MM-DD"
    }
  ],
  "additionalInsured": "Names listed as additional insured (if any)",
  "certificateHolder": "Certificate holder name",
  "insuranceCompany": "Insurance company/carrier name",
  "waiverOfSubrogation": "yes or no - Check if waiver of subrogation is indicated on the COI"
}

CRITICAL INSTRUCTIONS FOR EXPIRATION DATES:
The COI document has a table with insurance policies. Look for columns like:
TYPE OF INSURANCE | POLICY NUMBER | POLICY EFF | POLICY EXP | LIMITS

✓ CORRECT: Extract dates from the "POLICY EXP" column ONLY (the expiration/end date)
✗ WRONG: Do NOT extract POLICY EFF dates (start dates), certificate issue dates, or any other dates

In each policy row, there are TWO dates - the earlier one is the start date (POLICY EFF), the later one is the expiration date (POLICY EXP). Always choose the LATER date from each row.

For the top-level expirationDate: Return the EARLIEST date from ONLY the 4 main coverages (GL, Auto, WC, EL).

Other rules:
- Extract amounts as pure numbers (e.g., 1000000 not "$1,000,000")
- Use YYYY-MM-DD format for all dates
- If a field is not found, use null
- For Workers Comp, if it says "Statutory" use that as a string
- Look for ANY additional coverage types beyond the standard 4 and include them in additionalCoverages array

Return ONLY the JSON object, no other text.`
          }
        ]
      }]
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not extract JSON from AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    // Transform to vendor format with compliance checking
    const vendorData = buildVendorData(extractedData, reqs);

    return new Response(
      JSON.stringify({ success: true, data: vendorData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to extract data from PDF'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function buildVendorData(extractedData: any, requirements: Requirements) {
  const vendorData: any = {
    name: extractedData.companyName || 'Unknown Company',
    dba: extractedData.dba,
    expirationDate: extractedData.expirationDate || new Date().toISOString().split('T')[0],
    coverage: {
      generalLiability: {
        amount: extractedData.generalLiability?.amount || 0,
        expirationDate: extractedData.generalLiability?.expirationDate,
        compliant: (extractedData.generalLiability?.amount || 0) >= requirements.general_liability
      },
      autoLiability: {
        amount: extractedData.autoLiability?.amount || 0,
        expirationDate: extractedData.autoLiability?.expirationDate,
        compliant: (extractedData.autoLiability?.amount || 0) >= requirements.auto_liability
      },
      workersComp: {
        amount: extractedData.workersComp?.amount || 'Statutory',
        expirationDate: extractedData.workersComp?.expirationDate,
        compliant: true
      },
      employersLiability: {
        amount: extractedData.employersLiability?.amount || 0,
        expirationDate: extractedData.employersLiability?.expirationDate,
        compliant: (extractedData.employersLiability?.amount || 0) >= requirements.employers_liability
      }
    },
    additionalCoverages: extractedData.additionalCoverages || [],
    rawData: extractedData,
    requirements: requirements,
    additionalInsured: extractedData.additionalInsured || '',
    certificateHolder: extractedData.certificateHolder || '',
    waiverOfSubrogation: extractedData.waiverOfSubrogation || ''
  };

  // Calculate status and issues
  const issues: any[] = [];
  const today = new Date();
  const expirationDate = new Date(vendorData.expirationDate);
  const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Check expiration
  if (daysUntilExpiration < 0) {
    vendorData.status = 'expired';
    vendorData.daysOverdue = Math.abs(daysUntilExpiration);
    issues.push({
      type: 'critical',
      message: `All policies expired ${vendorData.expirationDate} (${vendorData.daysOverdue} days overdue)`
    });
  } else if (daysUntilExpiration <= 30) {
    vendorData.status = 'expiring';
    vendorData.daysOverdue = 0;
    issues.push({
      type: 'warning',
      message: `Policies expiring in ${daysUntilExpiration} days`
    });
  } else {
    vendorData.status = 'compliant';
    vendorData.daysOverdue = 0;
  }

  // Check coverage compliance
  if (!vendorData.coverage.generalLiability.compliant) {
    vendorData.status = 'non-compliant';
    issues.push({
      type: 'error',
      message: `General Liability below requirement: $${(vendorData.coverage.generalLiability.amount / 1000000).toFixed(1)}M (requires $${(requirements.general_liability / 1000000).toFixed(1)}M)`
    });
  }

  if (!vendorData.coverage.autoLiability.compliant) {
    vendorData.status = 'non-compliant';
    issues.push({
      type: 'error',
      message: `Auto Liability below requirement: $${(vendorData.coverage.autoLiability.amount / 1000000).toFixed(1)}M (requires $${(requirements.auto_liability / 1000000).toFixed(1)}M)`
    });
  }

  if (!vendorData.coverage.employersLiability.compliant) {
    vendorData.status = 'non-compliant';
    issues.push({
      type: 'error',
      message: `Employers Liability below requirement: $${(vendorData.coverage.employersLiability.amount / 1000).toFixed(1)}K (requires $${(requirements.employers_liability / 1000).toFixed(1)}K)`
    });
  }

  // Check waiver of subrogation requirement
  if (requirements.require_waiver_of_subrogation) {
    const waiverText = (vendorData.waiverOfSubrogation || '').toLowerCase();
    if (waiverText.includes('yes') || waiverText.includes('included') || waiverText.includes('waived')) {
      vendorData.hasWaiverOfSubrogation = true;
    } else {
      vendorData.status = 'non-compliant';
      vendorData.missingWaiverOfSubrogation = true;
      issues.push({
        type: 'error',
        message: 'Waiver of Subrogation not included'
      });
    }
  }

  // Check additional insured requirement
  if (requirements.company_name && requirements.require_additional_insured) {
    const additionalInsuredText = (vendorData.additionalInsured || '').toLowerCase();
    const companyName = requirements.company_name.toLowerCase();
    if (!additionalInsuredText.includes(companyName)) {
      vendorData.status = 'non-compliant';
      vendorData.missingAdditionalInsured = true;
      issues.push({
        type: 'error',
        message: `${requirements.company_name} not listed as Additional Insured`
      });
    } else {
      vendorData.hasAdditionalInsured = true;
    }
  }

  // Check custom coverage requirements
  if (requirements.custom_coverages && requirements.custom_coverages.length > 0) {
    requirements.custom_coverages.forEach(requiredCoverage => {
      if (!requiredCoverage.required) return;

      const foundCoverage = vendorData.additionalCoverages.find(
        (cov: any) => cov.type && cov.type.toLowerCase().includes(requiredCoverage.type.toLowerCase())
      );

      if (!foundCoverage) {
        vendorData.status = 'non-compliant';
        issues.push({
          type: 'error',
          message: `Missing required coverage: ${requiredCoverage.type}`
        });
      } else if (foundCoverage.amount < requiredCoverage.amount) {
        vendorData.status = 'non-compliant';
        issues.push({
          type: 'error',
          message: `${requiredCoverage.type} below requirement: $${(foundCoverage.amount / 1000000).toFixed(1)}M (requires $${(requiredCoverage.amount / 1000000).toFixed(1)}M)`
        });
      }
    });
  }

  vendorData.issues = issues;
  return vendorData;
}
