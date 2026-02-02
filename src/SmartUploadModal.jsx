// SmartUploadModal.jsx - Unified upload modal for vendors and tenants
import React, { useState, useEffect } from 'react';
import {
  X, Upload, Loader2, CheckCircle, AlertCircle,
  Building2, Home, FileCheck, Users, Shield
} from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

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
  userRequirements
}) {
  // Step: 1 = select type/property, 2 = tenant requirements (if tenant), 3 = upload, 4 = result
  const [step, setStep] = useState(1);
  const [documentType, setDocumentType] = useState(null); // 'vendor' or 'tenant'
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Tenant lease requirements
  const [tenantRequirements, setTenantRequirements] = useState({
    liabilityMin: 100000,
    requiresAdditionalInsured: true,
    additionalInsuredText: '',
    tenantName: '',
    tenantEmail: ''
  });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDocumentType(null);
      setSelectedPropertyId(initialProperty?.id || '');
      setSelectedUnitId('');
      setTenantRequirements({
        liabilityMin: 100000,
        requiresAdditionalInsured: true,
        additionalInsuredText: '',
        tenantName: '',
        tenantEmail: ''
      });
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialProperty]);

  // Load units when property changes
  useEffect(() => {
    if (selectedPropertyId && documentType === 'tenant') {
      loadUnits(selectedPropertyId);
    } else {
      setUnits([]);
      setSelectedUnitId('');
    }
  }, [selectedPropertyId, documentType]);

  const loadUnits = async (propertyId) => {
    try {
      setLoadingUnits(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .order('unit_number', { ascending: true });

      setUnits(data || []);
    } catch (err) {
      logger.error('Error loading units', err);
    } finally {
      setLoadingUnits(false);
    }
  };

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
          general_liability: tenantRequirements.liabilityMin,
          require_additional_insured: tenantRequirements.requiresAdditionalInsured,
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

      // Create vendor record
      const vendorData = {
        user_id: user.id,
        property_id: selectedPropertyId || null,
        name: data.name || data.companyName || 'New Vendor',
        dba: data.dba || null,
        status: status,
        expiration_date: data.expirationDate || null,
        coverage: data.coverage || {},
        issues: issues,
        additional_insured: data.additionalInsured || null,
        has_additional_insured: !!data.additionalInsured,
        waiver_of_subrogation: data.waiverOfSubrogation || null,
        has_waiver_of_subrogation: !!data.waiverOfSubrogation,
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
        data: newVendor
      });
      setStep(4);

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
      if (liabilityAmount < tenantRequirements.liabilityMin) {
        issues.push(`Personal Liability ${formatCurrency(liabilityAmount)} is below required ${formatCurrency(tenantRequirements.liabilityMin)}`);
      }

      if (tenantRequirements.requiresAdditionalInsured && !data.additionalInsured) {
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

      // Create tenant record
      const tenantData = {
        user_id: user.id,
        name: tenantRequirements.tenantName || data.name || data.companyName || 'New Tenant',
        email: tenantRequirements.tenantEmail || '',
        phone: '',
        property_id: selectedPropertyId || null,
        unit_id: selectedUnitId || null,
        status: 'active',
        insurance_status: insuranceStatus,
        // Lease requirements
        required_liability_min: tenantRequirements.liabilityMin,
        requires_additional_insured: tenantRequirements.requiresAdditionalInsured,
        additional_insured_text: tenantRequirements.additionalInsuredText,
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
        data: newTenant
      });
      setStep(4);

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
    setError(null);

    if (documentType === 'tenant') {
      setStep(2); // Go to tenant requirements
    } else {
      setStep(3); // Go directly to upload
    }
  };

  const handleTenantRequirementsContinue = () => {
    if (!tenantRequirements.tenantName.trim()) {
      setError('Please enter the tenant name');
      return;
    }
    setError(null);
    setStep(3);
  };

  if (!isOpen) return null;

  const selectedProp = properties.find(p => p.id === selectedPropertyId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload COI</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 && 'Select type and property'}
              {step === 2 && 'Enter tenant lease requirements'}
              {step === 3 && 'Upload insurance document'}
              {step === 4 && 'Upload complete'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Type and Property */}
          {step === 1 && (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Document Type Selection */}
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
                      Commercial certificate of insurance
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
                      Renter's insurance policy
                    </p>
                  </button>
                </div>
              </div>

              {/* Property Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 size={16} className="inline mr-2" />
                  Assign to Property
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

              {/* Unit Selection (for tenants) */}
              {documentType === 'tenant' && selectedPropertyId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Home size={16} className="inline mr-2" />
                    Unit (Optional)
                  </label>
                  {loadingUnits ? (
                    <div className="flex items-center gap-2 text-gray-500 py-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Loading units...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select a unit...</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.unit_number}</option>
                      ))}
                    </select>
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

              <button
                onClick={handleContinue}
                disabled={!documentType || !selectedPropertyId}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Tenant Requirements */}
          {step === 2 && (
            <div className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-purple-600" />
                  <h4 className="font-semibold text-purple-900">Lease Insurance Requirements</h4>
                </div>
                <p className="text-sm text-purple-700">
                  Enter the insurance requirements from this tenant's lease agreement.
                </p>
              </div>

              {/* Tenant Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant Name *
                </label>
                <input
                  type="text"
                  value={tenantRequirements.tenantName}
                  onChange={(e) => setTenantRequirements({...tenantRequirements, tenantName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              {/* Tenant Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant Email (Optional)
                </label>
                <input
                  type="email"
                  value={tenantRequirements.tenantEmail}
                  onChange={(e) => setTenantRequirements({...tenantRequirements, tenantEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="tenant@email.com"
                />
              </div>

              {/* Liability Minimum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Personal Liability
                </label>
                <select
                  value={tenantRequirements.liabilityMin}
                  onChange={(e) => setTenantRequirements({...tenantRequirements, liabilityMin: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={50000}>$50,000</option>
                  <option value={100000}>$100,000</option>
                  <option value={200000}>$200,000</option>
                  <option value={300000}>$300,000</option>
                  <option value={500000}>$500,000</option>
                </select>
              </div>

              {/* Additional Insured */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Require Additional Insured</p>
                  <p className="text-xs text-gray-500">Landlord must be listed as additional insured</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tenantRequirements.requiresAdditionalInsured}
                    onChange={(e) => setTenantRequirements({...tenantRequirements, requiresAdditionalInsured: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {tenantRequirements.requiresAdditionalInsured && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Insured Text (Optional)
                  </label>
                  <textarea
                    value={tenantRequirements.additionalInsuredText}
                    onChange={(e) => setTenantRequirements({...tenantRequirements, additionalInsuredText: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    placeholder="Property Owner LLC, its managers, members..."
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleTenantRequirementsContinue}
                  className="flex-1 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold"
                >
                  Continue to Upload
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Upload */}
          {step === 3 && (
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
                  {documentType === 'tenant' && tenantRequirements.tenantName && ` • ${tenantRequirements.tenantName}`}
                  {selectedUnitId && units.find(u => u.id === selectedUnitId) && ` • Unit ${units.find(u => u.id === selectedUnitId).unit_number}`}
                </p>
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
                onClick={() => setStep(documentType === 'tenant' ? 2 : 1)}
                className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium mt-4"
                disabled={uploading}
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && result && (
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
