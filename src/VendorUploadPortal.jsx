// VendorUploadPortal.jsx
// Public page for vendors to upload COI documents via unique link

import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, Shield } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Logo } from './Logo';

// Helper to determine vendor status from extracted data
function determineVendorStatus(vendorData) {
  const coverage = vendorData.coverage || {};

  // Check for expired coverages
  const hasExpired =
    coverage.generalLiability?.expired ||
    coverage.autoLiability?.expired ||
    coverage.workersComp?.expired ||
    coverage.employersLiability?.expired;

  if (hasExpired) return 'expired';

  // Check for expiring soon
  const hasExpiringSoon =
    coverage.generalLiability?.expiringSoon ||
    coverage.autoLiability?.expiringSoon ||
    coverage.workersComp?.expiringSoon ||
    coverage.employersLiability?.expiringSoon;

  if (hasExpiringSoon) return 'expiring';

  // Check compliance issues
  if (vendorData.issues && vendorData.issues.length > 0) {
    return 'non-compliant';
  }

  return 'compliant';
}

export function VendorUploadPortal({ token, onBack }) {
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadResult, setUploadResult] = useState(null); // { status, issues, coverage }

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
        .select('id, name, dba, status, expiration_date, upload_token, user_id')
        .eq('upload_token', token)
        .single();

      if (fetchError || !data) {
        setError('Invalid or expired upload link. Please contact the company that sent you this request.');
        return;
      }

      setVendor(data);
    } catch (err) {
      console.error('Error loading vendor:', err);
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
      alert('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
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

      // Call the extraction Edge Function
      const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-coi', {
        body: {
          pdfBase64: base64Data,
          requirements: {
            general_liability: 1000000,
            auto_liability: 1000000,
            workers_comp: 'Statutory',
            employers_liability: 500000,
            custom_coverages: []
          }
        }
      });

      let vendorStatus = 'compliant';
      let extractedData = {};

      if (extractionError) {
        console.warn('Extraction warning:', extractionError);
        // Continue without extraction - user will need to manually review
      } else if (extractionResult?.success && extractionResult?.data) {
        extractedData = extractionResult.data;

        // Add expiration checks
        const today = new Date();
        const parseLocalDate = (dateString) => {
          if (!dateString) return null;
          const [year, month, day] = dateString.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const checkCoverageExpiration = (coverage) => {
          if (coverage && coverage.expirationDate) {
            const expDate = parseLocalDate(coverage.expirationDate);
            if (expDate) {
              const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const daysUntil = Math.floor((expDate - todayLocal) / (1000 * 60 * 60 * 24));
              if (daysUntil < 0) {
                coverage.expired = true;
              } else if (daysUntil <= 30) {
                coverage.expiringSoon = true;
              }
            }
          }
        };

        // Check standard coverages
        if (extractedData.coverage) {
          checkCoverageExpiration(extractedData.coverage.generalLiability);
          checkCoverageExpiration(extractedData.coverage.autoLiability);
          checkCoverageExpiration(extractedData.coverage.workersComp);
          checkCoverageExpiration(extractedData.coverage.employersLiability);
        }

        vendorStatus = determineVendorStatus(extractedData);
      }

      // Step 3: Update vendor with extracted data
      setUploadStatus('Saving results...');

      // Build update object, only including expiration_date if we have a value
      const updateData = {
        status: vendorStatus,
        coverage: extractedData.coverage || null,
        issues: extractedData.issues || [],
        additional_coverages: extractedData.additionalCoverages || [],
        has_additional_insured: extractedData.hasAdditionalInsured || false,
        has_waiver_of_subrogation: extractedData.hasWaiverOfSubrogation || false,
        raw_data: {
          ...extractedData.rawData,
          documentPath: fileName
        },
        updated_at: new Date().toISOString()
      };

      // Only update expiration_date if we have a valid value
      if (extractedData.expirationDate) {
        updateData.expiration_date = extractedData.expirationDate;
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

      // Save result for display
      setUploadResult({
        status: vendorStatus,
        issues: extractedData.issues || [],
        coverage: extractedData.coverage || {}
      });
      setUploadSuccess(true);
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      alert(`Failed to upload file: ${err.message || err.error || 'Unknown error'}. Please try again.`);
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
    </div>
  );
}
