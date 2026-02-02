// TenantUploadPortal.jsx
// Public page for tenants to upload insurance documents via unique link

import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, Home } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Logo } from './Logo';
import { AlertModal, useAlertModal } from './AlertModal';
import { formatCurrency, checkCoverageExpiration as checkExpiration } from './utils/complianceUtils';

export function TenantUploadPortal({ token, onBack }) {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const { alertModal, showAlert, hideAlert } = useAlertModal();

  useEffect(() => {
    loadTenantFromToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadTenantFromToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tenant by upload token
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select(`
          id, name, email, status, insurance_status, upload_token, upload_token_expires_at, user_id,
          property_id, unit_id,
          required_liability_min, required_property_damage_min, required_auto_liability_min,
          required_workers_comp, workers_comp_exempt, required_employers_liability_min,
          requires_additional_insured, additional_insured_text,
          certificate_holder_name, certificate_holder_address,
          cancellation_notice_days, requires_declarations_page, requires_endorsement_pages,
          property:properties(id, name, address),
          unit:units(id, unit_number)
        `)
        .eq('upload_token', token)
        .single();

      if (fetchError || !data) {
        setError('Invalid or expired upload link. Please contact your property manager for a new link.');
        return;
      }

      // Check if token has expired
      if (data.upload_token_expires_at) {
        const expiresAt = new Date(data.upload_token_expires_at);
        if (expiresAt < new Date()) {
          setError('This upload link has expired. Please contact your property manager to request a new link.');
          return;
        }
      }

      setTenant(data);
    } catch (err) {
      console.error('Error loading tenant:', err);
      setError('Failed to load tenant information.');
    } finally {
      setLoading(false);
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
      showAlert({
        type: 'warning',
        title: 'Invalid File Type',
        message: 'Please upload a PDF file.',
        details: 'Only PDF documents are accepted for insurance uploads.'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert({
        type: 'warning',
        title: 'File Too Large',
        message: 'File size must be less than 10MB.',
        details: 'Please compress your PDF or contact your property manager for assistance.'
      });
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading file...');

    try {
      // Step 1: Upload file to storage
      const fileName = `tenants/${tenant.user_id}/${tenant.id}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Step 2: Extract policy data using AI
      setUploadStatus('Analyzing your insurance policy...');

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

      // Build requirements from tenant's specific lease requirements
      const requirements = {
        general_liability: tenant.required_liability_min || 100000,
        auto_liability: tenant.required_auto_liability_min || 0,
        workers_comp: tenant.required_workers_comp ? 'Statutory' : null,
        employers_liability: tenant.required_employers_liability_min || 0,
        require_additional_insured: tenant.requires_additional_insured || false,
        additional_insured_text: tenant.additional_insured_text || '',
        certificate_holder_name: tenant.certificate_holder_name || '',
        is_tenant_policy: true // Flag for edge function to handle renters insurance
      };

      // Call the extraction Edge Function (same one used for vendors)
      const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-coi', {
        body: {
          pdfBase64: base64Data,
          requirements: requirements
        }
      });

      let insuranceStatus = 'compliant';
      let extractedData = {};
      let issues = [];

      if (extractionError) {
        console.error('Extraction error:', extractionError);
        // Continue without extraction - will need manual review
      } else if (extractionResult?.success && extractionResult?.data) {
        extractedData = extractionResult.data;

        // Check coverage expiration and compliance using shared utility
        const updateCoverageFlags = (coverage) => {
          if (coverage && coverage.expirationDate) {
            const result = checkExpiration(coverage);
            coverage.expired = result.expired;
            coverage.expiringSoon = result.expiringSoon;
          }
        };

        if (extractedData.coverage) {
          updateCoverageFlags(extractedData.coverage.generalLiability);
          updateCoverageFlags(extractedData.coverage.autoLiability);
        }

        // Check liability coverage meets lease requirement
        const liabilityAmount = extractedData.coverage?.generalLiability?.amount || 0;
        if (tenant.required_liability_min > 0 && liabilityAmount < tenant.required_liability_min) {
          issues.push(`Personal Liability coverage ${formatCurrency(liabilityAmount)} is below the required ${formatCurrency(tenant.required_liability_min)}`);
        }

        // Check auto liability if required
        if (tenant.required_auto_liability_min > 0) {
          const autoAmount = extractedData.coverage?.autoLiability?.amount || 0;
          if (autoAmount < tenant.required_auto_liability_min) {
            issues.push(`Auto Liability coverage ${formatCurrency(autoAmount)} is below the required ${formatCurrency(tenant.required_auto_liability_min)}`);
          }
        }

        // Check additional insured requirement
        if (tenant.requires_additional_insured && tenant.additional_insured_text) {
          const additionalInsuredOnPolicy = (extractedData.additionalInsured || '').toLowerCase();

          // Check if policy has additional insured endorsement
          if (!additionalInsuredOnPolicy || additionalInsuredOnPolicy.length < 5) {
            issues.push('Additional Insured endorsement not found on policy');
          }
        }

        // Add any issues from extraction
        if (extractedData.issues) {
          extractedData.issues.forEach(issue => {
            const issueText = typeof issue === 'string' ? issue : (issue?.message || issue?.description || '');
            if (issueText && !issues.includes(issueText)) {
              issues.push(issueText);
            }
          });
        }

        // Determine final status
        if (extractedData.coverage?.generalLiability?.expired) {
          insuranceStatus = 'expired';
        } else if (extractedData.coverage?.generalLiability?.expiringSoon) {
          insuranceStatus = 'expiring';
        } else if (issues.length > 0) {
          insuranceStatus = 'non-compliant';
        } else {
          insuranceStatus = 'compliant';
        }
      }

      // Step 3: Update tenant with extracted data
      setUploadStatus('Saving results...');

      const updateData = {
        insurance_status: insuranceStatus,
        policy_uploaded_at: new Date().toISOString(),
        policy_document_path: fileName,
        updated_at: new Date().toISOString()
      };

      // Add extracted data if available
      if (extractedData.expirationDate) {
        updateData.policy_expiration_date = extractedData.expirationDate;
      }
      if (extractedData.coverage) {
        updateData.policy_coverage = extractedData.coverage;
        if (extractedData.coverage.generalLiability?.amount) {
          updateData.policy_liability_amount = extractedData.coverage.generalLiability.amount;
        }
        if (extractedData.coverage.autoLiability?.amount) {
          updateData.policy_auto_liability_amount = extractedData.coverage.autoLiability.amount;
        }
      }
      if (extractedData.additionalInsured) {
        updateData.policy_additional_insured = extractedData.additionalInsured;
        updateData.has_additional_insured = true;
      }
      if (extractedData.certificateHolder) {
        updateData.policy_certificate_holder = extractedData.certificateHolder;
      }
      if (extractedData.insuranceCompany) {
        updateData.insurance_company = extractedData.insuranceCompany;
      }
      if (extractedData.rawData) {
        updateData.raw_policy_data = extractedData.rawData;
      }
      if (issues.length > 0) {
        updateData.compliance_issues = issues;
      } else {
        updateData.compliance_issues = null;
      }

      const { error: updateError } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      // Log activity (using tenant's user_id since this is public portal)
      await supabase.from('tenant_activity').insert({
        tenant_id: tenant.id,
        user_id: tenant.user_id,
        activity_type: 'document_uploaded',
        description: `Insurance document uploaded via portal`,
        metadata: {
          status: insuranceStatus,
          issues: issues.length,
          hasAdditionalInsured: extractedData.hasAdditionalInsured || false,
          expirationDate: extractedData.expirationDate || null
        }
      });

      // Save result for display
      setUploadResult({
        status: insuranceStatus,
        issues: issues,
        coverage: extractedData.coverage || {},
        expirationDate: extractedData.expirationDate
      });
      setUploadSuccess(true);
    } catch (err) {
      console.error('Upload error:', err);
      showAlert({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload your insurance document.',
        details: `${err.message || err.error || 'Unknown error'}. Please try again or contact your property manager.`
      });
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link Not Valid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (uploadSuccess) {
    const isCompliant = uploadResult?.status === 'compliant';
    const isExpired = uploadResult?.status === 'expired';
    const isExpiring = uploadResult?.status === 'expiring';
    const issues = uploadResult?.issues || [];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
          {/* Status Icon */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isCompliant ? 'bg-emerald-100' : 'bg-yellow-100'
            }`}>
              {isCompliant ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Insurance Document Uploaded!
            </h1>
          </div>

          {/* Compliance Status */}
          <div className={`rounded-lg p-4 mb-6 ${
            isCompliant
              ? 'bg-emerald-50 border border-emerald-200'
              : isExpired
                ? 'bg-red-50 border border-red-200'
                : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`font-medium ${
              isCompliant
                ? 'text-emerald-800'
                : isExpired
                  ? 'text-red-800'
                  : 'text-yellow-800'
            }`}>
              {isCompliant && '✓ Your insurance meets all lease requirements!'}
              {isExpired && '⚠ Your insurance policy has expired'}
              {isExpiring && '⚠ Your insurance policy is expiring soon'}
              {!isCompliant && !isExpired && !isExpiring && '⚠ Your insurance has compliance issues'}
            </p>
          </div>

          {/* Policy Details */}
          {uploadResult?.coverage?.generalLiability && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="font-medium text-gray-900 mb-3">Policy Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Personal Liability:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(uploadResult.coverage.generalLiability?.amount || 0)}
                  </span>
                </div>
                {uploadResult.expirationDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(uploadResult.expirationDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Issues List */}
          {!isCompliant && (issues.length > 0 || isExpired || isExpiring) && (
            <div className="mb-6">
              <h2 className="font-medium text-gray-900 mb-3">
                {isExpired || isExpiring ? 'Action Required:' : 'Issues to Address:'}
              </h2>
              <ul className="space-y-2">
                {isExpired && (
                  <li className="flex items-start space-x-2 text-red-700">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Your policy has expired. Please provide current insurance documentation.</span>
                  </li>
                )}
                {isExpiring && !isExpired && (
                  <li className="flex items-start space-x-2 text-yellow-700">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>Your policy will expire within 30 days. Please provide updated documentation when renewed.</span>
                  </li>
                )}
                {issues.map((issue, index) => (
                  <li key={index} className="flex items-start space-x-2 text-gray-700">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-medium text-gray-900 mb-2">What happens next?</h2>
            {isCompliant ? (
              <p className="text-sm text-gray-600">
                Your property manager has been notified and your insurance is now on file. No further action is needed.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Your property manager has been notified. Please work with your insurance provider to address the issues above and upload an updated policy using the same link.
              </p>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">You can close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Logo size="default" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          {/* Tenant Info */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Home className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Upload Renters Insurance</h1>
                <p className="text-gray-600">for {tenant.name}</p>
              </div>
            </div>

            {/* Property Info */}
            {tenant.property && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Property:</span> {tenant.property.name}
                  {tenant.unit && ` • Unit ${tenant.unit.unit_number}`}
                </p>
                {tenant.property.address && (
                  <p className="text-sm text-gray-500">{tenant.property.address}</p>
                )}
              </div>
            )}

            {/* Requirements Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Lease Requirements:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                {tenant.required_liability_min > 0 && (
                  <li>• Personal Liability: minimum {formatCurrency(tenant.required_liability_min)}</li>
                )}
                {tenant.required_auto_liability_min > 0 && (
                  <li>• Auto Liability: minimum {formatCurrency(tenant.required_auto_liability_min)}</li>
                )}
                {tenant.requires_additional_insured && (
                  <li>• Property owner must be listed as Additional Insured</li>
                )}
                {tenant.requires_declarations_page && (
                  <li>• Declarations page required</li>
                )}
              </ul>
            </div>
          </div>

          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                <p className="text-gray-600">{uploadStatus || 'Processing...'}</p>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag and drop your insurance document here
                </p>
                <p className="text-gray-500 mb-4">or click to browse files</p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <FileText size={16} />
                  <span>PDF files only, max 10MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Need help? Contact your property manager.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
        <p>Powered by SmartCOI - AI-Powered Insurance Compliance</p>
      </footer>

      {/* Alert Modal */}
      <AlertModal {...alertModal} onClose={hideAlert} />
    </div>
  );
}
