// LeaseUploadModal.jsx - Upload commercial lease to auto-extract tenant info and insurance requirements
import React, { useState, useCallback } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle, AlertCircle, Building2, User, Shield, Mail, ArrowRight, SkipForward } from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

const STEPS = {
  UPLOAD: 'upload',
  EXTRACTING: 'extracting',
  REVIEW: 'review',
  COI_UPLOAD: 'coi_upload',
  PROCESSING_COI: 'processing_coi',
  SUCCESS: 'success',
  ERROR: 'error'
};

export function LeaseUploadModal({ isOpen, onClose, onTenantCreated, onManualAdd, properties = [] }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [storagePath, setStoragePath] = useState(null);
  const [saving, setSaving] = useState(false);

  // Extracted/editable data from lease
  const [editedData, setEditedData] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Created tenant for COI upload step
  const [createdTenant, setCreatedTenant] = useState(null);

  // COI upload state
  const [coiFile, setCoiFile] = useState(null);
  const [coiDragActive, setCoiDragActive] = useState(false);

  const resetState = useCallback(() => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setError(null);
    setEditedData(null);
    setStoragePath(null);
    setSelectedPropertyId('');
    setContactEmail('');
    setSaving(false);
    setCreatedTenant(null);
    setCoiFile(null);
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
    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    // Validate file size (max 25MB for leases)
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File size must be less than 25MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setStep(STEPS.EXTRACTING);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to storage first
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('lease-documents')
        .upload(fileName, selectedFile, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Failed to upload lease document');
      }

      setStoragePath(fileName);

      // Call extract-lease edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('extract-lease', {
        body: { storagePath: fileName }
      });

      if (fnError) {
        logger.error('Extract lease function error:', fnError);
        throw new Error(fnError.message || 'Failed to process lease');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to extract lease data');
      }

      setEditedData(result.data);

      // Pre-fill contact email if found in lease
      setContactEmail(result.data?.tenant?.contactEmail || '');

      // Try to match property from extracted address
      if (result.data?.property?.address && properties.length > 0) {
        const extractedAddr = result.data.property.address.toLowerCase();
        const matchedProperty = properties.find(p =>
          p.address?.toLowerCase().includes(extractedAddr) ||
          extractedAddr.includes(p.address?.toLowerCase()) ||
          p.name?.toLowerCase() === result.data.property.name?.toLowerCase()
        );
        if (matchedProperty) {
          setSelectedPropertyId(matchedProperty.id);
        }
      }

      setStep(STEPS.REVIEW);
    } catch (err) {
      logger.error('Lease extraction error:', err);
      setError(err.message || 'Failed to extract data from lease');
      setStep(STEPS.ERROR);
    }
  };

  const handleSaveTenant = async () => {
    if (!editedData || !selectedPropertyId) {
      setError('Please select a property');
      return;
    }

    if (!contactEmail || !contactEmail.includes('@')) {
      setError('Please enter a valid contact email');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insuranceReqs = editedData.insuranceRequirements || {};

      // Build tenant data from extracted info
      const tenantData = {
        user_id: user.id,
        property_id: selectedPropertyId,
        name: editedData.tenant?.name || 'Unknown Tenant',
        email: contactEmail, // Use the editable email field
        phone: editedData.tenant?.contactPhone || null,
        contact_name: editedData.tenant?.contactName || null,
        suite_number: editedData.leaseDetails?.suite || null,
        square_footage: editedData.leaseDetails?.squareFootage || null,
        lease_start_date: editedData.leaseDetails?.leaseStartDate || null,
        lease_end_date: editedData.leaseDetails?.leaseEndDate || null,
        property_type: editedData.leaseDetails?.propertyType || 'office',
        lease_document_path: storagePath,

        // Insurance requirements from lease
        required_general_liability: insuranceReqs.generalLiability?.perOccurrence || 1000000,
        required_general_liability_aggregate: insuranceReqs.generalLiability?.generalAggregate || 2000000,
        required_auto_liability: insuranceReqs.autoLiability?.combinedSingleLimit || 1000000,
        required_workers_comp: insuranceReqs.workersComp?.required !== false,
        required_employers_liability: insuranceReqs.employersLiability?.eachAccident || 500000,
        required_umbrella: insuranceReqs.umbrellaExcessLiability?.required || false,
        required_umbrella_amount: insuranceReqs.umbrellaExcessLiability?.amount || null,
        required_property_insurance: insuranceReqs.propertyInsurance?.required || false,
        required_property_amount: insuranceReqs.propertyInsurance?.amount || null,
        required_professional_liability: insuranceReqs.professionalLiability?.required || false,
        required_professional_amount: insuranceReqs.professionalLiability?.amount || null,
        required_cyber_liability: insuranceReqs.cyberLiability?.required || false,
        required_cyber_amount: insuranceReqs.cyberLiability?.amount || null,

        // Additional requirements
        require_additional_insured: insuranceReqs.additionalRequirements?.landlordAsAdditionalInsured || false,
        require_waiver_of_subrogation: insuranceReqs.additionalRequirements?.waiverOfSubrogation || false,
        require_primary_noncontributory: insuranceReqs.additionalRequirements?.primaryNonContributory || false,
        require_30_day_cancellation: insuranceReqs.additionalRequirements?.thirtyDayCancellationNotice || false,

        // Certificate holder info
        certificate_holder_name: insuranceReqs.certificateHolder?.name || null,
        certificate_holder_address: insuranceReqs.certificateHolder?.address || null,

        // Compliance status starts as pending (no COI uploaded yet)
        insurance_status: 'pending',

        // Store raw extracted text for reference
        lease_insurance_text: editedData.rawInsuranceText || null
      };

      // Create tenant in database
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
          description: `Tenant created from lease extraction: ${tenantData.name}`,
          metadata: {
            source: 'lease_extraction',
            lease_document: storagePath
          }
        });
      } catch (activityErr) {
        logger.warn('Failed to log activity:', activityErr);
      }

      // Store created tenant and move to COI upload step
      setCreatedTenant(newTenant);
      setStep(STEPS.COI_UPLOAD);
    } catch (err) {
      logger.error('Error saving tenant:', err);
      setError(err.message || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  // COI Upload Handlers
  const handleCoiDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setCoiDragActive(true);
    } else if (e.type === 'dragleave') {
      setCoiDragActive(false);
    }
  };

  const handleCoiDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCoiDragActive(false);

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      handleCoiUpload(droppedFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleCoiFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleCoiUpload(selectedFile);
    }
  };

  const handleCoiUpload = async (selectedFile) => {
    if (!createdTenant) return;

    // Validate file
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('COI file size must be less than 10MB');
      return;
    }

    setCoiFile(selectedFile);
    setError(null);
    setStep(STEPS.PROCESSING_COI);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload COI to storage
      const coiFileName = `${user.id}/tenants/${createdTenant.id}/${Date.now()}_coi.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(coiFileName, selectedFile, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Failed to upload COI document');
      }

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

      // Build requirements from tenant data for COI extraction
      const requirements = {
        general_liability: createdTenant.required_general_liability || 1000000,
        auto_liability: createdTenant.required_auto_liability || 1000000,
        workers_comp: createdTenant.required_workers_comp ? 'Statutory' : 0,
        employers_liability: createdTenant.required_employers_liability || 500000
      };

      // Call extract-coi edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('extract-coi', {
        body: { pdfBase64: base64Data, requirements }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to process COI');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to extract COI data');
      }

      const coiData = result.data;

      // Update tenant with COI data
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          policy_document_path: coiFileName,
          policy_expiration_date: coiData.expirationDate,
          insurance_company: coiData.rawData?.insuranceCompany,
          policy_general_liability: coiData.coverage?.generalLiability?.amount,
          policy_auto_liability: coiData.coverage?.autoLiability?.amount,
          policy_workers_comp: coiData.coverage?.workersComp?.amount,
          policy_employers_liability: coiData.coverage?.employersLiability?.amount,
          insurance_status: coiData.status || 'compliant',
          insurance_issues: coiData.issues || [],
          coi_uploaded_at: new Date().toISOString()
        })
        .eq('id', createdTenant.id);

      if (updateError) {
        throw new Error('Failed to update tenant with COI data');
      }

      // Log activity
      try {
        await supabase.from('tenant_activity').insert({
          tenant_id: createdTenant.id,
          user_id: user.id,
          activity_type: 'coi_uploaded',
          description: `COI uploaded: ${coiData.status}`,
          metadata: {
            document_path: coiFileName,
            expiration_date: coiData.expirationDate,
            status: coiData.status
          }
        });
      } catch (activityErr) {
        logger.warn('Failed to log activity:', activityErr);
      }

      // Update created tenant with new data for success screen
      setCreatedTenant({
        ...createdTenant,
        insurance_status: coiData.status,
        policy_expiration_date: coiData.expirationDate
      });

      setStep(STEPS.SUCCESS);
    } catch (err) {
      logger.error('Error uploading COI:', err);
      setError(err.message || 'Failed to process COI');
      setStep(STEPS.COI_UPLOAD); // Go back to COI upload step
    }
  };

  const handleSkipCoi = () => {
    // Tenant already created with pending status, just finish
    onTenantCreated?.(createdTenant);
    handleClose();
  };

  const handleFinish = () => {
    onTenantCreated?.(createdTenant);
    handleClose();
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
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
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === STEPS.UPLOAD && 'Add Tenant from Lease'}
              {step === STEPS.EXTRACTING && 'Extracting Lease Data'}
              {step === STEPS.REVIEW && 'Review Extracted Data'}
              {step === STEPS.COI_UPLOAD && 'Upload Certificate of Insurance'}
              {step === STEPS.PROCESSING_COI && 'Processing COI'}
              {step === STEPS.SUCCESS && 'Tenant Created Successfully'}
              {step === STEPS.ERROR && 'Extraction Error'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === STEPS.UPLOAD && 'Upload a commercial lease to auto-fill tenant info and insurance requirements'}
              {step === STEPS.EXTRACTING && 'AI is reading your lease document...'}
              {step === STEPS.REVIEW && 'Verify the information and enter contact email'}
              {step === STEPS.COI_UPLOAD && 'Upload their COI now, or skip to request it later'}
              {step === STEPS.PROCESSING_COI && 'Analyzing certificate of insurance...'}
              {step === STEPS.SUCCESS && 'The tenant profile has been created'}
              {step === STEPS.ERROR && 'Something went wrong during extraction'}
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
                  Drop your lease PDF here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to browse (max 25MB)
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="lease-upload"
                />
                <label
                  htmlFor="lease-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold cursor-pointer transition-colors"
                >
                  <FileText size={20} />
                  Select Lease PDF
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
                  Skip - Add tenant manually instead
                </button>
              </div>
            </div>
          )}

          {/* Extracting Step */}
          {step === STEPS.EXTRACTING && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
              <p className="text-lg font-medium text-gray-900 mb-2">Analyzing Lease Document</p>
              <p className="text-sm text-gray-500">
                Extracting tenant information, property details, and insurance requirements...
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
          {step === STEPS.REVIEW && editedData && (
            <div className="space-y-6">
              {/* Tenant Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="text-gray-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Tenant Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">Company Name</label>
                    <p className="font-medium text-gray-900">{editedData.tenant?.name || 'Not found'}</p>
                  </div>
                  {editedData.tenant?.dba && (
                    <div>
                      <label className="text-gray-500">DBA</label>
                      <p className="font-medium text-gray-900">{editedData.tenant.dba}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-gray-500">Contact Name</label>
                    <p className="font-medium text-gray-900">{editedData.tenant?.contactName || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-gray-500">Phone</label>
                    <p className="font-medium text-gray-900">{editedData.tenant?.contactPhone || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Email - Editable */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="text-amber-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Contact Email <span className="text-red-500">*</span></h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Enter the email address to send COI requests to this tenant
                </p>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="tenant@company.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Property Selection */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Property Assignment</h3>
                </div>
                <div className="text-sm mb-3">
                  <p className="text-gray-500">Extracted Address:</p>
                  <p className="font-medium text-gray-900">
                    {editedData.property?.address || 'Not found'}
                    {editedData.leaseDetails?.suite && `, Suite ${editedData.leaseDetails.suite}`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Property <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select a property...</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.address}</option>
                    ))}
                  </select>
                </div>
                {editedData.leaseDetails?.suite && (
                  <div className="mt-3">
                    <label className="text-sm text-gray-500">Suite/Unit</label>
                    <p className="font-medium text-gray-900">{editedData.leaseDetails.suite}</p>
                  </div>
                )}
              </div>

              {/* Insurance Requirements */}
              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="text-emerald-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Insurance Requirements from Lease</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">General Liability (Per Occurrence)</label>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(editedData.insuranceRequirements?.generalLiability?.perOccurrence)}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">General Aggregate</label>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(editedData.insuranceRequirements?.generalLiability?.generalAggregate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">Auto Liability</label>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(editedData.insuranceRequirements?.autoLiability?.combinedSingleLimit)}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">Workers Comp</label>
                    <p className="font-medium text-gray-900">
                      {editedData.insuranceRequirements?.workersComp?.required !== false ? 'Required' : 'Not Required'}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">Employers Liability</label>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(editedData.insuranceRequirements?.employersLiability?.eachAccident)}
                    </p>
                  </div>
                  {editedData.insuranceRequirements?.umbrellaExcessLiability?.required && (
                    <div>
                      <label className="text-gray-500">Umbrella/Excess</label>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(editedData.insuranceRequirements.umbrellaExcessLiability.amount)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional Requirements */}
                <div className="mt-4 pt-4 border-t border-emerald-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Additional Requirements:</p>
                  <div className="flex flex-wrap gap-2">
                    {editedData.insuranceRequirements?.additionalRequirements?.landlordAsAdditionalInsured && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Additional Insured</span>
                    )}
                    {editedData.insuranceRequirements?.additionalRequirements?.waiverOfSubrogation && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Waiver of Subrogation</span>
                    )}
                    {editedData.insuranceRequirements?.additionalRequirements?.primaryNonContributory && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Primary & Non-Contributory</span>
                    )}
                    {editedData.insuranceRequirements?.additionalRequirements?.thirtyDayCancellationNotice && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">30-Day Cancellation Notice</span>
                    )}
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

          {/* COI Upload Step */}
          {step === STEPS.COI_UPLOAD && (
            <div className="space-y-6">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-emerald-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Tenant Profile Created</h3>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>{createdTenant?.name}</strong> has been added. Now you can upload their Certificate of Insurance.
                </p>
              </div>

              <div
                onDragEnter={handleCoiDrag}
                onDragLeave={handleCoiDrag}
                onDragOver={handleCoiDrag}
                onDrop={handleCoiDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  coiDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Shield className={`mx-auto mb-4 ${coiDragActive ? 'text-emerald-500' : 'text-gray-400'}`} size={48} />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Upload Certificate of Insurance
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Drop the tenant's COI here or click to browse
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleCoiFileChange}
                  className="hidden"
                  id="coi-upload"
                />
                <label
                  htmlFor="coi-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold cursor-pointer transition-colors"
                >
                  <Upload size={20} />
                  Select COI PDF
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">
                  <strong>Don't have their COI yet?</strong> You can skip this step and request it from the tenant later.
                  Their profile will show as "Pending" until a COI is uploaded.
                </p>
              </div>
            </div>
          )}

          {/* Processing COI Step */}
          {step === STEPS.PROCESSING_COI && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
              <p className="text-lg font-medium text-gray-900 mb-2">Analyzing Certificate of Insurance</p>
              <p className="text-sm text-gray-500">
                Extracting coverage details and checking compliance...
              </p>
              {coiFile && (
                <p className="text-xs text-gray-400 mt-4">
                  {coiFile.name}
                </p>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === STEPS.SUCCESS && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-600" size={32} />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">All Done!</p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>{createdTenant?.name}</strong> has been added with their COI.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  createdTenant?.insurance_status === 'compliant' ? 'text-emerald-600' :
                  createdTenant?.insurance_status === 'expiring' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {createdTenant?.insurance_status === 'compliant' ? 'Compliant' :
                   createdTenant?.insurance_status === 'expiring' ? 'Expiring Soon' :
                   'Non-Compliant'}
                </span>
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
              Upload Different Lease
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
                disabled={saving || !selectedPropertyId || !contactEmail}
                className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Creating...
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    Continue
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === STEPS.COI_UPLOAD && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSkipCoi}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors flex items-center gap-2"
            >
              <SkipForward size={18} />
              Skip for Now
            </button>
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

export default LeaseUploadModal;
