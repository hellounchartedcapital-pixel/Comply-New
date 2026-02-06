// SmartUploadModal.jsx - Unified upload modal for vendors and tenants
import React, { useState, useEffect } from 'react';
import {
  X, Upload, Loader2, CheckCircle, AlertCircle,
  Building2, Home, FileCheck, Users, Mail
} from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

// Local storage key for persisting property selection
const LAST_PROPERTY_KEY = 'smartcoi_last_property';

// Format currency for display
function formatCurrency(amount) {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export function SmartUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  properties = [],
  selectedProperty: initialProperty,
  userRequirements,
  defaultDocumentType = null // 'vendor' or 'tenant' - if set, skips type selection
}) {
  // Simplified: Step 1 = select type/property/name/email, Step 2 = upload, Step 3 = result
  const [step, setStep] = useState(1);
  const [documentType, setDocumentType] = useState(null); // 'vendor' or 'tenant'
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [unitNumber, setUnitNumber] = useState(''); // User enters unit number directly

  // Contact info (for both vendors and tenants)
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Tenant defaults (loaded from settings)
  const [tenantDefaults, setTenantDefaults] = useState({
    liabilityMin: 100000,
    requiresAdditionalInsured: true,
    additionalInsuredText: ''
  });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Load tenant defaults from settings
  const loadTenantDefaults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('settings')
        .select('tenant_default_liability_min, tenant_default_requires_additional_insured, tenant_default_additional_insured_text')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setTenantDefaults({
          liabilityMin: data.tenant_default_liability_min || 100000,
          requiresAdditionalInsured: data.tenant_default_requires_additional_insured !== false,
          additionalInsuredText: data.tenant_default_additional_insured_text || ''
        });
      }
    } catch (err) {
      logger.error('Error loading tenant defaults', err);
    }
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDocumentType(defaultDocumentType); // Use default if provided
      setContactName('');
      setContactEmail('');
      setResult(null);
      setError(null);

      // Try to restore last selected property from localStorage
      let lastPropertyId = null;
      try {
        lastPropertyId = localStorage.getItem(LAST_PROPERTY_KEY);
      } catch (e) {
        // localStorage may be unavailable in private browsing
        logger.warn('localStorage unavailable', e);
      }
      if (initialProperty?.id) {
        setSelectedPropertyId(initialProperty.id);
      } else if (lastPropertyId && properties.some(p => p.id === lastPropertyId)) {
        setSelectedPropertyId(lastPropertyId);
      } else if (properties.length === 1) {
        // Auto-select if only one property
        setSelectedPropertyId(properties[0].id);
      } else {
        setSelectedPropertyId('');
      }

      setUnitNumber('');
      loadTenantDefaults();
    }
  }, [isOpen, initialProperty, properties, defaultDocumentType]);

  // Save property selection to localStorage
  useEffect(() => {
    if (selectedPropertyId) {
      try {
        localStorage.setItem(LAST_PROPERTY_KEY, selectedPropertyId);
      } catch (e) {
        // localStorage may be unavailable in private browsing - ignore
      }
    }
  }, [selectedPropertyId]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading document...');
    setError(null);

    // Track uploaded file path for cleanup on failure
    let uploadedFilePath = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const tempId = crypto.randomUUID();
      const fileName = `${documentType}s/${user.id}/${tempId}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      uploadedFilePath = fileName; // Track for cleanup on failure

      // Convert file to base64 for AI extraction
      setUploadStatus('Analyzing document...');
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Get requirements based on type
      const selectedProp = properties.find(p => p.id === selectedPropertyId);
      let requirements = {};

      if (documentType === 'vendor') {
        requirements = {
          general_liability: selectedProp?.general_liability || userRequirements?.general_liability || 1000000,
          auto_liability: selectedProp?.auto_liability || userRequirements?.auto_liability || 1000000,
          workers_comp: selectedProp?.workers_comp_required ? 'Statutory' : null,
          require_additional_insured: selectedProp?.require_additional_insured !== false
        };
      } else {
        requirements = {
          general_liability: tenantDefaults.liabilityMin,
          require_additional_insured: tenantDefaults.requiresAdditionalInsured,
          is_tenant_policy: true
        };
      }

      // Call extraction Edge Function
      const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-coi', {
        body: {
          pdfBase64: base64Data,
          requirements: requirements
        }
      });

      if (extractionError) {
        logger.error('Extraction error', extractionError);
        throw new Error('Failed to analyze document');
      }

      const extractedData = extractionResult?.data || {};

      // Process based on document type
      if (documentType === 'vendor') {
        await processVendorUpload(extractedData, fileName, selectedProp);
      } else {
        await processTenantUpload(extractedData, fileName);
      }

    } catch (err) {
      logger.error('Upload error', err);
      setError(err.message || 'Failed to process upload');

      // Cleanup: Delete uploaded file if it exists and the processing failed
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('coi-documents').remove([uploadedFilePath]);
          logger.info('Cleaned up orphaned file:', uploadedFilePath);
        } catch (cleanupErr) {
          logger.error('Failed to cleanup orphaned file', cleanupErr);
        }
      }
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const processVendorUpload = async (data, filePath, property) => {
    setUploadStatus('Creating vendor record...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine compliance status
      let status = 'compliant';
      const issues = [];

      // Check general liability
      const glRequired = property?.general_liability || userRequirements?.general_liability || 1000000;
      const glAmount = data.coverage?.generalLiability?.amount || 0;
      if (glAmount < glRequired) {
        issues.push({ type: 'coverage', message: `General Liability ${formatCurrency(glAmount)} is below required ${formatCurrency(glRequired)}` });
      }

      // Check additional insured
      if (property?.require_additional_insured !== false && !data.additionalInsured) {
        issues.push({ type: 'endorsement', message: 'Additional Insured endorsement not found' });
      }

      // Check expiration
      if (data.expirationDate) {
        const expDate = new Date(data.expirationDate);
        const today = new Date();
        const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          status = 'expired';
        } else if (daysUntil <= 30) {
          status = 'expiring';
        } else if (issues.length > 0) {
          status = 'non-compliant';
        }
      } else if (issues.length > 0) {
        status = 'non-compliant';
      }

      // Generate upload token
      const uploadToken = crypto.randomUUID();
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);

      // Create vendor record - use extracted name or provided name
      const vendorName = data.name || data.companyName || contactName || 'New Vendor';

      const vendorData = {
        user_id: user.id,
        property_id: selectedPropertyId || null,
        name: vendorName,
        dba: data.dba || null,
        email: contactEmail || null,  // Save email from upload form
        status: status,
        expiration_date: data.expirationDate || null,
        coverage: data.coverage || {},
        additional_coverages: data.additionalCoverages || [],
        issues: issues,
        additional_insured: data.additionalInsured || null,
        has_additional_insured: !!data.hasAdditionalInsured,
        waiver_of_subrogation: data.waiverOfSubrogation || null,
        has_waiver_of_subrogation: !!data.hasWaiverOfSubrogation,
        raw_data: {
          ...data.rawData,
          documentPath: filePath,
          uploadToken: uploadToken,
          uploadTokenExpiresAt: tokenExpiry.toISOString()
        },
        upload_token: uploadToken,
        upload_token_expires_at: tokenExpiry.toISOString()
      };

      const { data: newVendor, error: insertError } = await supabase
        .from('vendors')
        .insert(vendorData)
        .select()
        .single();

      if (insertError) throw insertError;

      setResult({
        success: true,
        type: 'vendor',
        name: newVendor.name,
        status: status,
        issues: issues,
        coverage: data.coverage || {},
        additionalCoverages: data.additionalCoverages || [],
        data: newVendor
      });
      setStep(3);

      if (onUploadComplete) {
        onUploadComplete({ type: 'vendor', data: newVendor });
      }

    } catch (err) {
      throw err;
    }
  };

  const processTenantUpload = async (data, filePath) => {
    setUploadStatus('Creating tenant record...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check compliance against lease requirements
      const issues = [];
      let insuranceStatus = 'compliant';

      const liabilityAmount = data.coverage?.generalLiability?.amount || 0;
      if (liabilityAmount < tenantDefaults.liabilityMin) {
        issues.push(`Personal Liability ${formatCurrency(liabilityAmount)} is below required ${formatCurrency(tenantDefaults.liabilityMin)}`);
      }

      if (tenantDefaults.requiresAdditionalInsured && !data.additionalInsured) {
        issues.push('Additional Insured endorsement not found');
      }

      // Check expiration
      if (data.expirationDate) {
        const expDate = new Date(data.expirationDate);
        const today = new Date();
        const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          insuranceStatus = 'expired';
        } else if (daysUntil <= 30) {
          insuranceStatus = 'expiring';
        } else if (issues.length > 0) {
          insuranceStatus = 'non-compliant';
        }
      } else if (issues.length > 0) {
        insuranceStatus = 'non-compliant';
      }

      // Generate upload token
      const uploadToken = crypto.randomUUID();
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);

      // Use extracted name or provided name
      const tenantName = contactName || data.name || data.companyName || 'New Tenant';

      // Create unit if unit number was provided
      let unitId = null;
      if (unitNumber && unitNumber.trim() && selectedPropertyId) {
        // Check if unit already exists
        const { data: existingUnit } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', selectedPropertyId)
          .eq('user_id', user.id)
          .eq('unit_number', unitNumber.trim())
          .single();

        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          // Create new unit
          const { data: newUnit, error: unitError } = await supabase
            .from('units')
            .insert({
              user_id: user.id,
              property_id: selectedPropertyId,
              unit_number: unitNumber.trim()
            })
            .select('id')
            .single();

          if (!unitError && newUnit) {
            unitId = newUnit.id;
          }
        }
      }

      // Create tenant record
      const tenantData = {
        user_id: user.id,
        name: tenantName,
        email: contactEmail || '',
        phone: '',
        property_id: selectedPropertyId || null,
        unit_id: unitId,
        status: 'active',
        insurance_status: insuranceStatus,
        // Lease requirements (from defaults)
        required_liability_min: tenantDefaults.liabilityMin,
        requires_additional_insured: tenantDefaults.requiresAdditionalInsured,
        additional_insured_text: tenantDefaults.additionalInsuredText,
        // Policy data
        policy_expiration_date: data.expirationDate || null,
        policy_liability_amount: liabilityAmount,
        policy_coverage: data.coverage || null,
        policy_additional_insured: data.additionalInsured || null,
        has_additional_insured: !!data.additionalInsured,
        policy_document_path: filePath,
        compliance_issues: issues.length > 0 ? issues : null,
        raw_policy_data: data.rawData || null,
        policy_uploaded_at: new Date().toISOString(),
        upload_token: uploadToken,
        upload_token_expires_at: tokenExpiry.toISOString()
      };

      const { data: newTenant, error: insertError } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select(`
          *,
          unit:units(id, unit_number),
          property:properties(id, name, address)
        `)
        .single();

      if (insertError) throw insertError;

      setResult({
        success: true,
        type: 'tenant',
        name: newTenant.name,
        status: insuranceStatus,
        issues: issues,
        coverage: data.coverage || {},
        additionalCoverages: data.additionalCoverages || [],
        data: newTenant
      });
      setStep(3);

      if (onUploadComplete) {
        onUploadComplete({ type: 'tenant', data: newTenant });
      }

    } catch (err) {
      throw err;
    }
  };

  const handleContinue = () => {
    if (!documentType) {
      setError('Please select Vendor or Tenant');
      return;
    }
    if (!selectedPropertyId) {
      setError('Please select a property');
      return;
    }
    // Require name for tenants
    if (documentType === 'tenant' && !contactName.trim()) {
      setError('Please enter the tenant name');
      return;
    }
    setError(null);
    setStep(2); // Go directly to upload
  };

  if (!isOpen) return null;

  const selectedProp = properties.find(p => p.id === selectedPropertyId);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 id="upload-modal-title" className="text-xl font-bold text-gray-900">Upload COI</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 && 'Select type and enter details'}
              {step === 2 && 'Upload insurance document'}
              {step === 3 && 'Upload complete'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Close dialog"
          >
            <X size={20} className="text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Type, Property, and Contact Info */}
          {step === 1 && (
            <div className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Document Type Selection - Only show if no default type provided */}
              {!defaultDocumentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What type of document is this?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDocumentType('vendor')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        documentType === 'vendor'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                        documentType === 'vendor' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <FileCheck size={20} className={documentType === 'vendor' ? 'text-blue-600' : 'text-gray-500'} />
                      </div>
                      <p className={`font-semibold ${documentType === 'vendor' ? 'text-blue-900' : 'text-gray-900'}`}>
                        Vendor COI
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Commercial certificate
                      </p>
                    </button>

                    <button
                      onClick={() => setDocumentType('tenant')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        documentType === 'tenant'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                        documentType === 'tenant' ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        <Users size={20} className={documentType === 'tenant' ? 'text-purple-600' : 'text-gray-500'} />
                      </div>
                      <p className={`font-semibold ${documentType === 'tenant' ? 'text-purple-900' : 'text-gray-900'}`}>
                        Tenant Insurance
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Renter's policy
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Property Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 size={16} className="inline mr-2" />
                  Property
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select a property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Unit Number Input (for tenants) */}
              {documentType === 'tenant' && selectedPropertyId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Home size={16} className="inline mr-2" />
                    Unit Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., 101, A, 2B"
                  />
                </div>
              )}

              {/* Name Field (for tenants it's required, for vendors optional) */}
              {documentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {documentType === 'tenant' ? 'Tenant Name *' : 'Vendor Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={documentType === 'tenant' ? 'John Smith' : 'Auto-extracted from COI'}
                  />
                  {documentType === 'vendor' && (
                    <p className="text-xs text-gray-500 mt-1">Leave blank to use name from certificate</p>
                  )}
                </div>
              )}

              {/* Email Field */}
              {documentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail size={16} className="inline mr-2" />
                    Email {documentType === 'vendor' && <span className="text-amber-600">(recommended for follow-ups)</span>}
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={`${documentType}@email.com`}
                  />
                  {documentType === 'vendor' && (
                    <p className="text-xs text-gray-500 mt-1">Required for automatic follow-up emails</p>
                  )}
                </div>
              )}

              {/* Property Requirements Preview (for vendors) */}
              {documentType === 'vendor' && selectedProp && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Property Requirements</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• General Liability: {formatCurrency(selectedProp.general_liability || 1000000)} min</li>
                    {selectedProp.auto_liability_required && (
                      <li>• Auto Liability: {formatCurrency(selectedProp.auto_liability || 1000000)} min</li>
                    )}
                    {selectedProp.workers_comp_required && (
                      <li>• Workers Compensation: Required</li>
                    )}
                    {selectedProp.require_additional_insured !== false && (
                      <li>• Additional Insured: Required</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Tenant Requirements Preview */}
              {documentType === 'tenant' && selectedProp && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-2">Tenant Requirements (from Settings)</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Personal Liability: {formatCurrency(tenantDefaults.liabilityMin)} min</li>
                    {tenantDefaults.requiresAdditionalInsured && (
                      <li>• Additional Insured: Required</li>
                    )}
                  </ul>
                </div>
              )}

              <button
                onClick={handleContinue}
                disabled={!documentType || !selectedPropertyId}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Upload
              </button>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 2 && (
            <div>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Summary */}
              <div className={`rounded-lg p-4 mb-4 ${
                documentType === 'vendor' ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {documentType === 'vendor'
                    ? <FileCheck size={18} className="text-blue-600" />
                    : <Users size={18} className="text-purple-600" />
                  }
                  <span className={`font-semibold ${documentType === 'vendor' ? 'text-blue-900' : 'text-purple-900'}`}>
                    {documentType === 'vendor' ? 'Vendor COI' : 'Tenant Insurance'}
                  </span>
                </div>
                <p className={`text-sm ${documentType === 'vendor' ? 'text-blue-700' : 'text-purple-700'}`}>
                  {selectedProp?.name}
                  {contactName && ` • ${contactName}`}
                  {unitNumber && unitNumber.trim() && ` • Unit ${unitNumber.trim()}`}
                </p>
                {contactEmail && (
                  <p className={`text-xs mt-1 ${documentType === 'vendor' ? 'text-blue-600' : 'text-purple-600'}`}>
                    <Mail size={12} className="inline mr-1" />{contactEmail}
                  </p>
                )}
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-300 hover:border-emerald-400'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />

                {uploading ? (
                  <div>
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-700 font-medium">{uploadStatus}</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drag and drop insurance document
                    </p>
                    <p className="text-gray-500">or click to browse files</p>
                    <p className="text-xs text-gray-400 mt-2">PDF files only, max 10MB</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium mt-4"
                disabled={uploading}
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.status === 'compliant' ? 'bg-emerald-100' :
                result.status === 'expired' ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {result.status === 'compliant' ? (
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {result.type === 'vendor' ? 'Vendor' : 'Tenant'} Added!
              </h3>

              <p className="text-gray-600 mb-4">
                <span className="font-medium">{result.name}</span>
              </p>

              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                result.status === 'compliant'
                  ? 'bg-emerald-100 text-emerald-800'
                  : result.status === 'expired'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
              }`}>
                {result.status === 'compliant' && <CheckCircle size={16} />}
                {result.status !== 'compliant' && <AlertCircle size={16} />}
                <span className="font-medium capitalize">{result.status.replace('-', ' ')}</span>
              </div>

              {/* Extracted Coverages Summary */}
              {result.coverage && Object.keys(result.coverage).length > 0 && (
                <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Coverages Found:</h4>
                  <div className="space-y-1 text-sm">
                    {result.coverage.generalLiability && !result.coverage.generalLiability.notFound && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">General Liability:</span>
                        <span className={`font-medium ${result.coverage.generalLiability.compliant === false ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(result.coverage.generalLiability.amount)}
                        </span>
                      </div>
                    )}
                    {result.coverage.autoLiability && !result.coverage.autoLiability.notFound && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Auto Liability:</span>
                        <span className={`font-medium ${result.coverage.autoLiability.compliant === false ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(result.coverage.autoLiability.amount)}
                        </span>
                      </div>
                    )}
                    {result.coverage.workersComp && !result.coverage.workersComp.notFound && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Workers Comp:</span>
                        <span className="font-medium text-gray-900">
                          {result.coverage.workersComp.amount === 'Statutory' ? 'Statutory' : formatCurrency(result.coverage.workersComp.amount)}
                        </span>
                      </div>
                    )}
                    {result.coverage.employersLiability && !result.coverage.employersLiability.notFound && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Employers Liability:</span>
                        <span className={`font-medium ${result.coverage.employersLiability.compliant === false ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(result.coverage.employersLiability.amount)}
                        </span>
                      </div>
                    )}
                    {/* Additional Coverages */}
                    {result.additionalCoverages && result.additionalCoverages.length > 0 && (
                      <>
                        {result.additionalCoverages.map((cov, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-gray-600">{cov.type}:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(cov.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Issues */}
              {result.issues && result.issues.length > 0 && (
                <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Issues Found:</h4>
                  <ul className="space-y-1">
                    {result.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        {typeof issue === 'string' ? issue : issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SmartUploadModal;
