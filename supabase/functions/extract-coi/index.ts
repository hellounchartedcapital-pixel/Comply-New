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
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
          },
          {
            type: 'text',
            text: `Extract insurance coverage data from this Certificate of Insurance (likely an ACORD 25 or similar form).

Read the entire document to understand its structure, then extract:

1. INSURED/COMPANY NAME - The business or person who holds the insurance
2. POLICY EXPIRATION DATE - When coverage ends (use earliest date if multiple policies)
3. GENERAL LIABILITY - Look for "Each Occurrence" limit and "General Aggregate"
4. AUTO LIABILITY - Look for "Combined Single Limit"
5. WORKERS COMPENSATION - Usually "Statutory" plus Employers Liability amounts
6. INSURANCE COMPANY - The carrier/insurer name
7. CERTIFICATE HOLDER - Who the certificate was issued to
8. ADDITIONAL INSURED - Check Description of Operations section
9. WAIVER OF SUBROGATION - Check Description of Operations section

Return this JSON structure:
{
  "companyName": "insured company name",
  "expirationDate": "YYYY-MM-DD",
  "generalLiability": {
    "amount": <each occurrence as integer, e.g. 1000000>,
    "aggregate": <general aggregate as integer>,
    "expirationDate": "YYYY-MM-DD"
  },
  "autoLiability": {
    "amount": <combined single limit as integer>,
    "expirationDate": "YYYY-MM-DD"
  },
  "workersComp": {
    "amount": "Statutory",
    "expirationDate": "YYYY-MM-DD"
  },
  "employersLiability": {
    "amount": <each accident amount as integer>,
    "expirationDate": "YYYY-MM-DD"
  },
  "insuranceCompany": "carrier name",
  "additionalInsured": "yes or no",
  "certificateHolder": "name from certificate holder section",
  "waiverOfSubrogation": "yes or no"
}

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
  const glAmount = extractedData.generalLiability?.amount || 0;
  const glAggregate = extractedData.generalLiability?.aggregate || (glAmount * 2);

  const vendorData: any = {
    name: extractedData.companyName || 'Unknown Company',
    expirationDate: extractedData.expirationDate || new Date().toISOString().split('T')[0],
    coverage: {
      generalLiability: {
        amount: glAmount,
        aggregate: glAggregate,
        expirationDate: extractedData.generalLiability?.expirationDate,
        compliant: glAmount >= requirements.general_liability
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
    rawData: extractedData,
    requirements: requirements,
    additionalInsured: extractedData.additionalInsured || 'no',
    hasAdditionalInsured: (extractedData.additionalInsured || '').toLowerCase() === 'yes',
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

  if (!vendorData.coverage.generalLiability.compliant && vendorData.coverage.generalLiability.amount > 0) {
    if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
    issues.push({ type: 'error', message: `General Liability $${(vendorData.coverage.generalLiability.amount/1000000).toFixed(1)}M below required $${(requirements.general_liability/1000000).toFixed(1)}M` });
  }

  if (!vendorData.coverage.autoLiability.compliant && vendorData.coverage.autoLiability.amount > 0) {
    if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
    issues.push({ type: 'error', message: `Auto Liability below requirement` });
  }

  if (!vendorData.coverage.employersLiability.compliant && vendorData.coverage.employersLiability.amount > 0) {
    if (vendorData.status === 'compliant') vendorData.status = 'non-compliant';
    issues.push({ type: 'error', message: `Employers Liability below requirement` });
  }

  vendorData.issues = issues;
  return vendorData;
}
