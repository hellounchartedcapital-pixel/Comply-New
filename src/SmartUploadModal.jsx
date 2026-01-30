// SmartUploadModal.jsx - Unified upload modal that auto-detects vendor vs tenant COIs
import React, { useState, useEffect } from 'react';
import {
  X, Upload, Loader2, CheckCircle, AlertCircle,
  Building2, Home, FileCheck, Users, Sparkles
} from 'lucide-react';
import { supabase } from './supabaseClient';

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
  selectedProperty,
  userRequirements
}) {
  const [step, setStep] = useState(1); // 1: upload, 2: detecting, 3: configure, 4: result
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  // Detection results
  const [detectedType, setDetectedType] = useState(null); // 'vendor' or 'tenant'
  const [extractedData, setExtractedData] = useState(null);

  // Tenant-specific fields (if detected as tenant)
  const [tenantPropertyId, setTenantPropertyId] = useState('');
  const [tenantUnitId, setTenantUnitId] = useState('');
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Result
  const [result, setResult] = useState(null);

  // File reference for later processing
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingFilePath, setPendingFilePath] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDetectedType(null);
      setExtractedData(null);
      setResult(null);
      setError(null);
      setTenantPropertyId('');
      setTenantUnitId('');
      setPendingFile(null);
      setPendingFilePath(null);
    }
  }, [isOpen]);

  // Load units when property changes
  useEffect(() => {
    if (tenantPropertyId) {
      loadUnits(tenantPropertyId);
    } else {
      setUnits([]);
      setTenantUnitId('');
    }
  }, [tenantPropertyId]);

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
      console.error('Error loading units:', err);
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
    setStep(2);
    setUploadStatus('Uploading document...');
    setError(null);
    setPendingFile(file);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 1: Upload file to storage
      const tempId = crypto.randomUUID();
      const fileName = `smart-upload/${user.id}/${tempId}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      setPendingFilePath(fileName);

      // Step 2: AI Analysis to detect document type
      setUploadStatus('AI analyzing document type...');

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

      // Call extraction Edge Function with auto-detect mode
      const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-coi', {
        body: {
          pdfBase64: base64Data,
          requirements: userRequirements || {},
          autoDetectType: true // Signal to detect document type
        }
      });

      if (extractionError) {
        console.error('Extraction error:', extractionError);
        throw new Error('Failed to analyze document');
      }

      if (!extractionResult?.success) {
        throw new Error(extractionResult?.error || 'Failed to extract document data');
      }

      setExtractedData(extractionResult.data);

      // Detect document type based on extracted data
      // Tenant/Renter's insurance typically has:
      // - Lower coverage amounts (usually < $500k)
      // - Personal Liability or Renter's coverage
      // - No business auto, workers comp
      // - Individual name vs company name

      const data = extractionResult.data;
      const glAmount = data.coverage?.generalLiability?.amount || 0;
      const hasWorkersComp = data.coverage?.workersComp?.amount && data.coverage?.workersComp?.amount !== 'N/A';
      const hasAutoLiability = data.coverage?.autoLiability?.amount && data.coverage?.autoLiability?.amount > 0;
      const hasUmbrella = data.coverage?.umbrella?.amount && data.coverage?.umbrella?.amount > 0;

      // Heuristics for detection:
      // - Commercial COIs typically have higher GL ($1M+), auto liability, workers comp
      // - Renter's insurance typically has lower GL ($100k-$300k), no auto/workers comp
      const isLikelyTenant = (
        glAmount > 0 && glAmount <= 500000 &&
        !hasWorkersComp &&
        !hasAutoLiability &&
        !hasUmbrella
      );

      const detectedDocType = isLikelyTenant ? 'tenant' : 'vendor';
      setDetectedType(detectedDocType);

      // If it's a vendor and we have a selected property, skip to processing
      if (detectedDocType === 'vendor' && selectedProperty) {
        await processVendorUpload(extractionResult.data, fileName, file);
      } else if (detectedDocType === 'tenant') {
        // Show property/unit selection for tenant
        setStep(3);
        setUploading(false);
      } else {
        // Vendor without selected property - show property selection
        setStep(3);
        setUploading(false);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process upload');
      setStep(1);
      setUploading(false);
    }
  };

  const processVendorUpload = async (data, filePath, file) => {
    setUploading(true);
    setUploadStatus('Creating vendor record...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine compliance status
      let status = 'compliant';
      const issues = [];

      // Check general liability
      const glRequired = selectedProperty?.general_liability || userRequirements?.general_liability || 1000000;
      const glAmount = data.coverage?.generalLiability?.amount || 0;
      if (glAmount < glRequired) {
        issues.push({ type: 'coverage', message: `General Liability ${formatCurrency(glAmount)} is below required ${formatCurrency(glRequired)}` });
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
      }

      if (issues.length > 0 && status === 'compliant') {
        status = 'non-compliant';
      }

      // Generate upload token
      const uploadToken = crypto.randomUUID();
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);

      // Create vendor record
      const vendorData = {
        user_id: user.id,
        property_id: selectedProperty?.id || null,
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
      console.error('Vendor creation error:', err);
      setError(err.message || 'Failed to create vendor');
      setStep(1);
    } finally {
      setUploading(false);
    }
  };

  const processTenantUpload = async () => {
    setUploading(true);
    setStep(2);
    setUploadStatus('Creating tenant record...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Load default tenant settings
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const defaultLiability = settings?.tenant_default_liability_min || 100000;
      const requiresAdditionalInsured = settings?.tenant_default_requires_additional_insured !== false;

      // Check compliance
      const issues = [];
      let insuranceStatus = 'compliant';

      const liabilityAmount = extractedData?.coverage?.generalLiability?.amount || 0;
      if (liabilityAmount < defaultLiability) {
        issues.push(`Personal Liability ${formatCurrency(liabilityAmount)} is below required ${formatCurrency(defaultLiability)}`);
      }

      if (requiresAdditionalInsured && !extractedData?.additionalInsured) {
        issues.push('Additional Insured endorsement not found');
      }

      // Check expiration
      if (extractedData?.expirationDate) {
        const expDate = new Date(extractedData.expirationDate);
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
        name: extractedData?.name || extractedData?.companyName || 'New Tenant',
        email: '',
        phone: '',
        property_id: tenantPropertyId || null,
        unit_id: tenantUnitId || null,
        status: 'active',
        insurance_status: insuranceStatus,
        required_liability_min: defaultLiability,
        requires_additional_insured: requiresAdditionalInsured,
        additional_insured_text: settings?.tenant_default_additional_insured_text || '',
        certificate_holder_name: settings?.tenant_default_certificate_holder_name || '',
        certificate_holder_address: settings?.tenant_default_certificate_holder_address || '',
        cancellation_notice_days: settings?.tenant_default_cancellation_notice_days || 30,
        policy_expiration_date: extractedData?.expirationDate || null,
        policy_liability_amount: liabilityAmount,
        policy_coverage: extractedData?.coverage || null,
        policy_additional_insured: extractedData?.additionalInsured || null,
        has_additional_insured: !!extractedData?.additionalInsured,
        policy_document_path: pendingFilePath,
        compliance_issues: issues.length > 0 ? issues : null,
        raw_policy_data: extractedData?.rawData || null,
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
      console.error('Tenant creation error:', err);
      setError(err.message || 'Failed to create tenant');
      setStep(3);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = () => {
    if (detectedType === 'vendor') {
      processVendorUpload(extractedData, pendingFilePath, pendingFile);
    } else {
      processTenantUpload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={20} className="text-emerald-500" />
              Smart Upload
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 && 'Upload any insurance document'}
              {step === 2 && 'Analyzing document...'}
              {step === 3 && `Detected: ${detectedType === 'vendor' ? 'Vendor COI' : 'Tenant Insurance'}`}
              {step === 4 && 'Upload complete'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-emerald-800 font-medium mb-2">AI-Powered Detection</p>
                <p className="text-sm text-emerald-700">
                  Upload any insurance document and our AI will automatically detect if it's a vendor COI or tenant renter's insurance.
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
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag and drop insurance document
                </p>
                <p className="text-gray-500 mb-4">or click to browse files</p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileCheck size={16} />
                    Vendor COIs
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    Tenant Insurance
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {step === 2 && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">{uploadStatus}</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment...</p>
            </div>
          )}

          {/* Step 3: Configure */}
          {step === 3 && (
            <div>
              {/* Detection Result */}
              <div className={`rounded-xl p-4 mb-6 ${
                detectedType === 'vendor' ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    detectedType === 'vendor' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {detectedType === 'vendor'
                      ? <FileCheck size={20} className="text-blue-600" />
                      : <Users size={20} className="text-purple-600" />
                    }
                  </div>
                  <div>
                    <p className={`font-semibold ${
                      detectedType === 'vendor' ? 'text-blue-900' : 'text-purple-900'
                    }`}>
                      {detectedType === 'vendor' ? 'Vendor Certificate of Insurance' : 'Tenant Renter\'s Insurance'}
                    </p>
                    <p className={`text-sm ${
                      detectedType === 'vendor' ? 'text-blue-700' : 'text-purple-700'
                    }`}>
                      {extractedData?.name || extractedData?.companyName || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Extracted Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Extracted Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium text-gray-900">{extractedData?.name || extractedData?.companyName || 'Unknown'}</span>
                  </div>
                  {extractedData?.expirationDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expires</span>
                      <span className="font-medium text-gray-900">{extractedData.expirationDate}</span>
                    </div>
                  )}
                  {extractedData?.coverage?.generalLiability?.amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Liability Coverage</span>
                      <span className="font-medium text-gray-900">{formatCurrency(extractedData.coverage.generalLiability.amount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tenant: Property/Unit Selection */}
              {detectedType === 'tenant' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2 size={16} className="inline mr-2" />
                      Property (Optional)
                    </label>
                    <select
                      value={tenantPropertyId}
                      onChange={(e) => setTenantPropertyId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select property...</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {tenantPropertyId && (
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
                          value={tenantUnitId}
                          onChange={(e) => setTenantUnitId(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="">Select unit...</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.unit_number}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Wrong detection? */}
              <p className="text-xs text-gray-500 mb-4">
                Wrong detection? You can still proceed - the record can be adjusted later.
              </p>

              <button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Create {detectedType === 'vendor' ? 'Vendor' : 'Tenant'}
                  </>
                )}
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
                {result.status === 'expired' && <AlertCircle size={16} />}
                {result.status !== 'compliant' && result.status !== 'expired' && <AlertCircle size={16} />}
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
