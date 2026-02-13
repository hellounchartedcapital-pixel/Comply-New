import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are extracting insurance requirements from a commercial lease document.

Find the insurance requirements section and extract coverage types, minimum limits, and endorsement requirements. Return JSON:

{
  "tenant_name": string or null,
  "premises_description": string or null,
  "lease_start_date": "YYYY-MM-DD" or null,
  "lease_end_date": "YYYY-MM-DD" or null,
  "general_liability_per_occurrence": number or null,
  "general_liability_aggregate": number or null,
  "auto_liability": number or null,
  "workers_comp_required": boolean,
  "employers_liability": number or null,
  "umbrella_liability": number or null,
  "property_insurance_required": boolean,
  "business_interruption_required": boolean,
  "business_interruption_minimum": "annual_rent" or number or null,
  "liquor_liability": number or null,
  "additional_insured_entities": [string],
  "waiver_of_subrogation_required": boolean,
  "loss_payee_required": boolean,
  "insurer_rating_minimum": string or null,
  "cancellation_notice_days": number or null
}

Rules:
- Dollar amounts as numbers: 1000000 not "$1,000,000"
- Only populate fields the lease explicitly requires
- If lease says "replacement cost" for property, set property_insurance_required to true
- If lease says "annual rent" for business interruption, set business_interruption_minimum to "annual_rent"
- Look in all sections: main body, exhibits, addendums, riders, schedules
- Common section titles: "Insurance", "Tenant's Insurance", "Tenant Insurance Requirements"
- Do NOT invent requirements not in the lease
- Return ONLY valid JSON`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { file_base64, file_name } = await req.json();

    if (!file_base64) {
      throw new Error('No file_base64 provided');
    }

    if (!file_name) {
      throw new Error('No file_name provided');
    }

    console.log(`Processing lease extraction for file: ${file_name}`);

    // Send to Claude API with the PDF as a document
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: file_base64,
                },
              },
              {
                type: 'text',
                text: 'Extract all insurance requirements from this lease document.',
              },
            ],
          }],
          system: SYSTEM_PROMPT,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Claude API error:', response.status, errorBody);
        throw new Error(`Claude API returned status ${response.status}: ${errorBody}`);
      }

      const messageResponse = await response.json();

      // Extract text content from Claude's response
      const responseText = messageResponse.content?.[0]?.type === 'text'
        ? messageResponse.content[0].text
        : '';

      console.log('Claude response received, parsing JSON...');

      // Parse JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from AI response');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      console.log('Successfully extracted lease data for:', extractedData.tenant_name);

      return new Response(
        JSON.stringify({ success: true, data: extractedData }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Claude API request timed out after 60 seconds');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Lease extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to extract data from lease PDF',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
