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
            text: `You are an insurance requirements extraction engine for commercial property leases.

TASK: Extract all insurance requirements from this lease document and return them as structured JSON matching the schema below. Only populate fields that are explicitly stated or clearly implied in the lease. Leave everything else as null.

This document may be a full commercial lease, an insurance exhibit/addendum, or a standalone insurance requirements document. Search the ENTIRE document — requirements can appear in the main body, exhibits, addendums, riders, schedules, or across multiple sections. Common section titles: "Insurance", "Tenant's Insurance", "Insurance Requirements", "Indemnity and Insurance".

RULES:
- Dollar amounts should be numbers (no formatting): 1000000 not "$1,000,000"
- If the lease says "replacement cost" without a dollar figure, set property_insurance_type to "replacement_cost" and property_insurance_amount to null
- If the lease says "annual rent" for business interruption, set business_interruption_minimum to "annual_rent" — do not try to calculate a dollar amount
- For additional_insured_entities, extract every named entity — landlord, property manager, lenders, and any "other parties reasonably designated by Landlord" (include that phrase if present)
- If multiple coverage amounts are listed for the same type (e.g. per occurrence AND aggregate for GL), capture both in the appropriate fields
- Do NOT invent requirements that aren't in the lease
- Do NOT populate specialty coverages (liquor, pollution, professional, cyber, product) unless the lease explicitly requires them
- For each field with a value, include a confidence score (0-100) and a lease_ref (e.g. "Section 12.3", "Exhibit B")
- Dates MUST be in YYYY-MM-DD format

Return ONLY valid JSON. No markdown, no explanation, no preamble.

SCHEMA:
{
  "document_type": "lease" | "insurance_exhibit" | "requirements_doc" | "unknown",
  "document_type_confidence": <0-100>,

  "tenant_name": { "value": <string or null>, "confidence": <0-100>, "lease_ref": <string> },
  "property_address": { "value": <string or null>, "confidence": <0-100>, "lease_ref": <string> },
  "premises_description": { "value": <string or null>, "confidence": <0-100>, "lease_ref": <string> },
  "lease_start_date": { "value": <"YYYY-MM-DD" or null>, "confidence": <0-100>, "lease_ref": <string> },
  "lease_end_date": { "value": <"YYYY-MM-DD" or null>, "confidence": <0-100>, "lease_ref": <string> },

  "general_liability_per_occurrence": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "general_liability_aggregate": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "general_liability_must_be_occurrence_basis": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },

  "auto_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "auto_liability_includes_hired_non_owned": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },

  "workers_comp_required": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },
  "employers_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },

  "umbrella_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },

  "property_insurance_required": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },
  "property_insurance_type": { "value": <"replacement_cost" | "specific_amount" | null>, "confidence": <0-100>, "lease_ref": <string> },
  "property_insurance_amount": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "property_coverage_includes_tenant_improvements": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },

  "business_interruption_required": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },
  "business_interruption_minimum": { "value": <string or null>, "confidence": <0-100>, "lease_ref": <string> },

  "professional_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "liquor_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "pollution_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "cyber_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "product_liability": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },

  "additional_insured_required": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },
  "additional_insured_entities": { "value": <string[] or null>, "confidence": <0-100>, "lease_ref": <string> },
  "waiver_of_subrogation_required": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },
  "loss_payee_required": { "value": <boolean or null>, "confidence": <0-100>, "lease_ref": <string> },
  "loss_payee_entities": { "value": <string[] or null>, "confidence": <0-100>, "lease_ref": <string> },
  "certificate_holder_name": { "value": <string or null>, "confidence": <0-100>, "lease_ref": <string> },
  "certificate_holder_address": { "value": <string or null>, "confidence": <0-100>, "lease_ref": <string> },

  "insurer_rating_minimum": { "value": <string or null>, "confidence": <0-100>, "lease_ref": <string> },
  "cancellation_notice_days": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },
  "renewal_proof_days_before_expiry": { "value": <integer or null>, "confidence": <0-100>, "lease_ref": <string> },

  "extraction_notes": <string>,
  "references_external_documents": <boolean>,
  "external_document_references": <string[]>
}`
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
