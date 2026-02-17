'use client';

import { useState, useCallback, useRef } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

type UploadState = 'idle' | 'validating' | 'uploading' | 'processing' | 'success' | 'error' | 'rate_limited';

interface PortalUploadClientProps {
  token: string;
  pmName: string;
}

export function PortalUploadClient({ token, pmName }: PortalUploadClientProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(async (file: File): Promise<string | null> => {
    // Check file type by extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are accepted.';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10 MB.';
    }

    // Check PDF magic bytes
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isPdf = PDF_MAGIC_BYTES.every((b, i) => bytes[i] === b);
    if (!isPdf) {
      return 'Invalid file format. Please upload a valid PDF file.';
    }

    return null;
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setUploadState('validating');
    setErrorMessage(null);

    // Client-side validation
    const validationError = await validateFile(file);
    if (validationError) {
      setUploadState('error');
      setErrorMessage(validationError);
      return;
    }

    // Upload the file
    setUploadState('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`/api/portal/${token}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        if (uploadRes.status === 429) {
          setUploadState('rate_limited');
          setErrorMessage(data.error || "You've reached the upload limit. Please try again later.");
          return;
        }
        throw new Error(data.error || 'Upload failed');
      }

      const { certificate_id } = await uploadRes.json();

      // Trigger extraction
      setUploadState('processing');
      const extractRes = await fetch(`/api/portal/${token}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificate_id }),
      });

      if (!extractRes.ok) {
        const data = await extractRes.json().catch(() => ({}));
        throw new Error(data.error || 'Processing failed');
      }

      setUploadState('success');
    } catch (err) {
      setUploadState('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'We had trouble processing your document. Please make sure it\'s a clear PDF and try again.'
      );
    }
  }, [token, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [handleUpload]);

  const handleRetry = useCallback(() => {
    setUploadState('idle');
    setErrorMessage(null);
  }, []);

  // Success state
  if (uploadState === 'success') {
    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Certificate Received</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
            Thank you! Your certificate has been received and will be reviewed by{' '}
            <span className="font-medium text-gray-700">{pmName}</span>.
            You&apos;ll be notified if any additional information is needed.
          </p>
        </div>
      </section>
    );
  }

  // Rate limited state
  if (uploadState === 'rate_limited') {
    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg className="h-7 w-7 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Limit Reached</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
            {errorMessage}
          </p>
        </div>
      </section>
    );
  }

  // Processing / uploading state
  if (uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'validating') {
    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4">
            <div className="h-12 w-12 mx-auto rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {uploadState === 'validating' && 'Validating...'}
            {uploadState === 'uploading' && 'Uploading...'}
            {uploadState === 'processing' && 'Processing your certificate...'}
          </h2>
          <p className="text-sm text-gray-500">
            {uploadState === 'processing'
              ? 'Our AI is extracting insurance data from your document. This may take a moment.'
              : 'Please wait while we handle your file.'}
          </p>
        </div>
      </section>
    );
  }

  // Idle or error state — show upload zone
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload Your Certificate
      </h2>

      {/* Error Banner */}
      {uploadState === 'error' && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
          <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
          <button
            onClick={handleRetry}
            className="text-sm text-red-600 hover:text-red-800 font-medium underline flex-shrink-0"
          >
            Try again
          </button>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-1">
          {isDragging ? 'Drop your PDF here' : 'Drag and drop your PDF here'}
        </p>
        <p className="text-xs text-gray-500 mb-4">or click to browse files</p>
        <button
          type="button"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          Select PDF File
        </button>
        <p className="text-xs text-gray-400 mt-4">PDF only, maximum 10 MB</p>
      </div>
    </section>
  );
}
