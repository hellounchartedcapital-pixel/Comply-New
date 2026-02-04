// VendorUploadPortal.jsx
// Public page for vendors to upload COI documents via unique link

import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, Shield } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Logo } from './Logo';
import { AlertModal, useAlertModal } from './AlertModal';
import { determineVendorStatus, checkCoverageExpiration as checkExpiration } from './utils/complianceUtils';
import logger from './logger';

export function VendorUploadPortal({ token, onBack }) {
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadResult, setUploadResult] = useState(null); // { status, issues, coverage }
  const { alertModal, showAlert, hideAlert } = useAlertModal();

  useEffect(() => {
    loadVendorFromToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadVendorFromToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch vendor by upload token
      const { data, error: fetchError } = await supabase
        .from('vendors')
        .select('id, name, dba, status, expiration_date, upload_token, upload_token_expires_at, user_id')
        .eq('upload_token', token)
        .single();

      if (fetchError || !data) {
        setError('Invalid or expired upload link. Please contact the company that sent you this request.');
        return;
      }

      // Check if token has expired
      if (data.upload_token_expires_at) {
        const expiresAt = new Date(data.upload_token_expires_at);
        if (expiresAt < new Date()) {
          setError('This upload link has expired. Please contact the company to request a new link.');
          return;
        }
      }

      // Fetch user's requirements settings
      const { data: userSettings } = await supabase
        .from('settings')
        .select('general_liability, auto_liability, workers_comp, employers_liability, additional_requirements, require_additional_insured, require_waiver_of_subrogation')
        .eq('user_id', data.user_id)
        .single();

      // Attach settings to vendor object for use during upload
      data.userSettings = userSettings;

      setVendor(data);
    } catch (err) {
      logger.error('Error loading vendor', err);
      setError('Failed to load vendor information.');
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
        details: 'Only PDF documents are accepted for Certificate of Insurance uploads.'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showAlert({
        type: 'warning',
        title: 'File Too Large',
        message: 'File size must be less than 10MB.',
        details: 'Please compress your PDF or contact the requesting company for assistance.'
      });
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading file...');

    try {
      // Step 1: Upload file to storage
      const fileName = `${vendor.user_id}/${vendor.id}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Step 2: Extract COI data using AI
      setUploadStatus('Analyzing your COI...');

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

      // Build requirements from user's settings
      const userSettings = vendor.userSettings || {};

      // Decode custom coverages from additional_requirements if present
      const customCoverages = [];
      if (userSettings.additional_requirements && Array.isArray(userSettings.additional_requirements)) {
        userSettings.additional_requirements.forEach(item => {
          if (typeof item === 'string' && item.startsWith('__COVERAGE__')) {
            try {
              const coverageData = JSON.parse(item.replace('__COVERAGE__', ''));
              customCoverages.push(coverageData);
            } catch (e) {
              // Skip invalid entries
            }
          }
        });
      }

      const requirements = {
        general_liability: userSettings.general_liability || 1000000,
        auto_liability: userSettings.auto_liability || 1000000,
        workers_comp: userSettings.workers_comp || 'Statutory',
        employers_liability: userSettings.employers_liability || 500000,
        custom_coverages: customCoverages,
        require_additional_insured: userSettings.require_additional_insured || false,
        require_waiver_of_subrogation: userSettings.require_waiver_of_subrogation || false
      };

      // Call the extraction Edge Function with token for server-side validation
      const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-coi', {
        body: {
          pdfBase64: base64Data,
          requirements: requirements,
          uploadToken: token // Server-side validation of token expiry
        }
      });

      let vendorStatus = 'compliant';
      let extractedData = {};
      let extractionWarning = null;

      if (extractionError) {
        // Log the error but continue - mark as pending review
        logger.error('COI extraction failed', extractionError);
        extractionWarning = 'We could not automatically analyze your certificate. It has been uploaded for manual review.';
        vendorStatus = 'non-compliant';
        extractedData.issues = extractedData.issues || [];
        extractedData.issues.push('Certificate requires manual review - automatic extraction failed');
      } else if (extractionResult?.success && extractionResult?.data) {
        extractedData = extractionResult.data;

        // Add expiration checks using shared utility
        const updateCoverageFlags = (coverage) => {
          if (coverage && coverage.expirationDate) {
            const result = checkExpiration(coverage);
            coverage.expired = result.expired;
            coverage.expiringSoon = result.expiringSoon;
          }
        };

        // Check standard coverages
        if (extractedData.coverage) {
          updateCoverageFlags(extractedData.coverage.generalLiability);
          updateCoverageFlags(extractedData.coverage.autoLiability);
          updateCoverageFlags(extractedData.coverage.workersComp);
          updateCoverageFlags(extractedData.coverage.employersLiability);
        }

        // Check for additional insured / waiver of subrogation requirements
        // Helper to check if issue already exists (handles both string and object formats)
        const hasIssue = (issues, message) => {
          return issues.some(i => (typeof i === 'string' ? i : i.message) === message);
        };

        if (requirements.require_additional_insured && !extractedData.hasAdditionalInsured) {
          extractedData.issues = extractedData.issues || [];
          if (!hasIssue(extractedData.issues, 'Missing Additional Insured endorsement')) {
            extractedData.issues.push('Missing Additional Insured endorsement');
          }
        }
        if (requirements.require_waiver_of_subrogation && !extractedData.hasWaiverOfSubrogation) {
          extractedData.issues = extractedData.issues || [];
          if (!hasIssue(extractedData.issues, 'Missing Waiver of Subrogation endorsement')) {
            extractedData.issues.push('Missing Waiver of Subrogation endorsement');
          }
        }

        vendorStatus = determineVendorStatus(extractedData);
      }

      // Step 3: Update vendor with extracted data
      setUploadStatus('Saving results...');

      // Build update object, only including fields if we have valid values
      const updateData = {
        status: vendorStatus,
        updated_at: new Date().toISOString()
      };

      // Only include fields that have values (avoid null constraint violations)
      if (extractedData.coverage) {
        updateData.coverage = extractedData.coverage;
      }
      if (extractedData.issues && extractedData.issues.length > 0) {
        // Normalize issues to strings before saving
        updateData.issues = extractedData.issues.map(issue =>
          typeof issue === 'string' ? issue : (issue?.message || issue?.description || JSON.stringify(issue))
        );
      }
      if (extractedData.expirationDate) {
        updateData.expiration_date = extractedData.expirationDate;
      }
      if (extractedData.additionalCoverages && extractedData.additionalCoverages.length > 0) {
        updateData.additional_coverages = extractedData.additionalCoverages;
      }
      if (extractedData.hasAdditionalInsured !== undefined) {
        updateData.has_additional_insured = extractedData.hasAdditionalInsured;
      }
      if (extractedData.hasWaiverOfSubrogation !== undefined) {
        updateData.has_waiver_of_subrogation = extractedData.hasWaiverOfSubrogation;
      }
      if (extractedData.rawData || fileName) {
        updateData.raw_data = {
          ...(extractedData.rawData || {}),
          documentPath: fileName
        };
      }

      const { error: updateError } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      // Log the activity
      await supabase.from('vendor_activity').insert({
        vendor_id: vendor.id,
        user_id: vendor.user_id,
        activity_type: 'coi_uploaded',
        description: `Vendor uploaded a new COI via upload portal. Status: ${vendorStatus}`,
        metadata: { fileName, fileSize: file.size, status: vendorStatus }
      });

      // Save result for display - normalize issues to strings
      const normalizedIssues = (extractedData.issues || []).map(issue =>
        typeof issue === 'string' ? issue : (issue?.message || issue?.description || JSON.stringify(issue))
      );
      setUploadResult({
        status: vendorStatus,
        issues: normalizedIssues,
        coverage: extractedData.coverage || {},
        extractionWarning: extractionWarning
      });
      setUploadSuccess(true);
    } catch (err) {
      logger.error('Upload error', err);
      logger.error('Error details', { error: err });
      showAlert({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload your certificate.',
        details: `${err.message || err.error || 'Unknown error'}. Please try again or contact the requesting company for assistance.`
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
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
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
              isCompliant ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {isCompliant ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              COI Uploaded Successfully!
            </h1>
          </div>

          {/* Extraction Warning (if extraction failed) */}
          {uploadResult?.extractionWarning && (
            <div className="rounded-lg p-4 mb-4 bg-blue-50 border border-blue-200">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> {uploadResult.extractionWarning}
              </p>
            </div>
          )}

          {/* Compliance Status */}
          <div className={`rounded-lg p-4 mb-6 ${
            isCompliant
              ? 'bg-green-50 border border-green-200'
              : isExpired
                ? 'bg-red-50 border border-red-200'
                : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`font-medium ${
              isCompliant
                ? 'text-green-800'
                : isExpired
                  ? 'text-red-800'
                  : 'text-yellow-800'
            }`}>
              {isCompliant && '✓ Your COI meets all requirements!'}
              {isExpired && '⚠ Your COI has expired coverage'}
              {isExpiring && '⚠ Your COI has coverage expiring soon'}
              {!isCompliant && !isExpired && !isExpiring && '⚠ Your COI has compliance issues'}
            </p>
          </div>

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
                    <span>One or more coverage types have expired. Please provide a COI with current coverage dates.</span>
                  </li>
                )}
                {isExpiring && !isExpired && (
                  <li className="flex items-start space-x-2 text-yellow-700">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>One or more coverage types will expire within 30 days. Please provide an updated COI when renewed.</span>
                  </li>
                )}
                {issues.map((issue, index) => {
                  // Ensure issue is a string (Edge Function might return objects)
                  const issueText = typeof issue === 'string'
                    ? issue
                    : (issue?.message || issue?.description || JSON.stringify(issue));
                  return (
                    <li key={index} className="flex items-start space-x-2 text-gray-700">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{issueText}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-medium text-gray-900 mb-2">What happens next?</h2>
            {isCompliant ? (
              <p className="text-sm text-gray-600">
                The requesting company has been notified and your COI is now on file. No further action is needed.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                The requesting company has been notified of your upload. Please work with your insurance provider to address the issues above and upload an updated COI using the same link.
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
          {/* Vendor Info */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Upload Certificate of Insurance</h1>
                <p className="text-gray-600">for {vendor.name}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                A company you work with has requested an updated Certificate of Insurance (COI).
                Please upload your current COI document below.
              </p>
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
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-400'
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
                <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">{uploadStatus || 'Processing...'}</p>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag and drop your COI here
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
            <p>Need help? Contact the company that sent you this request.</p>
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
