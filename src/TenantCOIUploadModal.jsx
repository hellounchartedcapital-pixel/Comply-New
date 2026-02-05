// TenantCOIUploadModal.jsx - Simplified tenant flow: Upload COI, manually enter requirements
import React, { useState, useCallback } from 'react';
import {
  X, Upload, FileText, Loader2, CheckCircle, AlertCircle,
  Building2, User, Shield, ArrowRight
} from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

const STEPS = {
  UPLOAD: 'upload',
  EXTRACTING: 'extracting',
  REVIEW: 'review',
  SAVING: 'saving',
  SUCCESS: 'success',
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

export function TenantCOIUploadModal({ isOpen, onClose, onTenantCreated, onManualAdd, properties = [] }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [coiStoragePath, setCoiStoragePath] = useState(null);

  // Extracted data from COI (editable)
  const [extractedData, setExtractedData] = useState({
    companyName: '',
    expirationDate: '',
    generalLiability: 0,
    generalLiabilityAggregate: 0,
    autoLiability: 0,
    workersComp: 'Statutory',
    employersLiability: 0,
    insuranceCompany: '',
    additionalInsured: 'no',
    waiverOfSubrogation: 'no',
    certificateHolder: ''
  });

  // Manual entry fields
  const [formData, setFormData] = useState({
    property_id: '',
    email: '',
    phone: '',
    // Requirements - user enters these manually
    required_general_liability: 1000000,
    required_auto_liability: 0,
    required_workers_comp: false,
    required_employers_liability: 0,
    // Certificate holder / additional insured names (user enters)
    certificate_holder_name: '',
    additional_insured_names: '',
    require_additional_insured: true,
    require_waiver_of_subrogation: false
  });

  // Created tenant for success display
  const [createdTenant, setCreatedTenant] = useState(null);

  const resetState = useCallback(() => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setError(null);
    setCoiStoragePath(null);
    setExtractedData({
      companyName: '',
      expirationDate: '',
      generalLiability: 0,
      generalLiabilityAggregate: 0,
      autoLiability: 0,
      workersComp: 'Statutory',
      employersLiability: 0,
      insuranceCompany: '',
      additionalInsured: 'no',
      waiverOfSubrogation: 'no',
      certificateHolder: ''
    });
    setFormData({
      property_id: '',
      email: '',
      phone: '',
      required_general_liability: 1000000,
      required_auto_liability: 0,
      required_workers_comp: false,
      required_employers_liability: 0,
      certificate_holder_name: '',
      additional_insured_names: '',
      require_additional_insured: true,
      require_waiver_of_subrogation: false
    });
    setCreatedTenant(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

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
      handleFileSelect(droppedFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = async (selectedFile) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setStep(STEPS.EXTRACTING);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage
      const fileName = `${user.id}/tenants/temp_${Date.now()}_coi.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, selectedFile, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Failed to upload COI document');
      }

      setCoiStoragePath(fileName);

      // Convert to base64 for extraction
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedFile);
      const base64Data = await base64Promise;

      // Call extract-coi edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('extract-coi', {
        body: { pdfBase64: base64Data }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to process COI');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to extract COI data');
      }

      const coiData = result.data;
      const rawData = coiData.rawData || {};

      // Populate extracted data for editing
      setExtractedData({
        companyName: coiData.name || rawData.companyName || '',
        expirationDate: coiData.expirationDate || '',
        generalLiability: coiData.coverage?.generalLiability?.amount || 0,
        generalLiabilityAggregate: coiData.coverage?.generalLiability?.aggregate || 0,
        autoLiability: coiData.coverage?.autoLiability?.amount || 0,
        workersComp: coiData.coverage?.workersComp?.amount || 'Statutory',
        employersLiability: coiData.coverage?.employersLiability?.amount || 0,
        insuranceCompany: coiData.insuranceCompany || rawData.insuranceCompany || '',
        additionalInsured: coiData.additionalInsured || rawData.additionalInsured || 'no',
        waiverOfSubrogation: coiData.waiverOfSubrogation || rawData.waiverOfSubrogation || 'no',
        certificateHolder: coiData.certificateHolder || rawData.certificateHolder || ''
      });

      setStep(STEPS.REVIEW);
    } catch (err) {
      logger.error('COI extraction error:', err);
      setError(err.message || 'Failed to extract data from COI');
      setStep(STEPS.ERROR);
    }
  };

  const handleSaveTenant = async () => {
    if (!formData.property_id) {
      setError('Please select a property');
      return;
    }

    if (!extractedData.companyName.trim()) {
      setError('Please enter the tenant/company name');
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setStep(STEPS.SAVING);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate compliance status
      const glCompliant = extractedData.generalLiability >= formData.required_general_liability;
      const autoCompliant = formData.required_auto_liability === 0 || extractedData.autoLiability >= formData.required_auto_liability;
      const wcCompliant = !formData.required_workers_comp || extractedData.workersComp === 'Statutory' || extractedData.workersComp > 0;
      const elCompliant = formData.required_employers_liability === 0 || extractedData.employersLiability >= formData.required_employers_liability;

      const hasAdditionalInsured = extractedData.additionalInsured?.toLowerCase() === 'yes';
      const aiCompliant = !formData.require_additional_insured || hasAdditionalInsured;

      const hasWaiverOfSubrogation = extractedData.waiverOfSubrogation?.toLowerCase() === 'yes';
      const wosCompliant = !formData.require_waiver_of_subrogation || hasWaiverOfSubrogation;

      // Check expiration
      const today = new Date();
      const expDate = new Date(extractedData.expirationDate);
      const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let insuranceStatus = 'compliant';
      const issues = [];

      if (daysUntilExpiration < 0) {
        insuranceStatus = 'expired';
        issues.push({ type: 'critical', message: `Policy expired on ${extractedData.expirationDate}` });
      } else if (daysUntilExpiration <= 30) {
        insuranceStatus = 'expiring';
        issues.push({ type: 'warning', message: `Policy expiring in ${daysUntilExpiration} days` });
      }

      if (!glCompliant && extractedData.generalLiability > 0) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: `General Liability ${formatCurrency(extractedData.generalLiability)} below required ${formatCurrency(formData.required_general_liability)}` });
      }

      if (!autoCompliant && formData.required_auto_liability > 0) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: `Auto Liability ${formatCurrency(extractedData.autoLiability)} below required ${formatCurrency(formData.required_auto_liability)}` });
      }

      if (!wcCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: 'Workers Compensation is required but not found' });
      }

      if (!elCompliant && formData.required_employers_liability > 0) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: `Employers Liability ${formatCurrency(extractedData.employersLiability)} below required ${formatCurrency(formData.required_employers_liability)}` });
      }

      if (!aiCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: 'Additional Insured endorsement required but not found' });
      }

      if (!wosCompliant) {
        if (insuranceStatus === 'compliant') insuranceStatus = 'non-compliant';
        issues.push({ type: 'error', message: 'Waiver of Subrogation required but not found' });
      }

      // Move COI to permanent location if we have a tenant name
      let permanentPath = coiStoragePath;
      if (coiStoragePath && coiStoragePath.includes('/temp_')) {
        const sanitizedName = extractedData.companyName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        permanentPath = coiStoragePath.replace('/temp_', `/${sanitizedName}_`);

        // Copy to new location (Supabase doesn't have rename)
        const { data: fileData } = await supabase.storage
          .from('coi-documents')
          .download(coiStoragePath);

        if (fileData) {
          await supabase.storage
            .from('coi-documents')
            .upload(permanentPath, fileData, { contentType: 'application/pdf', upsert: true });

          // Delete temp file
          await supabase.storage
            .from('coi-documents')
            .remove([coiStoragePath]);
        }
      }

      // Helper to safely convert to integer
      const toInt = (val) => {
        if (typeof val === 'number') return Math.floor(val);
        if (typeof val === 'string') {
          const parsed = parseInt(val.replace(/[^0-9]/g, ''), 10);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      // Helper to convert workers comp (can be "Statutory", "Included", or a number)
      const formatWorkersComp = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        return String(val);
      };

      // Create tenant record
      const tenantData = {
        user_id: user.id,
        property_id: formData.property_id,
        name: extractedData.companyName.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || null,

        // COI document and extracted coverage
        policy_document_path: permanentPath,
        policy_expiration_date: extractedData.expirationDate || null,
        insurance_company: extractedData.insuranceCompany || null,
        policy_general_liability: toInt(extractedData.generalLiability),
        policy_general_liability_aggregate: toInt(extractedData.generalLiabilityAggregate),
        policy_auto_liability: toInt(extractedData.autoLiability),
        policy_workers_comp: formatWorkersComp(extractedData.workersComp),
        policy_employers_liability: toInt(extractedData.employersLiability),

        // Requirements (user-entered)
        required_general_liability: toInt(formData.required_general_liability),
        required_auto_liability: toInt(formData.required_auto_liability),
        required_workers_comp: formData.required_workers_comp,
        required_employers_liability: toInt(formData.required_employers_liability),
        require_additional_insured: formData.require_additional_insured,
        require_waiver_of_subrogation: formData.require_waiver_of_subrogation,
        certificate_holder_name: formData.certificate_holder_name || null,
        additional_insured_names: formData.additional_insured_names || null,

        // Compliance
        insurance_status: insuranceStatus,
        insurance_issues: issues,
        has_additional_insured: hasAdditionalInsured,
        has_waiver_of_subrogation: hasWaiverOfSubrogation,
        coi_uploaded_at: new Date().toISOString()
      };

      const { data: newTenant, error: insertError } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to create tenant');
      }

      // Log activity
      try {
        await supabase.from('tenant_activity').insert({
          tenant_id: newTenant.id,
          user_id: user.id,
          activity_type: 'tenant_created',
          description: `Tenant created with COI upload: ${tenantData.name}`,
          metadata: {
            source: 'coi_upload',
            insurance_status: insuranceStatus,
            coi_document: permanentPath
          }
        });
      } catch (activityErr) {
        logger.warn('Failed to log activity:', activityErr);
      }

      setCreatedTenant({ ...newTenant, insurance_status: insuranceStatus, issues });
      setStep(STEPS.SUCCESS);
    } catch (err) {
      logger.error('Error saving tenant:', err);
      setError(err.message || 'Failed to save tenant');
      setStep(STEPS.REVIEW);
    }
  };

  const handleFinish = () => {
    onTenantCreated?.(createdTenant);
    handleClose();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === STEPS.UPLOAD && 'Add Tenant with COI'}
              {step === STEPS.EXTRACTING && 'Extracting COI Data'}
              {step === STEPS.REVIEW && 'Review & Set Requirements'}
              {step === STEPS.SAVING && 'Creating Tenant'}
              {step === STEPS.SUCCESS && 'Tenant Created'}
              {step === STEPS.ERROR && 'Extraction Error'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === STEPS.UPLOAD && 'Upload a Certificate of Insurance to get started'}
              {step === STEPS.EXTRACTING && 'AI is reading the certificate...'}
              {step === STEPS.REVIEW && 'Verify extracted data and set your requirements'}
              {step === STEPS.SAVING && 'Saving tenant information...'}
              {step === STEPS.SUCCESS && 'The tenant has been added to your system'}
              {step === STEPS.ERROR && 'Something went wrong'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Upload Step */}
          {step === STEPS.UPLOAD && (
            <div className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload className={`mx-auto mb-4 ${dragActive ? 'text-emerald-500' : 'text-gray-400'}`} size={48} />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop the tenant's COI here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to browse (PDF, max 10MB)
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="tenant-coi-upload"
                />
                <label
                  htmlFor="tenant-coi-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold cursor-pointer transition-colors"
                >
                  <FileText size={20} />
                  Select COI PDF
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => { handleClose(); onManualAdd?.(); }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip - Add tenant manually without COI
                </button>
              </div>
            </div>
          )}

          {/* Extracting Step */}
          {step === STEPS.EXTRACTING && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
              <p className="text-lg font-medium text-gray-900 mb-2">Analyzing Certificate</p>
              <p className="text-sm text-gray-500">
                Extracting company name, coverage amounts, and expiration date...
              </p>
              {file && (
                <p className="text-xs text-gray-400 mt-4">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
            </div>
          )}

          {/* Error Step */}
          {step === STEPS.ERROR && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-red-500" size={32} />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">Extraction Failed</p>
              <p className="text-sm text-red-600 mb-6">{error}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={resetState}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => { handleClose(); onManualAdd?.(); }}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium transition-colors"
                >
                  Add Manually
                </button>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === STEPS.REVIEW && (
            <div className="space-y-6">
              {/* Extracted Coverage - Editable */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="text-blue-600" size={20} />
                    <h3 className="font-semibold text-gray-900">Extracted from COI</h3>
                  </div>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Editable</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company/Tenant Name *
                    </label>
                    <input
                      type="text"
                      value={extractedData.companyName}
                      onChange={(e) => setExtractedData({ ...extractedData, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Company Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={extractedData.expirationDate}
                      onChange={(e) => setExtractedData({ ...extractedData, expirationDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Insurance Company
                    </label>
                    <input
                      type="text"
                      value={extractedData.insuranceCompany}
                      onChange={(e) => setExtractedData({ ...extractedData, insuranceCompany: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Insurance Co."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      General Liability (Per Occurrence)
                    </label>
                    <input
                      type="number"
                      value={extractedData.generalLiability}
                      onChange={(e) => setExtractedData({ ...extractedData, generalLiability: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="1000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      General Aggregate
                    </label>
                    <input
                      type="number"
                      value={extractedData.generalLiabilityAggregate}
                      onChange={(e) => setExtractedData({ ...extractedData, generalLiabilityAggregate: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="2000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto Liability
                    </label>
                    <input
                      type="number"
                      value={extractedData.autoLiability}
                      onChange={(e) => setExtractedData({ ...extractedData, autoLiability: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="1000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employers Liability
                    </label>
                    <input
                      type="number"
                      value={extractedData.employersLiability}
                      onChange={(e) => setExtractedData({ ...extractedData, employersLiability: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="500000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Insured?
                    </label>
                    <select
                      value={extractedData.additionalInsured}
                      onChange={(e) => setExtractedData({ ...extractedData, additionalInsured: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waiver of Subrogation?
                    </label>
                    <select
                      value={extractedData.waiverOfSubrogation}
                      onChange={(e) => setExtractedData({ ...extractedData, waiverOfSubrogation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Info & Property */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="text-gray-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Contact & Property</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="tenant@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property *
                    </label>
                    <select
                      value={formData.property_id}
                      onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select a property...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {p.address}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Requirements - Manual Entry */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="text-emerald-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Your Requirements</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Set the minimum coverage amounts you require from this tenant
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      General Liability Required
                    </label>
                    <select
                      value={formData.required_general_liability}
                      onChange={(e) => setFormData({ ...formData, required_general_liability: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {COVERAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auto Liability Required
                    </label>
                    <select
                      value={formData.required_auto_liability}
                      onChange={(e) => setFormData({ ...formData, required_auto_liability: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {COVERAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employers Liability Required
                    </label>
                    <select
                      value={formData.required_employers_liability}
                      onChange={(e) => setFormData({ ...formData, required_employers_liability: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {COVERAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.required_workers_comp}
                        onChange={(e) => setFormData({ ...formData, required_workers_comp: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">Workers' Comp Required</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-emerald-200 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.require_additional_insured}
                      onChange={(e) => setFormData({ ...formData, require_additional_insured: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Require Additional Insured Endorsement</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.require_waiver_of_subrogation}
                      onChange={(e) => setFormData({ ...formData, require_waiver_of_subrogation: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Require Waiver of Subrogation</span>
                  </label>
                </div>
              </div>

              {/* Certificate Holder & Additional Insured Names */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="text-amber-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Certificate Details</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the names that should appear on the certificate
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate Holder Name
                    </label>
                    <input
                      type="text"
                      value={formData.certificate_holder_name}
                      onChange={(e) => setFormData({ ...formData, certificate_holder_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Your Company Name, LLC"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Insured Name(s)
                    </label>
                    <textarea
                      value={formData.additional_insured_names}
                      onChange={(e) => setFormData({ ...formData, additional_insured_names: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Property Owner LLC&#10;Management Company Inc"
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">One name per line if multiple</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Saving Step */}
          {step === STEPS.SAVING && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
              <p className="text-lg font-medium text-gray-900 mb-2">Creating Tenant</p>
              <p className="text-sm text-gray-500">
                Saving tenant information and checking compliance...
              </p>
            </div>
          )}

          {/* Success Step */}
          {step === STEPS.SUCCESS && createdTenant && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-emerald-600" size={32} />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">Tenant Added Successfully</p>
                <p className="text-sm text-gray-600">
                  <strong>{createdTenant.name}</strong> has been added to your system
                </p>
              </div>

              {/* Compliance Summary */}
              <div className={`rounded-xl p-4 border ${
                createdTenant.insurance_status === 'compliant'
                  ? 'bg-emerald-50 border-emerald-200'
                  : createdTenant.insurance_status === 'expiring'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {createdTenant.insurance_status === 'compliant' ? (
                    <CheckCircle className="text-emerald-600" size={24} />
                  ) : (
                    <AlertCircle className={createdTenant.insurance_status === 'expiring' ? 'text-amber-600' : 'text-red-600'} size={24} />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      Status: {createdTenant.insurance_status === 'compliant' ? 'Compliant' :
                               createdTenant.insurance_status === 'expiring' ? 'Expiring Soon' :
                               createdTenant.insurance_status === 'expired' ? 'Expired' : 'Non-Compliant'}
                    </p>
                  </div>
                </div>

                {createdTenant.issues && createdTenant.issues.length > 0 && (
                  <div className="space-y-2">
                    {createdTenant.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-gray-600" />
                        <span className="text-gray-700">{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Coverage Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Coverage Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">General Liability:</span>
                    <span className="font-medium">{formatCurrency(extractedData.generalLiability)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auto Liability:</span>
                    <span className="font-medium">{formatCurrency(extractedData.autoLiability)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employers Liability:</span>
                    <span className="font-medium">{formatCurrency(extractedData.employersLiability)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-medium">{extractedData.expirationDate || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === STEPS.REVIEW && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={resetState}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Upload Different COI
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTenant}
                disabled={!formData.property_id || !extractedData.companyName.trim() || !formData.email}
                className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowRight size={18} />
                Create Tenant
              </button>
            </div>
          </div>
        )}

        {step === STEPS.SUCCESS && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
            <button
              onClick={handleFinish}
              className="px-8 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TenantCOIUploadModal;
