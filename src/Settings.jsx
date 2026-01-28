import React, { useState, useEffect } from 'react';
import { Save, X, CheckCircle, AlertCircle, Sparkles, Info, Mail, Bell, Clock } from 'lucide-react';
import { supabase } from './supabaseClient';

export function Settings({ onClose }) {
  const [settings, setSettings] = useState({
    // GL Requirements (stored as general_liability in DB)
    glEachOccurrence: 1000000,
    glAggregate: 2000000,

    // Workers Comp
    workersCompRequired: true,

    // Auto Liability (stored as auto_liability in DB)
    autoLiabilityRequired: false,
    autoLiabilityMinimum: 1000000,

    // Certificate Holder / Additional Insured
    companyName: '',
    requireAdditionalInsured: true,

    // Waiver of Subrogation
    requireWaiverOfSubrogation: false,

    // Auto Follow-Up Settings
    autoFollowUpEnabled: false,
    followUpDays: [30, 14, 7], // Days before expiration to send reminders
    followUpOnExpired: true, // Send follow-up when expired
    followUpOnNonCompliant: true, // Send follow-up when non-compliant
    followUpFrequencyDays: 7 // Minimum days between follow-ups to same vendor
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [recheckingCompliance, setRecheckingCompliance] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Map existing DB columns to our settings structure
        // GL occurrence is stored in general_liability, aggregate is 2x that
        const glOccurrence = data.general_liability || 1000000;
        setSettings({
          glEachOccurrence: glOccurrence,
          glAggregate: glOccurrence * 2, // Aggregate is typically 2x occurrence
          workersCompRequired: data.workers_comp !== 'Not Required',
          autoLiabilityRequired: (data.auto_liability || 0) > 0,
          autoLiabilityMinimum: data.auto_liability || 1000000,
          companyName: data.company_name || '',
          requireAdditionalInsured: data.require_additional_insured !== false,
          requireWaiverOfSubrogation: data.require_waiver_of_subrogation || false,
          // Auto Follow-Up Settings
          autoFollowUpEnabled: data.auto_follow_up_enabled || false,
          followUpDays: data.follow_up_days || [30, 14, 7],
          followUpOnExpired: data.follow_up_on_expired !== false,
          followUpOnNonCompliant: data.follow_up_on_non_compliant !== false,
          followUpFrequencyDays: data.follow_up_frequency_days || 7
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use only existing database columns
      const settingsData = {
        user_id: user.id,
        general_liability: settings.glEachOccurrence,
        auto_liability: settings.autoLiabilityRequired ? settings.autoLiabilityMinimum : 0,
        workers_comp: settings.workersCompRequired ? 'Statutory' : 'Not Required',
        employers_liability: 500000,
        company_name: settings.companyName,
        require_additional_insured: settings.requireAdditionalInsured,
        require_waiver_of_subrogation: settings.requireWaiverOfSubrogation,
        // Auto Follow-Up Settings
        auto_follow_up_enabled: settings.autoFollowUpEnabled,
        follow_up_days: settings.followUpDays,
        follow_up_on_expired: settings.followUpOnExpired,
        follow_up_on_non_compliant: settings.followUpOnNonCompliant,
        follow_up_frequency_days: settings.followUpFrequencyDays
      };

      const { error } = await supabase
        .from('settings')
        .upsert(settingsData, { onConflict: 'user_id' });

      if (error) throw error;

      setSaving(false);
      setSaveSuccess(true);

      // Build requirements object for compliance rechecking
      const requirements = {
        general_liability: settings.glEachOccurrence,
        gl_aggregate: settings.glAggregate,
        auto_liability: settings.autoLiabilityRequired ? settings.autoLiabilityMinimum : 0,
        auto_liability_required: settings.autoLiabilityRequired,
        workers_comp: settings.workersCompRequired ? 'Statutory' : 'Not Required',
        workers_comp_required: settings.workersCompRequired,
        employers_liability: 500000,
        company_name: settings.companyName,
        require_additional_insured: settings.requireAdditionalInsured,
        require_waiver_of_subrogation: settings.requireWaiverOfSubrogation
      };

      // Recheck compliance for all vendors with new requirements
      await recheckAllVendors(requirements);

    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings: ' + err.message);
      setSaving(false);
    }
  };

  const recheckAllVendors = async (requirements) => {
    try {
      setRecheckingCompliance(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Rechecking compliance with requirements:', requirements);

      // Fetch all vendors with raw_data
      const { data: vendors, error: fetchError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .not('raw_data', 'is', null);

      if (fetchError) throw fetchError;

      console.log(`Found ${vendors?.length || 0} vendors to recheck`);

      if (!vendors || vendors.length === 0) {
        console.log('No vendors to recheck');
        window.location.reload();
        return;
      }

      // Recheck each vendor
      let updatedCount = 0;
      for (const vendor of vendors) {
        const rawData = vendor.raw_data;
        if (!rawData) continue;

        const recheckedData = buildVendorData(rawData, requirements);

        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            status: recheckedData.status,
            issues: recheckedData.issues,
            coverage: recheckedData.coverage,
            requirements: requirements,
            has_additional_insured: recheckedData.hasAdditionalInsured || false,
            missing_additional_insured: recheckedData.missingAdditionalInsured || false,
            has_waiver_of_subrogation: recheckedData.hasWaiverOfSubrogation || false,
            missing_waiver_of_subrogation: recheckedData.missingWaiverOfSubrogation || false,
            days_overdue: recheckedData.daysOverdue || 0
          })
          .eq('id', vendor.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`Failed to update vendor ${vendor.id}:`, updateError);
        }
      }

      console.log(`Successfully updated ${updatedCount} of ${vendors.length} vendors`);
      window.location.reload();

    } catch (err) {
      console.error('Error rechecking compliance:', err);
      setRecheckingCompliance(false);
      setError(`Recheck error: ${err.message}. Settings were saved but COIs were not updated.`);
    }
  };

  // Normalize a company name for flexible matching (removes punctuation, normalizes whitespace)
  const normalizeCompanyName = (name) => {
    return name
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()'"]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Build vendor data with the new compliance checking logic
  const buildVendorData = (extractedData, requirements) => {
    // Get GL amounts - support both old format (single amount) and new format (occurrence/aggregate)
    const glOccurrence = extractedData.generalLiability?.eachOccurrence || extractedData.generalLiability?.amount || 0;
    const glAggregate = extractedData.generalLiability?.aggregate || (extractedData.generalLiability?.amount ? extractedData.generalLiability.amount * 2 : 0);

    // Get required values from requirements (using existing DB column names)
    const reqGLOccurrence = requirements.general_liability || 1000000;
    const reqGLAggregate = requirements.gl_aggregate || (reqGLOccurrence * 2);
    const autoLiabilityRequired = requirements.auto_liability_required || (requirements.auto_liability > 0);
    const autoLiabilityMin = requirements.auto_liability || 1000000;
    const workersCompRequired = requirements.workers_comp_required !== false && requirements.workers_comp !== 'Not Required';

    const vendorData = {
      name: extractedData.companyName || 'Unknown Company',
      dba: extractedData.dba,
      expirationDate: extractedData.expirationDate || new Date().toISOString().split('T')[0],
      coverage: {
        generalLiability: {
          eachOccurrence: glOccurrence,
          aggregate: glAggregate,
          amount: glOccurrence, // Keep for backward compatibility
          expirationDate: extractedData.generalLiability?.expirationDate,
          compliant: glOccurrence >= reqGLOccurrence && glAggregate >= reqGLAggregate
        },
        autoLiability: {
          amount: extractedData.autoLiability?.amount || 0,
          expirationDate: extractedData.autoLiability?.expirationDate,
          present: (extractedData.autoLiability?.amount || 0) > 0,
          compliant: !autoLiabilityRequired || (extractedData.autoLiability?.amount || 0) >= autoLiabilityMin
        },
        workersComp: {
          amount: extractedData.workersComp?.amount || 'Statutory',
          expirationDate: extractedData.workersComp?.expirationDate,
          present: extractedData.workersComp?.amount !== null && extractedData.workersComp?.amount !== undefined,
          compliant: !workersCompRequired || (extractedData.workersComp?.amount !== null && extractedData.workersComp?.amount !== undefined)
        },
        employersLiability: {
          amount: extractedData.employersLiability?.amount || 0,
          expirationDate: extractedData.employersLiability?.expirationDate,
          compliant: true // Not checking EL in new requirements
        }
      },
      additionalCoverages: extractedData.additionalCoverages || [],
      additionalInsured: extractedData.additionalInsured || '',
      certificateHolder: extractedData.certificateHolder || '',
      waiverOfSubrogation: extractedData.waiverOfSubrogation || ''
    };

    const issues = [];
    const today = new Date();
    const expirationDate = new Date(vendorData.expirationDate);
    const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Check expiration (Is coverage current?)
    if (daysUntilExpiration < 0) {
      vendorData.status = 'expired';
      vendorData.daysOverdue = Math.abs(daysUntilExpiration);
      issues.push({ type: 'critical', message: `Coverage expired ${vendorData.expirationDate} (${vendorData.daysOverdue} days overdue)` });
    } else if (daysUntilExpiration <= 30) {
      vendorData.status = 'expiring';
      vendorData.daysOverdue = 0;
      issues.push({ type: 'warning', message: `Coverage expiring in ${daysUntilExpiration} days` });
    } else {
      vendorData.status = 'compliant';
      vendorData.daysOverdue = 0;
    }

    // 2. Check GL Each Occurrence
    if (glOccurrence < reqGLOccurrence) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `GL Each Occurrence: $${formatAmount(glOccurrence)} (requires $${formatAmount(reqGLOccurrence)})`
      });
    }

    // 3. Check GL Aggregate
    if (glAggregate < reqGLAggregate) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `GL Aggregate: $${formatAmount(glAggregate)} (requires $${formatAmount(reqGLAggregate)})`
      });
    }

    // 4. Check Workers Comp (Present?)
    if (workersCompRequired && !vendorData.coverage.workersComp.present) {
      vendorData.status = 'non-compliant';
      issues.push({ type: 'error', message: 'Workers Compensation not present' });
    }

    // 5. Check Auto Liability (Present & meets minimum if required)
    if (autoLiabilityRequired) {
      if (!vendorData.coverage.autoLiability.present) {
        vendorData.status = 'non-compliant';
        issues.push({ type: 'error', message: 'Auto Liability not present (required)' });
      } else if ((extractedData.autoLiability?.amount || 0) < autoLiabilityMin) {
        vendorData.status = 'non-compliant';
        issues.push({
          type: 'error',
          message: `Auto Liability: $${formatAmount(extractedData.autoLiability?.amount || 0)} (requires $${formatAmount(autoLiabilityMin)})`
        });
      }
    }

    // 6. Check Additional Insured (with flexible name matching)
    if (requirements.company_name && requirements.require_additional_insured) {
      const normalizedAdditionalInsured = normalizeCompanyName(vendorData.additionalInsured || '');
      const normalizedCompanyName = normalizeCompanyName(requirements.company_name);
      if (!normalizedAdditionalInsured.includes(normalizedCompanyName)) {
        vendorData.status = 'non-compliant';
        vendorData.missingAdditionalInsured = true;
        issues.push({ type: 'error', message: `"${requirements.company_name}" not listed as Additional Insured` });
      } else {
        vendorData.hasAdditionalInsured = true;
      }
    }

    // 7. Check Certificate Holder (using company name with flexible matching)
    if (requirements.company_name) {
      const normalizedCertHolder = normalizeCompanyName(vendorData.certificateHolder || '');
      const normalizedCompanyName = normalizeCompanyName(requirements.company_name);
      if (!normalizedCertHolder.includes(normalizedCompanyName)) {
        // This is a warning, not necessarily non-compliant
        issues.push({ type: 'warning', message: `Certificate Holder may not match "${requirements.company_name}"` });
      }
    }

    // Bonus: Check Waiver of Subrogation
    if (requirements.require_waiver_of_subrogation) {
      const waiverText = (vendorData.waiverOfSubrogation || '').toLowerCase();
      if (waiverText.includes('yes') || waiverText.includes('included') || waiverText.includes('waived')) {
        vendorData.hasWaiverOfSubrogation = true;
      } else {
        vendorData.status = 'non-compliant';
        vendorData.missingWaiverOfSubrogation = true;
        issues.push({ type: 'error', message: 'Waiver of Subrogation not included' });
      }
    }

    vendorData.issues = issues;
    return vendorData;
  };

  const formatAmount = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-6 sm:p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-500 mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Full-screen loading overlay when rechecking compliance
  if (recheckingCompliance) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/95 via-gray-900/95 to-teal-900/95 flex items-center justify-center z-50">
        <div className="text-center max-w-md px-6">
          <div className="relative mb-8">
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-emerald-500/30 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <Sparkles className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Updating Compliance
          </h2>
          <p className="text-emerald-200 text-lg mb-6">
            Checking all COIs against your updated requirements
          </p>
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-emerald-300/70 text-sm">
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">COI Compliance Requirements</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Define what SmartCOI checks on every certificate</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Success Message */}
          {saveSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
              <CheckCircle className="text-green-500" size={20} />
              <p className="text-green-800 font-medium">Settings saved successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Compliance Checklist */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-gray-700">
              <Info size={18} />
              <p className="text-sm">SmartCOI will verify each COI against these requirements:</p>
            </div>

            {/* 1. GL Each Occurrence */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">GL Each Occurrence</h4>
                  <p className="text-sm text-gray-500">Per-incident coverage minimum</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Required</span>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={settings.glEachOccurrence}
                  onChange={(e) => setSettings({...settings, glEachOccurrence: parseInt(e.target.value) || 0})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="100000"
                />
                <span className="text-gray-600 font-medium min-w-[100px] text-right">
                  {formatCurrency(settings.glEachOccurrence)}
                </span>
              </div>
            </div>

            {/* 2. GL Aggregate */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">GL Aggregate</h4>
                  <p className="text-sm text-gray-500">Total policy coverage minimum</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Required</span>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={settings.glAggregate}
                  onChange={(e) => setSettings({...settings, glAggregate: parseInt(e.target.value) || 0})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="100000"
                />
                <span className="text-gray-600 font-medium min-w-[100px] text-right">
                  {formatCurrency(settings.glAggregate)}
                </span>
              </div>
            </div>

            {/* 3. Workers Comp */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Workers Compensation</h4>
                  <p className="text-sm text-gray-500">Require WC coverage to be present</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.workersCompRequired}
                    onChange={(e) => setSettings({...settings, workersCompRequired: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>

            {/* 4. Auto Liability */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">Auto Liability</h4>
                  <p className="text-sm text-gray-500">Require auto coverage with minimum amount</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoLiabilityRequired}
                    onChange={(e) => setSettings({...settings, autoLiabilityRequired: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              {settings.autoLiabilityRequired && (
                <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Minimum:</span>
                  <input
                    type="number"
                    value={settings.autoLiabilityMinimum}
                    onChange={(e) => setSettings({...settings, autoLiabilityMinimum: parseInt(e.target.value) || 0})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    step="100000"
                  />
                  <span className="text-gray-600 font-medium min-w-[100px] text-right">
                    {formatCurrency(settings.autoLiabilityMinimum)}
                  </span>
                </div>
              )}
            </div>

            {/* 5 & 7. Company Name (for Additional Insured & Certificate Holder) */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">Your Company Name</h4>
                <p className="text-sm text-gray-500">Used to verify Additional Insured and Certificate Holder</p>
              </div>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Acme Corporation LLC"
              />
            </div>

            {/* 6. Additional Insured */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Additional Insured</h4>
                  <p className="text-sm text-gray-500">Require your company to be listed as Additional Insured</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireAdditionalInsured}
                    onChange={(e) => setSettings({...settings, requireAdditionalInsured: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>

            {/* Waiver of Subrogation */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Waiver of Subrogation</h4>
                  <p className="text-sm text-gray-500">Require waiver of subrogation in your favor</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireWaiverOfSubrogation}
                    onChange={(e) => setSettings({...settings, requireWaiverOfSubrogation: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Auto Follow-Up Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Automated Vendor Follow-Ups</h3>
                <p className="text-sm text-gray-500">Automatically contact vendors about compliance issues</p>
              </div>
            </div>

            {/* Enable Auto Follow-Up */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Automated Follow-Ups</h4>
                  <p className="text-sm text-gray-500">Send automatic emails to vendors with compliance issues</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoFollowUpEnabled}
                    onChange={(e) => setSettings({...settings, autoFollowUpEnabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>

            {settings.autoFollowUpEnabled && (
              <div className="space-y-4">
                {/* When to Send */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Bell size={18} className="text-gray-600" />
                    <h4 className="font-medium text-gray-900">Expiration Reminders</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Send reminders before certificates expire:</p>
                  <div className="flex flex-wrap gap-2">
                    {[30, 14, 7, 3, 1].map((days) => (
                      <button
                        key={days}
                        onClick={() => {
                          const current = settings.followUpDays || [];
                          if (current.includes(days)) {
                            setSettings({...settings, followUpDays: current.filter(d => d !== days)});
                          } else {
                            setSettings({...settings, followUpDays: [...current, days].sort((a, b) => b - a)});
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          (settings.followUpDays || []).includes(days)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>

                {/* Follow Up Triggers */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Expired Certificates</h4>
                        <p className="text-xs text-gray-500">Contact when COI has expired</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.followUpOnExpired}
                          onChange={(e) => setSettings({...settings, followUpOnExpired: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">Non-Compliant Coverage</h4>
                        <p className="text-xs text-gray-500">Contact about coverage gaps</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.followUpOnNonCompliant}
                          onChange={(e) => setSettings({...settings, followUpOnNonCompliant: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Frequency Limit */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock size={18} className="text-gray-600" />
                    <h4 className="font-medium text-gray-900">Follow-Up Frequency</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Minimum days between emails to the same vendor:</p>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={settings.followUpFrequencyDays}
                      onChange={(e) => setSettings({...settings, followUpFrequencyDays: parseInt(e.target.value)})}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-900 min-w-[60px]">
                      {settings.followUpFrequencyDays} days
                    </span>
                  </div>
                </div>

                {/* Info about vendor emails */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
                  <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Follow-ups are only sent to vendors with an email address on file. Add vendor emails when uploading COIs to enable automatic follow-ups.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-emerald-800 font-medium">Automatic Compliance Checking</p>
                <p className="text-sm text-emerald-700 mt-1">
                  When you save, all existing COIs will be rechecked against these requirements. New COIs are checked automatically on upload.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Requirements</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
