import React, { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';

export function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState(''); // New: track extraction progress

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
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
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setExtractionStatus('Reading PDF...');

    try {
      // Add progress callback
      const progressCallback = (status) => {
        setExtractionStatus(status);
      };
      
      await onUploadComplete(selectedFile, progressCallback);
      
      setSelectedFile(null);
      setExtractionStatus('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload file');
      setExtractionStatus('');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setError(null);
      onClose();
    }
  };

  const dropZoneClass = `border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
    dragActive 
      ? 'border-green-500 bg-green-50' 
      : 'border-gray-300 hover:border-gray-400'
  }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Upload COI</h3>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={dropZoneClass}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto text-gray-400 mb-3 sm:mb-4" size={40} />
          
          {selectedFile ? (
            <div className="space-y-2">
              <CheckCircle className="mx-auto text-green-500" size={32} />
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-700 mb-2">
                Drag and drop your COI PDF here, or
              </p>
              <label className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                PDF only, max 5MB
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800">
            <strong>AI-Powered!</strong> Upload your COI PDF and our AI will automatically extract all data and check compliance.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 px-4 py-2.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                <span className="truncate">{extractionStatus || 'Processing...'}</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>Upload & Extract</span>
              </>
            )}
          </button>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium text-sm sm:text-base"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
