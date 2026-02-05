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
            text: `You are an expert at extracting data from ACORD Certificate of Insurance (COI) forms.

IMPORTANT: This is likely an ACORD 25 form. Look carefully at these specific sections:

1. COMMERCIAL GENERAL LIABILITY section - Find:
   - "EACH OCCURRENCE" limit (usually $1,000,000 or $2,000,000)
   - "GENERAL AGGREGATE" limit (usually $2,000,000 or $4,000,000)
   - Policy expiration date in the row

2. AUTOMOBILE LIABILITY section - Find:
   - "COMBINED SINGLE LIMIT" (usually $1,000,000)
   - Policy expiration date

3. WORKERS COMPENSATION section - Find:
   - Usually shows "STATUTORY" or "X" in the WC STATUTORY LIMITS box
   - "E.L. EACH ACCIDENT" amount for Employers Liability

4. Look at the "INSURED" box at top left for the company name

5. Look at policy effective/expiration dates - they're in MM/DD/YYYY format

Extract and return this JSON:

{
  "companyName": "Company name from INSURED box",
  "expirationDate": "YYYY-MM-DD format - use the EARLIEST expiration date from all policies",
  "generalLiability": {
    "amount": <number - the EACH OCCURRENCE limit, e.g. 1000000 for $1,000,000>,
    "aggregate": <number - the GENERAL AGGREGATE limit>,
    "expirationDate": "YYYY-MM-DD"
  },
  "autoLiability": {
    "amount": <number - COMBINED SINGLE LIMIT>,
    "expirationDate": "YYYY-MM-DD"
  },
  "workersComp": {
    "amount": "Statutory",
    "expirationDate": "YYYY-MM-DD"
  },
  "employersLiability": {
    "amount": <number - E.L. EACH ACCIDENT amount>,
    "expirationDate": "YYYY-MM-DD"
  },
  "insuranceCompany": "Name of the insurance carrier",
  "additionalInsured": "Any text in DESCRIPTION OF OPERATIONS about additional insured",
  "certificateHolder": "Name and address from CERTIFICATE HOLDER box",
  "waiverOfSubrogation": "yes or no - check if waiver of subrogation is mentioned"
}

CRITICAL RULES:
- Convert ALL dollar amounts to plain numbers: $1,000,000 becomes 1000000
- Convert dates from MM/DD/YYYY to YYYY-MM-DD format
- If you see "1,000,000" that equals 1000000 (one million)
- If you see "2,000,000" that equals 2000000 (two million)
- NEVER return 0 for coverage amounts - look harder at the form
- The EACH OCCURRENCE limit is the main GL coverage amount

Return ONLY the JSON object.`
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
    additionalInsured: extractedData.additionalInsured || '',
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
