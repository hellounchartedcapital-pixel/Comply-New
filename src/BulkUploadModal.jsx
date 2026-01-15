import React, { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle, Clock, XCircle, Loader } from 'lucide-react';

export function BulkUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [completedUploads, setCompletedUploads] = useState([]);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const addFiles = (files) => {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    const invalidFiles = files.filter(file => file.type !== 'application/pdf');
    const oversizedFiles = pdfFiles.filter(file => file.size > 10 * 1024 * 1024);
    const validFiles = pdfFiles.filter(file => file.size <= 10 * 1024 * 1024);

    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} non-PDF file(s) were skipped`);
    }

    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} file(s) exceed 10MB and were skipped`);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files || []);
    addFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(selectedFiles.map((file, index) => ({
      filename: file.name,
      status: 'pending',
      progress: 0,
      index
    })));
    setCompletedUploads([]);

    const successful = [];
    const failed = [];

    // Process files in batches of 3 to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (file, batchIndex) => {
          const fileIndex = i + batchIndex;

          try {
            // Update status to processing
            setUploadProgress(prev => prev.map((item, idx) =>
              idx === fileIndex
                ? { ...item, status: 'processing', progress: 25 }
                : item
            ));

            // Progress callback
            const progressCallback = (status) => {
              let progress = 25;
              if (status.includes('Sending to Claude')) progress = 50;
              if (status.includes('Extracting data')) progress = 75;
              if (status.includes('Saving')) progress = 90;

              setUploadProgress(prev => prev.map((item, idx) =>
                idx === fileIndex
                  ? { ...item, progress, statusText: status }
                  : item
              ));
            };

            // Upload and extract
            await onUploadComplete(file, progressCallback);

            // Success
            setUploadProgress(prev => prev.map((item, idx) =>
              idx === fileIndex
                ? { ...item, status: 'success', progress: 100 }
                : item
            ));
            successful.push(file.name);

          } catch (err) {
            // Failure
            setUploadProgress(prev => prev.map((item, idx) =>
              idx === fileIndex
                ? { ...item, status: 'failed', progress: 0, error: err.message }
                : item
            ));
            failed.push({ name: file.name, error: err.message });
          }
        })
      );
    }

    setUploading(false);
    setCompletedUploads({ successful, failed });

    // Show results summary
    if (failed.length === 0) {
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadProgress([]);
        setCompletedUploads([]);
        onClose();
      }, 3000);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setError(null);
      setUploadProgress([]);
      setCompletedUploads([]);
      onClose();
    }
  };

  const dropZoneClass = `border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
    dragActive
      ? 'border-green-500 bg-green-50'
      : 'border-gray-300 hover:border-gray-400'
  }`;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-gray-400" />;
      case 'processing':
        return <Loader size={16} className="text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full p-4 sm:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Bulk Upload COIs</h3>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {selectedFiles.length === 0 ? (
          <div
            className={dropZoneClass}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto text-gray-400 mb-3 sm:mb-4" size={40} />
            <p className="text-sm sm:text-base text-gray-700 mb-2">
              Drag and drop multiple COI PDFs here, or
            </p>
            <label className="inline-block px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer text-sm sm:text-base">
              Browse Files
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              PDF only, max 10MB per file
            </p>
          </div>
        ) : (
          <>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Selected Files ({selectedFiles.length})</h4>
                {!uploading && (
                  <label className="text-sm text-green-600 hover:text-green-700 cursor-pointer font-medium">
                    + Add More
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => {
                  const progress = uploadProgress.find(p => p.index === index);

                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {progress && getStatusIcon(progress.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                            {progress && progress.statusText && (
                              <span className="ml-2 text-blue-600">• {progress.statusText}</span>
                            )}
                            {progress && progress.error && (
                              <span className="ml-2 text-red-600">• {progress.error}</span>
                            )}
                          </p>
                          {progress && progress.status === 'processing' && (
                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${progress.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      {!uploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {completedUploads.successful?.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="text-green-600" size={20} />
              <p className="font-semibold text-green-900">
                Successfully uploaded {completedUploads.successful.length} COI{completedUploads.successful.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {completedUploads.failed?.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="text-red-600" size={20} />
              <p className="font-semibold text-red-900">
                Failed to upload {completedUploads.failed.length} file{completedUploads.failed.length > 1 ? 's' : ''}
              </p>
            </div>
            <ul className="text-sm text-red-700 space-y-1 ml-7">
              {completedUploads.failed.map((fail, idx) => (
                <li key={idx}>{fail.name}: {fail.error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>🚀 Batch Processing!</strong> Upload multiple COI PDFs at once. Our AI will extract data from each file automatically. Large batches are processed in groups of 3 to ensure reliability.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleBulkUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing {uploadProgress.filter(p => p.status === 'success').length}/{selectedFiles.length}...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Upload All ({selectedFiles.length})</span>
              </>
            )}
          </button>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
          >
            {uploading ? 'Processing...' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
