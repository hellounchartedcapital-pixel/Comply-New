import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, CheckCircle, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { supabase } from './supabaseClient';
import { extractRequirementsFromPDF } from './extractRequirements';

export function Settings({ onClose }) {
  const [settings, setSettings] = useState({
    generalLiability: 1000000,
    autoLiability: 1000000,
    workersComp: 'Statutory',
    employersLiability: 500000,
    additionalRequirements: [],
    companyName: '',
    requireAdditionalInsured: true,
    requireWaiverOfSubrogation: false
  });

  const [customCoverages, setCustomCoverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [newRequirement, setNewRequirement] = useState('');
  const [recheckingCompliance, setRecheckingCompliance] = useState(false);

  // AI Extraction states
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [showExtractedData, setShowExtractedData] = useState(false);

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
        const additionalReqs = data.additional_requirements || [];

        // Decode requirements: separate text requirements from encoded custom coverages
        const textRequirements = [];
        const decodedCoverages = [];

        if (Array.isArray(additionalReqs)) {
          additionalReqs.forEach(item => {
            if (typeof item === 'string' && item.startsWith('__COVERAGE__')) {
              // Decode custom coverage
              try {
                const coverage = JSON.parse(item.substring(12)); // Remove __COVERAGE__ prefix
                decodedCoverages.push(coverage);
              } catch (e) {
                console.error('Failed to parse coverage:', e);
              }
            } else if (typeof item === 'string') {
              // Regular text requirement
              textRequirements.push(item);
            }
          });
        }

        setSettings({
          generalLiability: data.general_liability || 1000000,
          autoLiability: data.auto_liability || 1000000,
          workersComp: data.workers_comp || 'Statutory',
          employersLiability: data.employers_liability || 500000,
          additionalRequirements: textRequirements,
          companyName: data.company_name || '',
          requireAdditionalInsured: data.require_additional_insured !== false,
          requireWaiverOfSubrogation: data.require_waiver_of_subrogation || false
        });

        // Load decoded custom coverages
        if (decodedCoverages.length > 0) {
          setCustomCoverages(decodedCoverages);
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      setExtracting(true);
      setError(null);
      setExtractionResult(null);

      const result = await extractRequirementsFromPDF(file);

      if (result.success) {
        setExtractionResult(result.data);
        setShowExtractedData(true);

        // Auto-apply extracted data
        applyExtractedRequirements(result.data);
      } else {
        setError('Failed to extract requirements: ' + result.error);
      }
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Failed to process PDF: ' + err.message);
    } finally {
      setExtracting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const applyExtractedRequirements = (extractedData) => {
    const { requirements } = extractedData;

    // Update standard coverages
    const newSettings = { ...settings };

    if (requirements.general_liability?.amount) {
      newSettings.generalLiability = requirements.general_liability.amount;
    }

    if (requirements.auto_liability?.amount) {
      newSettings.autoLiability = requirements.auto_liability.amount;
    }

    if (requirements.workers_comp?.amount) {
      newSettings.workersComp = requirements.workers_comp.amount;
    }

    if (requirements.employers_liability?.amount) {
      newSettings.employersLiability = requirements.employers_liability.amount;
    }

    setSettings(newSettings);

    // Update custom coverages
    if (requirements.additional_coverages?.length > 0) {
      setCustomCoverages(requirements.additional_coverages);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Encode custom coverages into the array format for database compatibility
      // Format: text requirements are strings, custom coverages are prefixed with __COVERAGE__
      const encodedRequirements = [
        ...settings.additionalRequirements,
        // Encode custom coverages with a special prefix
        ...customCoverages.map(cov => `__COVERAGE__${JSON.stringify(cov)}`)
      ];

      const settingsData = {
        user_id: user.id,
        general_liability: settings.generalLiability,
        auto_liability: settings.autoLiability,
        workers_comp: settings.workersComp,
        employers_liability: settings.employersLiability,
        additional_requirements: encodedRequirements,
        company_name: settings.companyName,
        require_additional_insured: settings.requireAdditionalInsured,
        require_waiver_of_subrogation: settings.requireWaiverOfSubrogation
      };

      const { error } = await supabase
        .from('settings')
        .upsert(settingsData, { onConflict: 'user_id' });

      if (error) throw error;

      setSaving(false);
      setSaveSuccess(true);

      // Now recheck compliance for all vendors with new requirements
      await recheckAllVendors(settingsData);

    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings: ' + err.message);
      setSaving(false);
    }
  };

  const recheckAllVendors = async (settingsData) => {
    try {
      setRecheckingCompliance(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Prepare requirements for the edge function
      const requirements = {
        general_liability: settingsData.general_liability,
        auto_liability: settingsData.auto_liability,
        workers_comp: settingsData.workers_comp,
        employers_liability: settingsData.employers_liability,
        company_name: settingsData.company_name,
        require_additional_insured: settingsData.require_additional_insured,
        require_waiver_of_subrogation: settingsData.require_waiver_of_subrogation,
        custom_coverages: customCoverages.filter(c => c.type && c.amount > 0).map(c => ({
          type: c.type,
          amount: c.amount,
          required: c.required !== false
        }))
      };

      console.log('Rechecking compliance with requirements:', requirements);
      console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);

      // Call the recheck-compliance edge function
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/recheck-compliance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ requirements })
        }
      );

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Recheck result:', result);

      if (!result.success) {
        console.error('Recheck compliance error:', result.error);
        setRecheckingCompliance(false);
        setError(`Recheck failed: ${result.error}. Settings were saved but COIs were not updated.`);
        return;
      }

      // Wait 2 seconds so user can see console logs, then reload
      console.log('Success! Reloading page in 2 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error('Error rechecking compliance:', err);
      setRecheckingCompliance(false);
      setError(`Recheck error: ${err.message}. Settings were saved but COIs were not updated.`);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setSettings({
        ...settings,
        additionalRequirements: [...settings.additionalRequirements, newRequirement.trim()]
      });
      setNewRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setSettings({
      ...settings,
      additionalRequirements: settings.additionalRequirements.filter((_, i) => i !== index)
    });
  };

  const addCustomCoverage = () => {
    setCustomCoverages([
      ...customCoverages,
      { type: '', amount: 0, required: true, confidence: 'high' }
    ]);
  };

  const updateCustomCoverage = (index, field, value) => {
    const updated = [...customCoverages];
    updated[index] = { ...updated[index], [field]: value };
    setCustomCoverages(updated);
  };

  const removeCustomCoverage = (index) => {
    setCustomCoverages(customCoverages.filter((_, i) => i !== index));
  };

  const getConfidenceBadge = (confidence) => {
    const styles = {
      high: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[confidence] || styles.medium}`}>
        {confidence === 'high' ? '✓ High confidence' : confidence === 'medium' ? '⚠ Verify' : '! Low confidence'}
      </span>
    );
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
          {/* Animated AI Icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 w-24 h-24 mx-auto bg-emerald-500/30 rounded-full animate-ping"></div>
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <Sparkles className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>

          {/* Loading text */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Updating Compliance
          </h2>
          <p className="text-emerald-200 text-lg mb-6">
            A.I. is checking the updated requirements against all saved COIs
          </p>

          {/* Progress indicator */}
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
            <h2 className="text-lg sm:text-xl font-semibold">Compliance Requirements</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Configure your insurance requirements</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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

          {/* AI Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-400 transition-colors">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="text-white" size={32} />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Quick Start: Upload Requirements PDF</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a lease, vendor requirements doc, or sample COI - AI will extract your requirements
              </p>

              {extracting ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                  <p className="text-gray-600 font-medium">Analyzing document with AI...</p>
                  <p className="text-sm text-gray-500">This may take 10-15 seconds</p>
                </div>
              ) : (
                <label className="inline-flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer transition-colors">
                  <FileText size={20} />
                  <span className="font-medium">Upload PDF</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFUpload}
                    className="hidden"
                  />
                </label>
              )}

              {extractionResult && showExtractedData && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="text-green-500" size={20} />
                      <p className="font-medium text-green-800">Requirements extracted!</p>
                    </div>
                    <button
                      onClick={() => setShowExtractedData(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-green-700">
                    {extractionResult.extraction_notes || 'Review and edit the values below, then save.'}
                  </p>
                  {extractionResult.source_document_type && (
                    <p className="text-xs text-green-600 mt-2">
                      Document type: {extractionResult.source_document_type}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Standard Coverage Requirements */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <span>Standard Coverage Requirements</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Liability
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={settings.generalLiability}
                    onChange={(e) => setSettings({...settings, generalLiability: parseInt(e.target.value) || 0})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    step="100000"
                  />
                  <span className="text-gray-600 font-medium min-w-[140px]">
                    {formatCurrency(settings.generalLiability)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto Liability
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={settings.autoLiability}
                    onChange={(e) => setSettings({...settings, autoLiability: parseInt(e.target.value) || 0})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    step="100000"
                  />
                  <span className="text-gray-600 font-medium min-w-[140px]">
                    {formatCurrency(settings.autoLiability)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workers Compensation
                </label>
                <input
                  type="text"
                  value={settings.workersComp}
                  onChange={(e) => setSettings({...settings, workersComp: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Statutory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employers Liability
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={settings.employersLiability}
                    onChange={(e) => setSettings({...settings, employersLiability: parseInt(e.target.value) || 0})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    step="100000"
                  />
                  <span className="text-gray-600 font-medium min-w-[140px]">
                    {formatCurrency(settings.employersLiability)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Insured Settings */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Additional Insured Verification</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Company Name
                </label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Acme Corporation LLC"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will be checked against the "Additional Insured" field on vendor COIs
                </p>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="requireAdditionalInsured"
                  checked={settings.requireAdditionalInsured}
                  onChange={(e) => setSettings({...settings, requireAdditionalInsured: e.target.checked})}
                  className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <label htmlFor="requireAdditionalInsured" className="font-medium text-gray-900 cursor-pointer">
                    Require as Additional Insured
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    When enabled, vendors will be marked as non-compliant if your company is not listed as an Additional Insured on their COI
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  id="requireWaiverOfSubrogation"
                  checked={settings.requireWaiverOfSubrogation}
                  onChange={(e) => setSettings({...settings, requireWaiverOfSubrogation: e.target.checked})}
                  className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <label htmlFor="requireWaiverOfSubrogation" className="font-medium text-gray-900 cursor-pointer">
                    Require Waiver of Subrogation
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    When enabled, vendors will be marked as non-compliant if their COI does not include a Waiver of Subrogation in your favor
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Coverages */}
          {customCoverages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Additional Coverage Types</h3>
              <div className="space-y-3">
                {customCoverages.map((coverage, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={coverage.type}
                          onChange={(e) => updateCustomCoverage(index, 'type', e.target.value)}
                          placeholder="e.g., Cyber Liability, Professional Liability"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        />
                        {coverage.confidence && getConfidenceBadge(coverage.confidence)}
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          value={coverage.amount}
                          onChange={(e) => updateCustomCoverage(index, 'amount', parseInt(e.target.value) || 0)}
                          placeholder="Amount"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          step="100000"
                        />
                        <span className="text-gray-600 text-sm font-medium min-w-[120px]">
                          {formatCurrency(coverage.amount || 0)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCustomCoverage(index)}
                      className="text-red-500 hover:text-red-700 mt-2"
                      title="Remove coverage"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={addCustomCoverage}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span className="font-medium">Add Custom Coverage Type</span>
          </button>

          {/* Text Requirements */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Additional Text Requirements</h3>

            {settings.additionalRequirements.length > 0 && (
              <div className="space-y-2 mb-4">
                {settings.additionalRequirements.map((req, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-gray-900">{req}</span>
                    <button
                      onClick={() => removeRequirement(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-2">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                placeholder="e.g., Additional Insured required, 30 days notice..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={addRequirement}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> When vendors upload COIs, SmartCOI automatically checks them against these requirements and flags any non-compliance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium flex items-center space-x-2"
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
