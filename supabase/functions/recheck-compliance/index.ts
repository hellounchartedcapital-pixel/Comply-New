import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface Requirements {
  general_liability: number;
  auto_liability: number;
  auto_liability_required?: boolean;
  workers_comp_required?: boolean;
  employers_liability: number;
  company_name?: string;
  require_additional_insured?: boolean;
  require_waiver_of_subrogation?: boolean;
  custom_coverages?: Array<{
    type: string;
    amount: number;
    required: boolean;
  }>;
}

/**
 * Normalize a company name for flexible matching
 * Removes punctuation and extra whitespace, converts to lowercase
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const { requirements, propertyId } = await req.json();

    if (!requirements) {
      throw new Error('No requirements provided');
    }

    // Build query to fetch vendors
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('user_id', user.id)
      .not('raw_data', 'is', null);

    // If propertyId is provided, only recheck vendors for that property
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: vendors, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch vendors: ${fetchError.message}`);
    }

    if (!vendors || vendors.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updatedCount: 0, message: 'No vendors to recheck' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Recheck compliance for each vendor
    const updates = [];
    for (const vendor of vendors) {
      const rawData = vendor.raw_data;
      if (!rawData) continue;

      // Rebuild vendor data with new requirements
      const recheckedData = buildVendorData(rawData, requirements);

      // Prepare update
      updates.push({
        id: vendor.id,
        status: recheckedData.status,
        issues: recheckedData.issues,
        coverage: recheckedData.coverage,
        requirements: requirements,
        has_additional_insured: recheckedData.hasAdditionalInsured || false,
        missing_additional_insured: recheckedData.missingAdditionalInsured || false,
        has_waiver_of_subrogation: recheckedData.hasWaiverOfSubrogation || false,
        missing_waiver_of_subrogation: recheckedData.missingWaiverOfSubrogation || false,
        days_overdue: recheckedData.daysOverdue || 0
      });
    }

    // Update all vendors in batch
    let updatedCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          status: update.status,
          issues: update.issues,
          coverage: update.coverage,
          requirements: update.requirements,
          has_additional_insured: update.has_additional_insured,
          missing_additional_insured: update.missing_additional_insured,
          has_waiver_of_subrogation: update.has_waiver_of_subrogation,
          missing_waiver_of_subrogation: update.missing_waiver_of_subrogation,
          days_overdue: update.days_overdue
        })
        .eq('id', update.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount,
        totalVendors: vendors.length,
        message: `Rechecked compliance for ${updatedCount} vendors`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Recheck compliance error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to recheck compliance'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

function buildVendorData(extractedData: any, requirements: Requirements) {
  const vendorData: any = {
    name: extractedData.companyName || 'Unknown Company',
    dba: extractedData.dba,
    expirationDate: extractedData.expirationDate || new Date().toISOString().split('T')[0],
    coverage: {
      generalLiability: {
        amount: extractedData.generalLiability?.amount || 0,
        expirationDate: extractedData.generalLiability?.expirationDate,
        compliant: (extractedData.generalLiability?.amount || 0) >= requirements.general_liability
      },
      autoLiability: {
        amount: extractedData.autoLiability?.amount || 0,
        expirationDate: extractedData.autoLiability?.expirationDate,
        // Only check auto if required
        compliant: !requirements.auto_liability_required || (extractedData.autoLiability?.amount || 0) >= requirements.auto_liability
      },
      workersComp: {
        amount: extractedData.workersComp?.amount || 'Statutory',
        expirationDate: extractedData.workersComp?.expirationDate,
        // Only check workers comp if required
        compliant: !requirements.workers_comp_required || (extractedData.workersComp?.amount === 'Statutory' || extractedData.workersComp?.amount > 0)
      },
      employersLiability: {
        amount: extractedData.employersLiability?.amount || 0,
        expirationDate: extractedData.employersLiability?.expirationDate,
        compliant: !requirements.workers_comp_required || (extractedData.employersLiability?.amount || 0) >= requirements.employers_liability
      }
    },
    additionalCoverages: extractedData.additionalCoverages || [],
    rawData: extractedData,
    requirements: requirements,
    additionalInsured: extractedData.additionalInsured || '',
    certificateHolder: extractedData.certificateHolder || '',
    waiverOfSubrogation: extractedData.waiverOfSubrogation || ''
  };

  // Calculate status and issues
  const issues: any[] = [];
  const today = new Date();
  const expirationDate = new Date(vendorData.expirationDate);
  const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Check expiration
  if (daysUntilExpiration < 0) {
    vendorData.status = 'expired';
    vendorData.daysOverdue = Math.abs(daysUntilExpiration);
    issues.push({
      type: 'critical',
      message: `All policies expired ${vendorData.expirationDate} (${vendorData.daysOverdue} days overdue)`
    });
  } else if (daysUntilExpiration <= 30) {
    vendorData.status = 'expiring';
    vendorData.daysOverdue = 0;
    issues.push({
      type: 'warning',
      message: `Policies expiring in ${daysUntilExpiration} days`
    });
  } else {
    vendorData.status = 'compliant';
    vendorData.daysOverdue = 0;
  }

  // Check coverage compliance
  if (!vendorData.coverage.generalLiability.compliant) {
    vendorData.status = 'non-compliant';
    issues.push({
      type: 'error',
      message: `General Liability below requirement: $${(vendorData.coverage.generalLiability.amount / 1000000).toFixed(1)}M (requires $${(requirements.general_liability / 1000000).toFixed(1)}M)`
    });
  }

  if (requirements.auto_liability_required && !vendorData.coverage.autoLiability.compliant) {
    vendorData.status = 'non-compliant';
    issues.push({
      type: 'error',
      message: `Auto Liability below requirement: $${(vendorData.coverage.autoLiability.amount / 1000000).toFixed(1)}M (requires $${(requirements.auto_liability / 1000000).toFixed(1)}M)`
    });
  }

  if (requirements.workers_comp_required && !vendorData.coverage.employersLiability.compliant) {
    vendorData.status = 'non-compliant';
    issues.push({
      type: 'error',
      message: `Employers Liability below requirement: $${(vendorData.coverage.employersLiability.amount / 1000).toFixed(1)}K (requires $${(requirements.employers_liability / 1000).toFixed(1)}K)`
    });
  }

  // Check waiver of subrogation requirement
  if (requirements.require_waiver_of_subrogation) {
    const waiverText = (vendorData.waiverOfSubrogation || '').toLowerCase();
    if (waiverText.includes('yes') || waiverText.includes('included') || waiverText.includes('waived')) {
      vendorData.hasWaiverOfSubrogation = true;
    } else {
      vendorData.status = 'non-compliant';
      vendorData.missingWaiverOfSubrogation = true;
      issues.push({
        type: 'error',
        message: 'Waiver of Subrogation not included'
      });
    }
  }

  // Check additional insured requirement
  if (requirements.company_name && requirements.require_additional_insured) {
    const additionalInsuredText = vendorData.additionalInsured || '';
    const normalizedAdditionalInsured = normalizeCompanyName(additionalInsuredText);
    const normalizedCompanyName = normalizeCompanyName(requirements.company_name);

    // Check if the normalized company name is found in the normalized additional insured text
    if (!normalizedAdditionalInsured.includes(normalizedCompanyName)) {
      vendorData.status = 'non-compliant';
      vendorData.missingAdditionalInsured = true;
      issues.push({
        type: 'error',
        message: `${requirements.company_name} not listed as Additional Insured`
      });
    } else {
      vendorData.hasAdditionalInsured = true;
    }
  }

  // Check custom coverage requirements
  if (requirements.custom_coverages && requirements.custom_coverages.length > 0) {
    requirements.custom_coverages.forEach(requiredCoverage => {
      if (!requiredCoverage.required) return;

      const foundCoverage = vendorData.additionalCoverages.find(
        (cov: any) => cov.type && cov.type.toLowerCase().includes(requiredCoverage.type.toLowerCase())
      );

      if (!foundCoverage) {
        vendorData.status = 'non-compliant';
        issues.push({
          type: 'error',
          message: `Missing required coverage: ${requiredCoverage.type}`
        });
      } else if (foundCoverage.amount < requiredCoverage.amount) {
        vendorData.status = 'non-compliant';
        issues.push({
          type: 'error',
          message: `${requiredCoverage.type} below requirement: $${(foundCoverage.amount / 1000000).toFixed(1)}M (requires $${(requiredCoverage.amount / 1000000).toFixed(1)}M)`
        });
      }
    });
  }

  vendorData.issues = issues;
  return vendorData;
}
