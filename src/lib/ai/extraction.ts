import type { CoverageType, LimitType } from '@/types';

// ============================================================================
// Types for the AI extraction response
// ============================================================================

interface AILimit {
  amount: number;
  type: LimitType;
}

interface AICoverage {
  coverage_type: CoverageType;
  carrier_name: string;
  policy_number: string;
  limits: AILimit[];
  effective_date: string;
  expiration_date: string;
  additional_insured: boolean;
  waiver_of_subrogation: boolean;
  confidence: 'high' | 'low';
  raw_text: string;
}

interface AIEntity {
  name: string;
  address: string;
  confidence: 'high' | 'low';
}

interface AIExtractionResponse {
  coverages: AICoverage[];
  certificate_holder: AIEntity;
  additional_insured_entities: AIEntity[];
}

// ============================================================================
// Mapped output types matching database schema
// ============================================================================

export interface ExtractedCoverageRow {
  coverage_type: CoverageType;
  carrier_name: string | null;
  policy_number: string | null;
  limit_amount: number | null;
  limit_type: LimitType | null;
  effective_date: string | null;
  expiration_date: string | null;
  additional_insured_listed: boolean;
  additional_insured_entities: string[];
  waiver_of_subrogation: boolean;
  confidence_flag: boolean;
  raw_extracted_text: string | null;
}

export interface ExtractedEntityRow {
  entity_name: string;
  entity_address: string | null;
  entity_type: 'certificate_holder' | 'additional_insured';
  confidence_flag: boolean;
}

export interface ExtractionResult {
  success: boolean;
  coverages: ExtractedCoverageRow[];
  entities: ExtractedEntityRow[];
  error?: string;
}

// ============================================================================
// System prompt
// ============================================================================

const SYSTEM_PROMPT = `You are an expert insurance document analyzer. Extract all coverage and entity information from this Certificate of Insurance (COI) document.

Return a JSON object with exactly this structure:
{
  "coverages": [
    {
      "coverage_type": "general_liability" | "automobile_liability" | "workers_compensation" | "employers_liability" | "umbrella_excess_liability" | "professional_liability_eo" | "property_inland_marine" | "pollution_liability" | "liquor_liability" | "cyber_liability",
      "carrier_name": "string",
      "policy_number": "string",
      "limits": [
        {
          "amount": number,
          "type": "per_occurrence" | "aggregate" | "combined_single_limit" | "statutory" | "per_person" | "per_accident"
        }
      ],
      "effective_date": "YYYY-MM-DD",
      "expiration_date": "YYYY-MM-DD",
      "additional_insured": true | false,
      "waiver_of_subrogation": true | false,
      "confidence": "high" | "low",
      "raw_text": "the original text from the document for this coverage section"
    }
  ],
  "certificate_holder": {
    "name": "string",
    "address": "string",
    "confidence": "high" | "low"
  },
  "additional_insured_entities": [
    {
      "name": "string",
      "address": "string or empty",
      "confidence": "high" | "low"
    }
  ]
}

Important instructions:
- Extract ALL coverage sections found on the certificate
- For General Liability, extract BOTH per occurrence and aggregate limits as separate limit entries
- For Workers Compensation, use "statutory" as the limit type with amount 0
- If a field is unclear or illegible, still include it but set confidence to "low"
- Look at ALL pages of the document for endorsements, additional insured schedules, and supplementary information
- Extract exact entity names and addresses for certificate holder and all additional insured parties
- Return ONLY the JSON object, no other text`;

// ============================================================================
// Main extraction function
// ============================================================================

/**
 * Send a PDF (as base64) to the Anthropic Claude API and extract
 * structured COI data. Returns rows ready for database insertion.
 */
export async function extractCOIFromPDF(pdfBase64: string): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, coverages: [], entities: [], error: 'ANTHROPIC_API_KEY is not configured' };
  }

  // Call Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: 'Extract all insurance data from this Certificate of Insurance.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', response.status, errorText);
    return {
      success: false,
      coverages: [],
      entities: [],
      error: `AI extraction failed (status ${response.status})`,
    };
  }

  const messageResponse = await response.json();
  const responseText =
    messageResponse.content?.[0]?.type === 'text' ? messageResponse.content[0].text : '';

  // Parse JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      success: false,
      coverages: [],
      entities: [],
      error: 'Could not parse structured data from AI response',
    };
  }

  let parsed: AIExtractionResponse;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      success: false,
      coverages: [],
      entities: [],
      error: 'AI returned malformed JSON',
    };
  }

  return mapToDbRows(parsed);
}

// ============================================================================
// Map AI response → database rows
// ============================================================================

function mapToDbRows(parsed: AIExtractionResponse): ExtractionResult {
  const coverages: ExtractedCoverageRow[] = [];
  const entities: ExtractedEntityRow[] = [];

  // Collect additional insured entity names for each coverage
  const allAINames = (parsed.additional_insured_entities ?? []).map((e) => e.name);

  for (const cov of parsed.coverages ?? []) {
    const limits = cov.limits ?? [];
    if (limits.length === 0) {
      // Coverage with no limits — still record it
      coverages.push({
        coverage_type: cov.coverage_type,
        carrier_name: cov.carrier_name || null,
        policy_number: cov.policy_number || null,
        limit_amount: null,
        limit_type: null,
        effective_date: cov.effective_date || null,
        expiration_date: cov.expiration_date || null,
        additional_insured_listed: cov.additional_insured ?? false,
        additional_insured_entities: cov.additional_insured ? allAINames : [],
        waiver_of_subrogation: cov.waiver_of_subrogation ?? false,
        confidence_flag: cov.confidence !== 'low',
        raw_extracted_text: cov.raw_text || null,
      });
    } else {
      // One row per limit (e.g., GL per-occurrence + GL aggregate)
      for (const limit of limits) {
        coverages.push({
          coverage_type: cov.coverage_type,
          carrier_name: cov.carrier_name || null,
          policy_number: cov.policy_number || null,
          limit_amount: limit.amount ?? null,
          limit_type: limit.type ?? null,
          effective_date: cov.effective_date || null,
          expiration_date: cov.expiration_date || null,
          additional_insured_listed: cov.additional_insured ?? false,
          additional_insured_entities: cov.additional_insured ? allAINames : [],
          waiver_of_subrogation: cov.waiver_of_subrogation ?? false,
          confidence_flag: cov.confidence !== 'low',
          raw_extracted_text: cov.raw_text || null,
        });
      }
    }
  }

  // Certificate holder
  if (parsed.certificate_holder?.name) {
    entities.push({
      entity_name: parsed.certificate_holder.name,
      entity_address: parsed.certificate_holder.address || null,
      entity_type: 'certificate_holder',
      confidence_flag: parsed.certificate_holder.confidence !== 'low',
    });
  }

  // Additional insured entities
  for (const ent of parsed.additional_insured_entities ?? []) {
    if (ent.name) {
      entities.push({
        entity_name: ent.name,
        entity_address: ent.address || null,
        entity_type: 'additional_insured',
        confidence_flag: ent.confidence !== 'low',
      });
    }
  }

  return { success: true, coverages, entities };
}
