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
            text: `You are an expert at extracting data from ACORD 25 Certificate of Insurance forms.

FORM LAYOUT - Read carefully:
The form has a table with coverage types on the LEFT and dollar limits on the RIGHT side.

LIMITS COLUMN (right side of form):
- Look for the column labeled "LIMITS" on the far right
- "EACH OCCURRENCE" row shows the per-incident GL limit (typically 1,000,000)
- "GENERAL AGGREGATE" row shows total GL limit (typically 2,000,000)
- "COMBINED SINGLE LIMIT" shows auto liability limit
- Dollar amounts appear as "1,000,000" or "2,000,000" etc.

POLICY DATES:
- "POLICY EFF" = start date, "POLICY EXP" = expiration date
- Use the EXP (expiration) date, format is MM/DD/YYYY
- Convert to YYYY-MM-DD format

ADDITIONAL INSURED:
- Check "DESCRIPTION OF OPERATIONS / LOCATIONS / VEHICLES" section
- If it says "certificate holder is an additional insured" or similar = YES
- If it mentions any form like "CG 20 11" or "additional insured endorsement" = YES

CERTIFICATE HOLDER:
- Bottom left box shows who requested this certificate
- This is often the landlord or company requiring insurance

Extract this JSON:

{
  "companyName": "Name from INSURED box (top left, the company that has the insurance)",
  "expirationDate": "YYYY-MM-DD - earliest POLICY EXP date",
  "generalLiability": {
    "amount": <number from EACH OCCURRENCE row in LIMITS column>,
    "aggregate": <number from GENERAL AGGREGATE row>,
    "expirationDate": "YYYY-MM-DD"
  },
  "autoLiability": {
    "amount": <number from COMBINED SINGLE LIMIT>,
    "expirationDate": "YYYY-MM-DD"
  },
  "workersComp": {
    "amount": "Statutory",
    "expirationDate": "YYYY-MM-DD"
  },
  "employersLiability": {
    "amount": <number from E.L. EACH ACCIDENT>,
    "expirationDate": "YYYY-MM-DD"
  },
  "insuranceCompany": "Insurance company name from INSURER column",
  "additionalInsured": "yes or no - YES if description mentions certificate holder as additional insured",
  "certificateHolder": "Name from CERTIFICATE HOLDER box",
  "waiverOfSubrogation": "yes or no"
}

CRITICAL:
- 1,000,000 = 1000000 (one million)
- 2,000,000 = 2000000 (two million)
- 500,000 = 500000
- NEVER return 0 - the limits ARE on the form, look in the LIMITS column on the right
- For additionalInsured: return "yes" if ANY mention of additional insured in description

Return ONLY the JSON.`
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
