import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

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

    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      throw new Error('No PDF data provided');
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
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
            text: `You are an expert commercial real estate insurance analyst. Extract ALL tenant insurance requirements from this document.

This document may be:
- A full commercial lease agreement
- An insurance exhibit or addendum from a lease
- A standalone insurance requirements document
- Something else entirely

FIRST: Determine what type of document this is. If it does NOT appear to be a lease or insurance-related document, set documentType to "unknown" and return mostly empty results.

Search the ENTIRE document for insurance-related requirements. They may appear in:
- A dedicated "Insurance" section or article
- An exhibit (e.g., "Exhibit B - Insurance Requirements")
- Scattered across multiple clauses
- Referenced in definitions, indemnification, or default sections

For EACH requirement you find, provide:
1. The extracted value
2. A confidence score (0-100):
   - 90-100: Clearly stated, unambiguous dollar amount or requirement
   - 70-89: Stated but some interpretation needed (e.g., range given, or requirement uses general language)
   - 50-69: Implied or indirectly referenced, moderate uncertainty
   - Below 50: Very uncertain, inferred from context, or couldn't locate clearly
3. A lease reference showing where it was found (e.g., "Section 12.3", "Exhibit B, Page 2", "Article VII, Paragraph 4")

Return this JSON structure:
{
  "documentType": "lease" | "insurance_exhibit" | "requirements_doc" | "unknown",
  "documentTypeConfidence": <0-100>,

  "tenantName": { "value": "string or null", "confidence": <0-100>, "leaseRef": "location in document" },
  "propertyAddress": { "value": "string or null", "confidence": <0-100>, "leaseRef": "location" },
  "suiteUnit": { "value": "string or null", "confidence": <0-100>, "leaseRef": "location" },
  "leaseStartDate": { "value": "YYYY-MM-DD or null", "confidence": <0-100>, "leaseRef": "location" },
  "leaseEndDate": { "value": "YYYY-MM-DD or null", "confidence": <0-100>, "leaseRef": "location" },
  "leaseRenewalDate": { "value": "YYYY-MM-DD or null", "confidence": <0-100>, "leaseRef": "location" },

  "requirements": {
    "glOccurrenceLimit": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "glAggregateLimit": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "propertyContentsLimit": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "umbrellaLimit": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "workersCompStatutory": { "value": <true/false/null>, "confidence": <0-100>, "leaseRef": "location" },
    "workersCompEmployersLiabilityLimit": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "commercialAutoCsl": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "professionalLiabilityLimit": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "businessInterruptionRequired": { "value": <true/false/null>, "confidence": <0-100>, "leaseRef": "location" },
    "businessInterruptionDuration": { "value": "string or null", "confidence": <0-100>, "leaseRef": "location" },
    "additionalInsuredEntities": { "value": ["entity name 1", "entity name 2"] or null, "confidence": <0-100>, "leaseRef": "location" },
    "additionalInsuredLanguage": { "value": "exact language required or null", "confidence": <0-100>, "leaseRef": "location" },
    "lossPayeeEntities": { "value": ["entity name"] or null, "confidence": <0-100>, "leaseRef": "location" },
    "waiverOfSubrogationRequired": { "value": <true/false/null>, "confidence": <0-100>, "leaseRef": "location" },
    "waiverOfSubrogationCoverages": { "value": ["coverage type 1"] or null, "confidence": <0-100>, "leaseRef": "location" },
    "certificateHolderName": { "value": "string or null", "confidence": <0-100>, "leaseRef": "location" },
    "certificateHolderAddress": { "value": "string or null", "confidence": <0-100>, "leaseRef": "location" },
    "cancellationNoticeDays": { "value": <integer or null>, "confidence": <0-100>, "leaseRef": "location" },
    "specialEndorsements": { "value": ["endorsement 1"] or null, "confidence": <0-100>, "leaseRef": "location" },
    "customCoverages": [
      {
        "name": "coverage type name",
        "limit": <integer>,
        "confidence": <0-100>,
        "leaseRef": "location"
      }
    ]
  },

  "extractionNotes": "Any important notes about the extraction, edge cases, or ambiguities found",
  "referencesExternalDocuments": <true/false>,
  "externalDocumentReferences": ["Description of referenced external document, e.g., 'Exhibit C referenced but not included'"]
}

CRITICAL RULES:
1. Dollar amounts MUST be plain integers (1000000 not "$1,000,000")
2. Dates MUST be in YYYY-MM-DD format
3. If a requirement is NOT mentioned at all, set value to null and confidence to 0
4. If a requirement section exists but the specific limit is not stated, set the limit to null with a note in extractionNotes, and set confidence based on how certain you are it's missing vs you just couldn't find it
5. For "Additional Insured", look for language like "Landlord shall be named as additional insured" or "add as additional insured on all policies"
6. For "Waiver of Subrogation", look for mutual or one-way waiver clauses
7. If the document references another document for insurance requirements (e.g., "per Exhibit C" but Exhibit C is not included), set referencesExternalDocuments to true and describe what's missing
8. Commercial leases typically require GL minimums of $1M-$2M per occurrence — if you find amounts significantly different, double-check
9. Include ALL coverage types found, even uncommon ones, in the customCoverages array
10. Pay special attention to whether Workers' Comp is explicitly required or exempted

Return ONLY the JSON object, no other text.`
          }
        ]
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('Claude lease extraction response length:', responseText.length);

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
    console.error('Lease requirement extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to extract requirements from lease'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
