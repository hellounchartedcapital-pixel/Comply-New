import { supabase } from './supabaseClient';
import logger from './logger';
import { checkCoverageExpiration } from './utils/complianceUtils';

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
        logger.info(`Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Extract COI data by calling the secure Edge Function
 * The API key is stored server-side, not exposed in the browser
 * Includes retry logic with exponential backoff
 */
export async function extractCOIFromPDF(file, userRequirements = null) {
  try {
    logger.info('Converting PDF to base64...');

    // Set default requirements if not provided
    const requirements = userRequirements || {
      general_liability: 1000000,
      auto_liability: 1000000,
      workers_comp: 'Statutory',
      employers_liability: 500000,
      custom_coverages: []
    };

    // Convert file to base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    logger.info('Calling extraction service...');

    // Call the Edge Function with retry logic
    const { data, error } = await withRetry(async () => {
      const result = await supabase.functions.invoke('extract-coi', {
        body: {
          pdfBase64: base64Data,
          requirements: requirements
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

    // Add coverage expiration checks using shared utility
    const vendorData = data.data;

    const updateCoverageFlags = (coverage, name) => {
      if (coverage && coverage.expirationDate) {
        const result = checkCoverageExpiration(coverage);
        coverage.expired = result.expired;
        coverage.expiringSoon = result.expiringSoon;
        if (result.daysUntil !== null) {
          logger.debug(`${name} expires ${coverage.expirationDate}, days until expiration: ${result.daysUntil}`);
        }
      }
    };

    // Check standard coverages
    if (vendorData.coverage) {
      updateCoverageFlags(vendorData.coverage.generalLiability, 'General Liability');
      updateCoverageFlags(vendorData.coverage.autoLiability, 'Auto Liability');
      updateCoverageFlags(vendorData.coverage.workersComp, 'Workers Comp');
      updateCoverageFlags(vendorData.coverage.employersLiability, 'Employers Liability');
    }

    // Check additional coverage expirations
    if (vendorData.additionalCoverages) {
      vendorData.additionalCoverages.forEach(cov => {
        updateCoverageFlags(cov, cov.type || 'Additional Coverage');
      });
    }

    logger.info('Extracted vendor data:', vendorData);
    return { success: true, data: vendorData };

  } catch (error) {
    logger.error('PDF extraction error', error);
    return {
      success: false,
      error: error.message || 'Failed to extract data from PDF'
    };
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use extractCOIFromPDF instead
 */
export async function extractCOIData(pdfFile) {
  return extractCOIFromPDF(pdfFile);
}
