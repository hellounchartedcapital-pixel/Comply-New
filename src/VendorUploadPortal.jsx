// VendorUploadPortal.jsx
// Public page for vendors to upload COI documents via unique link

import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, Shield } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Logo } from './Logo';

export function VendorUploadPortal({ token, onBack }) {
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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

    try {
      // Upload file to storage
      const fileName = `${vendor.user_id}/${vendor.id}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update vendor with new document path and reset status
      const { error: updateError } = await supabase
        .from('vendors')
        .update({
          raw_data: supabase.sql`COALESCE(raw_data, '{}'::jsonb) || jsonb_build_object('documentPath', ${fileName})`,
          status: 'pending_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor.id);

      if (updateError) throw updateError;

      // Log the activity
      await supabase.from('vendor_activity').insert({
        vendor_id: vendor.id,
        user_id: vendor.user_id,
        activity_type: 'coi_uploaded',
        description: 'Vendor uploaded a new COI via upload portal',
        metadata: { fileName, fileSize: file.size }
      });

      setUploadSuccess(true);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">COI Uploaded Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for uploading your Certificate of Insurance. The requesting company will review it shortly.
          </p>
          <p className="text-sm text-gray-500">You can close this window.</p>
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
                <p className="text-gray-600">Uploading your COI...</p>
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
