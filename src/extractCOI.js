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
 * Extract COI data by calling the secure Edge Function
 * The API key is stored server-side, not exposed in the browser
 * Includes retry logic with exponential backoff
 */
export async function extractCOIFromPDF(file, userRequirements = null) {
  try {
    console.log('Converting PDF to base64...');

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

    console.log('Calling extraction service...');

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

    // Add coverage expiration checks
    const vendorData = data.data;
    const today = new Date();

    const parseLocalDate = (dateString) => {
      if (!dateString) return null;
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const checkCoverageExpiration = (coverage, name) => {
      if (coverage && coverage.expirationDate) {
        const expDate = parseLocalDate(coverage.expirationDate);
        if (expDate) {
          const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const daysUntil = Math.floor((expDate - todayLocal) / (1000 * 60 * 60 * 24));
          console.log(`${name} expires ${coverage.expirationDate}, days until expiration: ${daysUntil}`);
          if (daysUntil < 0) {
            coverage.expired = true;
          } else if (daysUntil <= 30) {
            coverage.expiringSoon = true;
          }
        }
      }
    };

    // Check standard coverages
    if (vendorData.coverage) {
      checkCoverageExpiration(vendorData.coverage.generalLiability, 'General Liability');
      checkCoverageExpiration(vendorData.coverage.autoLiability, 'Auto Liability');
      checkCoverageExpiration(vendorData.coverage.workersComp, 'Workers Comp');
      checkCoverageExpiration(vendorData.coverage.employersLiability, 'Employers Liability');
    }

    // Check additional coverage expirations
    if (vendorData.additionalCoverages) {
      vendorData.additionalCoverages.forEach(cov => {
        checkCoverageExpiration(cov, cov.type || 'Additional Coverage');
      });
    }

    console.log('Extracted vendor data:', vendorData);
    return { success: true, data: vendorData };

  } catch (error) {
    console.error('PDF extraction error:', error);
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
