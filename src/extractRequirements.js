// src/extractRequirements.js
// AI-powered extraction of insurance requirements from PDFs

import { supabase } from './supabaseClient';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, retries = MAX_RETRIES, delay = INITIAL_DELAY_MS) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on non-retriable errors
      if (error.message?.includes('not configured') ||
          error.message?.includes('Invalid') ||
          error.message?.includes('Unauthorized')) {
        throw error;
      }

      if (attempt < retries) {
        const waitTime = delay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Extract insurance requirements from a PDF document
 * Uses secure Edge Function - API key is not exposed in browser
 * Includes retry logic with exponential backoff
 * @param {File} file - PDF file containing requirements
 * @returns {Promise<Object>} Extracted requirements data
 */
export async function extractRequirementsFromPDF(file) {
  try {
    // Convert PDF to base64
    const base64PDF = await fileToBase64(file);

    // Call the Edge Function with retry logic
    const { data, error } = await withRetry(async () => {
      const result = await supabase.functions.invoke('extract-requirements', {
        body: {
          pdfBase64: base64PDF
        }
      });

      // Throw on error to trigger retry
      if (result.error) {
        throw new Error(result.error.message || 'Failed to call extraction service');
      }

      return result;
    });

    if (error) {
      throw new Error(error.message || 'Failed to call extraction service');
    }

    if (!data.success) {
      throw new Error(data.error || 'Extraction failed');
    }

    return {
      success: true,
      data: data.data,
      raw_response: data.raw_response
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
