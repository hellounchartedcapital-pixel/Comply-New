// TenantCOIUploadModal.jsx - Tenant COI upload: Set requirements first, then upload COI
import React, { useState, useCallback, useEffect } from 'react';
import {
  X, Upload, Loader2, CheckCircle, AlertCircle,
  Building2, User, Shield, Mail, Phone, Home
} from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

const STEPS = {
  DETAILS: 'details',
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  RESULT: 'result',
  ERROR: 'error'
};

const COVERAGE_OPTIONS = [
  { value: 0, label: 'Not Required' },
  { value: 100000, label: '$100,000' },
  { value: 300000, label: '$300,000' },
  { value: 500000, label: '$500,000' },
  { value: 1000000, label: '$1,000,000' },
  { value: 2000000, label: '$2,000,000' },
  { value: 5000000, label: '$5,000,000' },
];

function formatCurrency(amount) {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function TenantCOIUploadModal({ isOpen, onClose, onTenantCreated, onManualAdd, properties = [] }) {
  const [step, setStep] = useState(STEPS.DETAILS);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');

  // Tenant details (entered BEFORE upload, like vendor flow)
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // Lease requirements (set BEFORE upload)
  const [requirements, setRequirements] = useState({
    general_liability: 1000000,
    auto_liability: 0,
    workers_comp: false,
    employers_liability: 0,
    additional_insured: true,
    waiver_of_subrogation: false
  });

  // Result data
  const [result, setResult] = useState(null);

  const resetState = useCallback(() => {
    setStep(STEPS.DETAILS);
    setDragActive(false);
    setError(null);
    setProcessingStatus('');
    setTenantName('');
    setTenantEmail('');
    setTenantPhone('');
    setPropertyId('');
    setUnitNumber('');
    setRequirements({
      general_liability: 1000000,
      auto_liability: 0,
      workers_comp: false,
      employers_liability: 0,
      additional_insured: true,
      waiver_of_subrogation: false
    });
    setResult(null);
  }, []);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      resetState();
      if (properties.length === 1) {
        setPropertyId(properties[0].id);
      }
    }
  }, [isOpen, resetState, properties]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleContinue = () => {
    if (!tenantName.trim()) {
      setError('Please enter the tenant name');
      return;
    }
    if (!propertyId) {
      setError('Please select a property');
      return;
    }
    setError(null);
    setStep(STEPS.UPLOAD);
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
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      handleFile(droppedFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const handleFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setStep(STEPS.PROCESSING);
    setProcessingStatus('Uploading document...');

    let uploadedFilePath = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage
      const sanitizedName = tenantName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const fileName = `${user.id}/tenants/${sanitizedName}_${Date.now()}_coi.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: false });

      if (uploadError) throw new Error('Failed to upload COI document');
      uploadedFilePath = fileName;

      // Convert to base64 for extraction
      setProcessingStatus('Analyzing certificate...');
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call extract-coi with rawOnly to get direct AI extraction
      const { data: extractionResult, error: fnError } = await supabase.functions.invoke('extract-coi', {
        body: { pdfBase64: base64Data, rawOnly: true }
      });

      if (fnError) throw new Error(fnError.message || 'Failed to process COI');
      if (!extractionResult?.success) throw new Error(extractionResult?.error || 'Failed to extract COI data');

      const raw = extractionResult.data;

      // Extract values from raw AI output
      const glAmount = raw.generalLiability?.amount ?? 0;
      const glAggregate = raw.generalLiability?.aggregate ?? 0;
      const autoAmount = raw.autoLiability?.amount ?? 0;
      const wcAmount = raw.workersComp?.amount || null;
      const elAmount = raw.employersLiability?.amount ?? 0;
      const hasAdditionalInsured = (raw.additionalInsured || '').toLowerCase() === 'yes';
      const hasWaiverOfSubrogation = (raw.waiverOfSubrogation || '').toLowerCase() === 'yes';
      const expirationDate = raw.expirationDate || null;
      const additionalCoverages = raw.additionalCoverages || [];

      // Check compliance against requirements
      setProcessingStatus('Checking compliance...');
      const glCompliant = requirements.general_liability === 0 || glAmount >= requirements.general_liability;
      const autoCompliant = requirements.auto_liability === 0 || autoAmount >= requirements.auto_liability;
      const wcCompliant = !requirements.workers_comp || wcAmount === 'Statutory' || (typeof wcAmount === 'number' && wcAmount > 0);
      const elCompliant = requirements.employers_liability === 0 || elAmount >= requirements.employers_liability;
      const aiCompliant = !requirements.additional_insured || hasAdditionalInsured;
      const wosCompliant = !requirements.waiver_of_subrogation || hasWaiverOfSubrogation;

      const today = new Date();
      const expDate = expirationDate ? new Date(expirationDate) : null;
      const daysUntilExpiration = expDate ? Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      let insuranceStatus = 'compliant';
      const issues = [];

      if (daysUntilExpiration < 0) {
        insuranceStatus = 'expired';
        issues.push({ type: 'critical', message: `Policy expired on ${expirationDate}` });
      } else if (daysUntilExpiration <= 30) {
        insuranceStatus = 'expiring';
        issues.push({ type: 'warning', message: `Policy expiring in ${daysUntilExpiration} days` });
      }

      if (!glCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        if (glAmount === 0) {
          issues.push({ type: 'error', message: `General Liability not found (required ${formatCurrency(requirements.general_liability)})` });
        } else {
          issues.push({ type: 'error', message: `General Liability ${formatCurrency(glAmount)} below required ${formatCurrency(requirements.general_liability)}` });
        }
      }

      if (!autoCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        if (autoAmount === 0) {
          issues.push({ type: 'error', message: `Auto Liability not found (required ${formatCurrency(requirements.auto_liability)})` });
        } else {
          issues.push({ type: 'error', message: `Auto Liability ${formatCurrency(autoAmount)} below required ${formatCurrency(requirements.auto_liability)}` });
        }
      }

      if (!wcCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: 'Workers Compensation is required but not found' });
      }

      if (!elCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        if (elAmount === 0) {
          issues.push({ type: 'error', message: `Employers Liability not found (required ${formatCurrency(requirements.employers_liability)})` });
        } else {
          issues.push({ type: 'error', message: `Employers Liability ${formatCurrency(elAmount)} below required ${formatCurrency(requirements.employers_liability)}` });
        }
      }

      if (!aiCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: 'Additional Insured endorsement required but not found' });
      }

      if (!wosCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: 'Waiver of Subrogation required but not found' });
      }

      // Create tenant record
      setProcessingStatus('Creating tenant...');

      // Generate upload token
      const uploadToken = crypto.randomUUID();
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);

      const tenantData = {
        user_id: user.id,
        property_id: propertyId,
        name: tenantName.trim(),
        email: tenantEmail.trim() || null,
        phone: tenantPhone.trim() || null,

        // COI data
        policy_document_path: uploadedFilePath,
        policy_expiration_date: expirationDate,
        insurance_company: raw.insuranceCompany || null,
        policy_general_liability: glAmount,
        policy_general_liability_aggregate: glAggregate,
        policy_auto_liability: autoAmount,
        policy_workers_comp: wcAmount ? String(wcAmount) : null,
        policy_employers_liability: elAmount,
        policy_coverage: {
          generalLiability: raw.generalLiability ? { amount: glAmount, aggregate: glAggregate } : null,
          autoLiability: raw.autoLiability ? { amount: autoAmount } : null,
          workersComp: raw.workersComp ? { amount: wcAmount } : null,
          employersLiability: raw.employersLiability ? { amount: elAmount } : null,
          additionalCoverages: additionalCoverages
        },

        // Lease requirements
        required_general_liability: requirements.general_liability,
        required_auto_liability: requirements.auto_liability,
        required_workers_comp: requirements.workers_comp,
        required_employers_liability: requirements.employers_liability,
        requires_additional_insured: requirements.additional_insured,

        // Compliance
        insurance_status: insuranceStatus,
        insurance_issues: issues.length > 0 ? issues : null,
        compliance_issues: issues.length > 0 ? issues.map(i => i.message) : null,
        has_additional_insured: hasAdditionalInsured,
        has_waiver_of_subrogation: hasWaiverOfSubrogation,
        policy_additional_insured: raw.additionalInsured || null,

        // Upload token
        upload_token: uploadToken,
        upload_token_expires_at: tokenExpiry.toISOString(),
        coi_uploaded_at: new Date().toISOString(),
        policy_uploaded_at: new Date().toISOString(),
        raw_policy_data: raw,

        status: 'active'
      };

      const { data: newTenant, error: insertError } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();

      if (insertError) throw new Error(insertError.message || 'Failed to create tenant');

      // Log activity
      try {
        await supabase.from('tenant_activity').insert({
          tenant_id: newTenant.id,
          user_id: user.id,
          activity_type: 'tenant_created',
          description: `Tenant created with COI upload: ${tenantData.name}`,
          metadata: { source: 'coi_upload', insurance_status: insuranceStatus, coi_document: uploadedFilePath }
        });
      } catch (activityErr) {
        logger.warn('Failed to log activity:', activityErr);
      }

      setResult({
        tenant: newTenant,
        status: insuranceStatus,
        issues,
        coverage: {
          generalLiability: glAmount,
          generalLiabilityAggregate: glAggregate,
          autoLiability: autoAmount,
          workersComp: wcAmount,
          employersLiability: elAmount,
          additionalInsured: hasAdditionalInsured,
          waiverOfSubrogation: hasWaiverOfSubrogation,
          expirationDate,
          additionalCoverages
        },
        companyName: raw.companyName || tenantName
      });
      setStep(STEPS.RESULT);

    } catch (err) {
      logger.error('Tenant COI upload error:', err);
      setError(err.message || 'Failed to process upload');

      // Cleanup orphaned file
      if (uploadedFilePath) {
        try {
          await supabase.storage.from('coi-documents').remove([uploadedFilePath]);
        } catch (cleanupErr) {
          logger.error('Failed to cleanup orphaned file', cleanupErr);
        }
      }

      setStep(STEPS.ERROR);
    }
  };

  const handleFinish = () => {
    onTenantCreated?.(result?.tenant);
    handleClose();
  };

  if (!isOpen) return null;

  const selectedProp = properties.find(p => p.id === propertyId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === STEPS.DETAILS && 'Add Tenant'}
              {step === STEPS.UPLOAD && 'Upload COI'}
              {step === STEPS.PROCESSING && 'Processing COI'}
              {step === STEPS.RESULT && 'Tenant Added'}
              {step === STEPS.ERROR && 'Upload Error'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === STEPS.DETAILS && 'Enter tenant details and lease requirements'}
              {step === STEPS.UPLOAD && 'Upload the tenant\'s Certificate of Insurance'}
              {step === STEPS.PROCESSING && processingStatus}
              {step === STEPS.RESULT && 'COI has been processed and tenant created'}
              {step === STEPS.ERROR && 'Something went wrong'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">

          {/* Step 1: Details & Requirements */}
          {step === STEPS.DETAILS && (
            <div className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Tenant Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tenant Name *</label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Company or Tenant Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail size={14} className="inline mr-1" />Email
                  </label>
                  <input
                    type="email"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="tenant@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone size={14} className="inline mr-1" />Phone
                  </label>
                  <input
                    type="tel"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Property */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 size={14} className="inline mr-1" />Property *
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select a property...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Unit Number */}
              {propertyId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Home size={14} className="inline mr-1" />Unit Number (Optional)
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

              {/* Lease Requirements */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-900 mb-3">
                  <Shield size={14} className="inline mr-1" />Lease Requirements
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">General Liability</label>
                    <select
                      value={requirements.general_liability}
                      onChange={(e) => setRequirements(r => ({ ...r, general_liability: parseInt(e.target.value) }))}
                      className="w-full px-2 py-1.5 text-sm border border-purple-300 rounded-lg bg-white"
                    >
                      {COVERAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">Auto Liability</label>
                    <select
                      value={requirements.auto_liability}
                      onChange={(e) => setRequirements(r => ({ ...r, auto_liability: parseInt(e.target.value) }))}
                      className="w-full px-2 py-1.5 text-sm border border-purple-300 rounded-lg bg-white"
                    >
                      {COVERAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">Employers Liability</label>
                    <select
                      value={requirements.employers_liability}
                      onChange={(e) => setRequirements(r => ({ ...r, employers_liability: parseInt(e.target.value) }))}
                      className="w-full px-2 py-1.5 text-sm border border-purple-300 rounded-lg bg-white"
                    >
                      {COVERAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">Workers Comp</label>
                    <select
                      value={requirements.workers_comp ? '1' : '0'}
                      onChange={(e) => setRequirements(r => ({ ...r, workers_comp: e.target.value === '1' }))}
                      className="w-full px-2 py-1.5 text-sm border border-purple-300 rounded-lg bg-white"
                    >
                      <option value="0">Not Required</option>
                      <option value="1">Required</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">Additional Insured</label>
                    <select
                      value={requirements.additional_insured ? '1' : '0'}
                      onChange={(e) => setRequirements(r => ({ ...r, additional_insured: e.target.value === '1' }))}
                      className="w-full px-2 py-1.5 text-sm border border-purple-300 rounded-lg bg-white"
                    >
                      <option value="1">Required</option>
                      <option value="0">Not Required</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">Waiver of Subrogation</label>
                    <select
                      value={requirements.waiver_of_subrogation ? '1' : '0'}
                      onChange={(e) => setRequirements(r => ({ ...r, waiver_of_subrogation: e.target.value === '1' }))}
                      className="w-full px-2 py-1.5 text-sm border border-purple-300 rounded-lg bg-white"
                    >
                      <option value="0">Not Required</option>
                      <option value="1">Required</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={!tenantName.trim() || !propertyId}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Upload
              </button>

              <div className="text-center">
                <button
                  onClick={() => { handleClose(); onManualAdd?.(); }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip - Add tenant manually without COI
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === STEPS.UPLOAD && (
            <div>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} className="text-purple-600" />
                  <span className="font-semibold text-purple-900">Tenant Insurance</span>
                </div>
                <p className="text-sm text-purple-700">
                  {selectedProp?.name} {unitNumber && `• Unit ${unitNumber}`}
                </p>
                <p className="text-sm text-purple-700 font-medium">{tenantName}</p>
                {tenantEmail && (
                  <p className="text-xs mt-1 text-purple-600">
                    <Mail size={12} className="inline mr-1" />{tenantEmail}
                  </p>
                )}
                <div className="mt-2 pt-2 border-t border-purple-200 text-xs text-purple-700 space-y-0.5">
                  {requirements.general_liability > 0 && <p>GL: {formatCurrency(requirements.general_liability)} min</p>}
                  {requirements.auto_liability > 0 && <p>Auto: {formatCurrency(requirements.auto_liability)} min</p>}
                  {requirements.workers_comp && <p>Workers Comp: Required</p>}
                  {requirements.employers_liability > 0 && <p>EL: {formatCurrency(requirements.employers_liability)} min</p>}
                  {requirements.additional_insured && <p>Additional Insured: Required</p>}
                  {requirements.waiver_of_subrogation && <p>Waiver of Subrogation: Required</p>}
                </div>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="tenant-coi-upload"
                />
                <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-emerald-500' : 'text-gray-400'}`} />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop the tenant's COI here
                </p>
                <p className="text-gray-500">or click to browse files</p>
                <p className="text-xs text-gray-400 mt-2">PDF files only, max 10MB</p>
              </div>

              <button
                onClick={() => setStep(STEPS.DETAILS)}
                className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium mt-4"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Processing Step */}
          {step === STEPS.PROCESSING && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
              <p className="text-lg font-medium text-gray-900 mb-2">Processing Certificate</p>
              <p className="text-sm text-gray-500">{processingStatus}</p>
            </div>
          )}

          {/* Error Step */}
          {step === STEPS.ERROR && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-500" size={32} />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">Upload Failed</p>
              <p className="text-sm text-red-600 mb-6">{error}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setError(null); setStep(STEPS.UPLOAD); }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => { handleClose(); onManualAdd?.(); }}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium"
                >
                  Add Manually
                </button>
              </div>
            </div>
          )}

          {/* Result Step */}
          {step === STEPS.RESULT && result && (
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

              <h3 className="text-xl font-bold text-gray-900 mb-2">Tenant Added!</h3>
              <p className="text-gray-600 mb-4">
                <span className="font-medium">{result.companyName}</span>
              </p>

              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                result.status === 'compliant' ? 'bg-emerald-100 text-emerald-800' :
                result.status === 'expired' ? 'bg-red-100 text-red-800' :
                result.status === 'expiring' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {result.status === 'compliant' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span className="font-medium capitalize">{result.status.replace('-', ' ')}</span>
              </div>

              {/* Coverages Found */}
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Coverages Found:</h4>
                <div className="space-y-1 text-sm">
                  {result.coverage.generalLiability > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">General Liability:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(result.coverage.generalLiability)}</span>
                    </div>
                  )}
                  {result.coverage.autoLiability > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Auto Liability:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(result.coverage.autoLiability)}</span>
                    </div>
                  )}
                  {result.coverage.workersComp && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Workers Comp:</span>
                      <span className="font-medium text-gray-900">
                        {result.coverage.workersComp === 'Statutory' ? 'Statutory' : formatCurrency(result.coverage.workersComp)}
                      </span>
                    </div>
                  )}
                  {result.coverage.employersLiability > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employers Liability:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(result.coverage.employersLiability)}</span>
                    </div>
                  )}
                  {result.coverage.additionalCoverages && result.coverage.additionalCoverages.length > 0 &&
                    result.coverage.additionalCoverages.map((cov, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-600">{cov.type}:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(cov.amount)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Issues */}
              {result.issues && result.issues.length > 0 && (
                <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Issues Found:</h4>
                  <ul className="space-y-1">
                    {result.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleFinish}
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

export default TenantCOIUploadModal;
