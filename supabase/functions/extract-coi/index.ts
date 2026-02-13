import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are extracting insurance data from a Certificate of Insurance (COI) PDF, typically an ACORD 25 or ACORD 28 form.

Extract and return JSON with these fields:
{
  "insured_name": string,
  "general_liability_per_occurrence": number or null,
  "general_liability_aggregate": number or null,
  "auto_liability": number or null,
  "workers_comp_found": boolean,
  "employers_liability": number or null,
  "umbrella_per_occurrence": number or null,
  "umbrella_aggregate": number or null,
  "property_insurance": number or null,
  "policies": [
    {
      "coverage_type": string,
      "policy_number": string,
      "carrier": string,
      "effective_date": "YYYY-MM-DD",
      "expiration_date": "YYYY-MM-DD"
    }
  ],
  "additional_insured_names": [string],
  "certificate_holder_name": string or null,
  "certificate_holder_address": string or null,
  "description_of_operations": string or null
}

Rules:
- Dollar amounts as numbers: 1000000 not "$1,000,000"
- Dates as YYYY-MM-DD
- If a field is not found on the certificate, set it to null
- For additional_insured_names, extract all entity names from the Additional Insured section or Description of Operations
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

    console.log(`Processing COI extraction for file: ${file_name}`);

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
                text: 'Extract all insurance data from this COI.',
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
      console.log('Successfully extracted COI data for:', extractedData.insured_name);

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
    console.error('COI extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to extract data from COI PDF',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
