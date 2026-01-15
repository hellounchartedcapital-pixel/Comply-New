// src/extractRequirements.js
// AI-powered extraction of insurance requirements from PDFs

import Anthropic from '@anthropic-ai/sdk';

/**
 * Extract insurance requirements from a PDF document
 * @param {File} file - PDF file containing requirements
 * @returns {Promise<Object>} Extracted requirements data
 */
export async function extractRequirementsFromPDF(file) {
  try {
    // Convert PDF to base64
    const base64PDF = await fileToBase64(file);

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });

    // Create message with PDF
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64PDF,
              },
            },
            {
              type: 'text',
              text: `You are an insurance compliance expert. Analyze this document and extract ALL insurance requirements.

This could be:
- A lease agreement with insurance clauses
- A vendor requirements document
- An insurance specifications sheet
- A sample Certificate of Insurance (COI)
- A compliance guidelines document

Extract the following insurance requirements (if mentioned):

1. General Liability Insurance
   - Minimum coverage amount (per occurrence)
   - Aggregate amount (if specified)

2. Automobile Liability Insurance
   - Minimum coverage amount
   - Type (owned, hired, non-owned)

3. Workers' Compensation Insurance
   - Required? (Yes/No/Statutory)
   - Minimum amount (if specified, otherwise "Statutory")

4. Employers Liability Insurance
   - Minimum coverage amount

5. Additional Insurance Types (if mentioned):
   - Professional Liability / E&O
   - Cyber Liability
   - Umbrella / Excess Liability
   - Pollution Liability
   - Liquor Liability
   - Any other specialty insurance

6. Additional Requirements (if mentioned):
   - Additional Insured requirement
   - Waiver of Subrogation
   - Primary and Non-Contributory
   - Notice of Cancellation (30 days, 60 days, etc.)
   - Certificate Holder information

IMPORTANT INSTRUCTIONS:
- Only extract requirements that are EXPLICITLY stated
- If a coverage is not mentioned, mark it as null
- For amounts, extract the number only (e.g., 1000000 for $1,000,000)
- For "Statutory" workers comp, return the string "Statutory"
- Include confidence level: high (90-100%), medium (70-89%), low (below 70%)
- If you're unsure about a value, mark confidence as "medium" or "low"

Return ONLY valid JSON in this exact format:
{
  "requirements": {
    "general_liability": {
      "amount": <number or null>,
      "aggregate": <number or null>,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "auto_liability": {
      "amount": <number or null>,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "workers_comp": {
      "amount": "Statutory" | <number> | null,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "employers_liability": {
      "amount": <number or null>,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "additional_coverages": [
      {
        "type": "Professional Liability" | "Cyber Liability" | "Umbrella" | etc.,
        "amount": <number or null>,
        "required": <boolean>,
        "confidence": "high" | "medium" | "low"
      }
    ],
    "special_requirements": {
      "additional_insured": <boolean or null>,
      "waiver_of_subrogation": <boolean or null>,
      "primary_non_contributory": <boolean or null>,
      "notice_of_cancellation_days": <number or null>
    }
  },
  "source_document_type": "lease" | "vendor_requirements" | "sample_coi" | "guidelines" | "unknown",
  "extraction_notes": "Brief notes about what was found or any uncertainties"
}`
            }
          ]
        }
      ]
    });

    // Parse the response
    const responseText = message.content[0].text;
    console.log('AI Response:', responseText);

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      data: extractedData,
      raw_response: responseText
    };

  } catch (error) {
    console.error('Error extracting requirements:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Convert File to base64 string
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data:application/pdf;base64, prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Normalize requirements data for storage
 * Converts extracted data into format compatible with existing settings structure
 */
export function normalizeRequirements(extractedData) {
  const { requirements } = extractedData;

  return {
    general_liability: requirements.general_liability?.amount || null,
    general_liability_aggregate: requirements.general_liability?.aggregate || null,
    auto_liability: requirements.auto_liability?.amount || null,
    workers_comp: requirements.workers_comp?.amount || 'Statutory',
    employers_liability: requirements.employers_liability?.amount || null,
    additional_requirements: {
      additional_coverages: requirements.additional_coverages || [],
      special_requirements: requirements.special_requirements || {},
      source_document_type: extractedData.source_document_type,
      extraction_notes: extractedData.extraction_notes,
      extracted_at: new Date().toISOString()
    }
  };
}
