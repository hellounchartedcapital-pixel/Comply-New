import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const { storagePath } = await req.json();

    if (!storagePath) {
      throw new Error('No storage path provided');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('lease-documents')
      .download(storagePath);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      throw new Error('Failed to download lease document from storage');
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    // Call Claude API with commercial lease extraction prompt
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Data
            }
          },
          {
            type: 'text',
            text: `You are an expert at extracting data from commercial real estate leases (office, retail, industrial properties).

Extract the following information from this lease document and return it as a JSON object:

{
  "tenant": {
    "name": "Legal name of the tenant/company",
    "dba": "Doing Business As name if different (null if same or not specified)",
    "contactName": "Primary contact person if mentioned (null if not found)",
    "contactEmail": "Contact email if mentioned (null if not found)",
    "contactPhone": "Contact phone if mentioned (null if not found)"
  },
  "property": {
    "name": "Building or property name if specified",
    "address": "Full street address of the property",
    "city": "City",
    "state": "State (2-letter code)",
    "zip": "ZIP code"
  },
  "leaseDetails": {
    "suite": "Suite, unit, or space number",
    "squareFootage": number or null,
    "leaseStartDate": "YYYY-MM-DD format",
    "leaseEndDate": "YYYY-MM-DD format",
    "propertyType": "office" | "retail" | "industrial" | "mixed-use" | "other"
  },
  "insuranceRequirements": {
    "generalLiability": {
      "perOccurrence": number (e.g., 1000000 for $1M),
      "generalAggregate": number,
      "productsCompletedOps": number or null
    },
    "autoLiability": {
      "combinedSingleLimit": number
    },
    "workersComp": {
      "required": true/false,
      "amount": "Statutory" or number
    },
    "employersLiability": {
      "eachAccident": number,
      "diseasePolicyLimit": number or null,
      "diseaseEachEmployee": number or null
    },
    "umbrellaExcessLiability": {
      "required": true/false,
      "amount": number or null
    },
    "propertyInsurance": {
      "required": true/false,
      "coverageBasis": "replacement cost" | "actual cash value" | null,
      "amount": number or null
    },
    "professionalLiability": {
      "required": true/false,
      "amount": number or null
    },
    "cyberLiability": {
      "required": true/false,
      "amount": number or null
    },
    "additionalRequirements": {
      "landlordAsAdditionalInsured": true/false,
      "waiverOfSubrogation": true/false,
      "primaryNonContributory": true/false,
      "thirtyDayCancellationNotice": true/false
    },
    "certificateHolder": {
      "name": "Who should be listed as certificate holder",
      "address": "Certificate holder address if specified"
    }
  },
  "rawInsuranceText": "Copy the exact text of the insurance requirements section for reference"
}

IMPORTANT INSTRUCTIONS:
1. Look for the Insurance section/exhibit - often labeled "Insurance Requirements", "Tenant's Insurance", "Article [X] Insurance", or similar
2. Commercial leases typically require higher limits than residential - common minimums are $1M per occurrence for GL
3. Extract dollar amounts as pure numbers (1000000 not "$1,000,000")
4. Use YYYY-MM-DD format for all dates
5. If a requirement is not specified or not found, use null (don't guess)
6. For workers comp, if it says "statutory" or "statutory limits", use the string "Statutory"
7. Pay attention to whether umbrella/excess liability is required vs optional
8. Look for any special endorsements required (additional insured, waiver of subrogation, etc.)
9. The certificate holder is usually the landlord/property owner/management company

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

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Lease extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to extract data from lease'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
