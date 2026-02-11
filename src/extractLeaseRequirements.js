// src/extractLeaseRequirements.js
// Client-side wrapper for AI lease requirement extraction

import { supabase } from './supabaseClient';
import logger from './logger';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function withRetry(fn, retries = MAX_RETRIES, delay = INITIAL_DELAY_MS) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error.message?.includes('not configured') ||
          error.message?.includes('Invalid') ||
          error.message?.includes('Unauthorized')) {
        throw error;
      }

      if (attempt < retries) {
        const waitTime = delay * Math.pow(2, attempt);
        logger.info(`Lease extraction attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Convert File to base64 string
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Extract insurance requirements from a lease PDF using AI
 * Returns structured data with confidence scores per field
 */
export async function extractLeaseRequirements(file) {
  try {
    logger.info('Converting lease PDF to base64...');
    const base64Data = await fileToBase64(file);

    logger.info('Calling lease requirement extraction service...');

    const { data, error } = await withRetry(async () => {
      const result = await supabase.functions.invoke('extract-lease-requirements', {
        body: { pdfBase64: base64Data }
      });

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

    logger.info('Lease requirements extracted successfully');
    return { success: true, data: data.data };

  } catch (error) {
    logger.error('Lease requirement extraction error', error);
    return {
      success: false,
      error: error.message || 'Failed to extract requirements from lease',
      data: null
    };
  }
}

/**
 * Convert AI extraction data into a tenant requirement profile for database storage
 * All fields tagged with source 'lease_extracted'
 */
export function extractionToProfile(extractionData) {
  const profile = {
    creation_method: 'lease_extracted',
    raw_extraction_data: extractionData,
  };

  const reqs = extractionData.requirements || {};

  // Helper to map an extraction field
  const mapField = (fieldName, extractionField) => {
    if (!extractionField || extractionField.value == null) return;
    profile[fieldName] = extractionField.value;
    profile[`${fieldName}_source`] = 'lease_extracted';
    profile[`${fieldName}_confidence`] = extractionField.confidence || 0;
    profile[`${fieldName}_lease_ref`] = extractionField.leaseRef || null;
  };

  // Coverage limits
  mapField('gl_occurrence_limit', reqs.glOccurrenceLimit);
  mapField('gl_aggregate_limit', reqs.glAggregateLimit);
  mapField('property_contents_limit', reqs.propertyContentsLimit);
  mapField('umbrella_limit', reqs.umbrellaLimit);
  mapField('workers_comp_statutory', reqs.workersCompStatutory);
  mapField('workers_comp_employers_liability_limit', reqs.workersCompEmployersLiabilityLimit);
  mapField('commercial_auto_csl', reqs.commercialAutoCsl);
  mapField('professional_liability_limit', reqs.professionalLiabilityLimit);
  mapField('business_interruption_required', reqs.businessInterruptionRequired);

  if (reqs.businessInterruptionDuration?.value) {
    profile.business_interruption_duration = reqs.businessInterruptionDuration.value;
  }

  // Additional Insured
  if (reqs.additionalInsuredEntities?.value) {
    profile.additional_insured_entities = reqs.additionalInsuredEntities.value;
    profile.additional_insured_source = 'lease_extracted';
    profile.additional_insured_confidence = reqs.additionalInsuredEntities.confidence || 0;
    profile.additional_insured_lease_ref = reqs.additionalInsuredEntities.leaseRef || null;
  }
  if (reqs.additionalInsuredLanguage?.value) {
    profile.additional_insured_language = reqs.additionalInsuredLanguage.value;
  }

  // Loss Payee
  if (reqs.lossPayeeEntities?.value) {
    profile.loss_payee_entities = reqs.lossPayeeEntities.value;
    profile.loss_payee_source = 'lease_extracted';
    profile.loss_payee_confidence = reqs.lossPayeeEntities.confidence || 0;
    profile.loss_payee_lease_ref = reqs.lossPayeeEntities.leaseRef || null;
  }

  // Waiver of Subrogation
  mapField('waiver_of_subrogation_required', reqs.waiverOfSubrogationRequired);
  if (reqs.waiverOfSubrogationCoverages?.value) {
    profile.waiver_of_subrogation_coverages = reqs.waiverOfSubrogationCoverages.value;
  }

  // Certificate Holder
  mapField('certificate_holder_name', reqs.certificateHolderName);
  if (reqs.certificateHolderAddress?.value) {
    profile.certificate_holder_address = reqs.certificateHolderAddress.value;
    profile.certificate_holder_source = 'lease_extracted';
    profile.certificate_holder_confidence = reqs.certificateHolderName?.confidence || reqs.certificateHolderAddress?.confidence || 0;
  }

  // Cancellation notice
  mapField('cancellation_notice_days', reqs.cancellationNoticeDays);

  // Special endorsements
  if (reqs.specialEndorsements?.value) {
    profile.special_endorsements = reqs.specialEndorsements.value;
  }

  // Custom coverages
  if (reqs.customCoverages && reqs.customCoverages.length > 0) {
    profile.custom_coverages = reqs.customCoverages.map(cc => ({
      name: cc.name,
      limit: cc.limit,
      source: 'lease_extracted',
      confidence: cc.confidence || 0,
      leaseRef: cc.leaseRef || null,
    }));
  }

  // Lease dates
  if (extractionData.leaseStartDate?.value) {
    profile.lease_start_date = extractionData.leaseStartDate.value;
  }
  if (extractionData.leaseEndDate?.value) {
    profile.lease_end_date = extractionData.leaseEndDate.value;
  }
  if (extractionData.leaseRenewalDate?.value) {
    profile.lease_renewal_date = extractionData.leaseRenewalDate.value;
  }

  return profile;
}

/**
 * Convert building defaults into a tenant requirement profile
 * All fields tagged with source 'building_default'
 */
export function buildingDefaultsToProfile(defaults) {
  const profile = {
    creation_method: 'building_default',
    property_id: defaults.property_id,
  };

  const fieldMap = [
    'gl_occurrence_limit',
    'gl_aggregate_limit',
    'property_contents_limit',
    'umbrella_limit',
    'workers_comp_statutory',
    'workers_comp_employers_liability_limit',
    'commercial_auto_csl',
    'professional_liability_limit',
    'business_interruption_required',
    'business_interruption_duration',
    'cancellation_notice_days',
    'waiver_of_subrogation_required',
  ];

  fieldMap.forEach(field => {
    if (defaults[field] != null) {
      profile[field] = defaults[field];
      // Add source for fields that have source tracking
      const sourceField = `${field}_source`;
      if (sourceField.endsWith('_source')) {
        profile[sourceField] = 'building_default';
      }
    }
  });

  // Copy array/object fields
  if (defaults.additional_insured_entities?.length) {
    profile.additional_insured_entities = defaults.additional_insured_entities;
    profile.additional_insured_source = 'building_default';
  }
  if (defaults.additional_insured_language) {
    profile.additional_insured_language = defaults.additional_insured_language;
  }
  if (defaults.loss_payee_entities?.length) {
    profile.loss_payee_entities = defaults.loss_payee_entities;
    profile.loss_payee_source = 'building_default';
  }
  if (defaults.waiver_of_subrogation_coverages?.length) {
    profile.waiver_of_subrogation_coverages = defaults.waiver_of_subrogation_coverages;
    profile.waiver_of_subrogation_source = 'building_default';
  }
  if (defaults.certificate_holder_name) {
    profile.certificate_holder_name = defaults.certificate_holder_name;
    profile.certificate_holder_source = 'building_default';
  }
  if (defaults.certificate_holder_address) {
    profile.certificate_holder_address = defaults.certificate_holder_address;
  }
  if (defaults.special_endorsements?.length) {
    profile.special_endorsements = defaults.special_endorsements;
  }
  if (defaults.custom_coverages?.length) {
    profile.custom_coverages = defaults.custom_coverages.map(cc => ({
      ...cc,
      source: 'building_default',
    }));
  }

  return profile;
}
