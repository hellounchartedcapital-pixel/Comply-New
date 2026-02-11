// AddTenantWorkflow.jsx - Three-path workflow for creating a tenant with requirement profile
import React, { useState, useEffect } from 'react';
import {
  X, Building2, Upload, FileText, Edit3, Loader2, CheckCircle,
  AlertCircle, ArrowLeft, ArrowRight,
  Info, AlertTriangle
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { formatCurrency } from './utils/complianceUtils';
import { extractLeaseRequirements, extractionToProfile, buildingDefaultsToProfile } from './extractLeaseRequirements';
import { getConfidenceLevel, getConfidenceClasses, getSourceInfo } from './utils/tenantComplianceUtils';
import logger from './logger';

const COVERAGE_OPTIONS = [
  { value: 0, label: 'Not Required' },
  { value: 100000, label: '$100,000' },
  { value: 300000, label: '$300,000' },
  { value: 500000, label: '$500,000' },
  { value: 1000000, label: '$1,000,000' },
  { value: 2000000, label: '$2,000,000' },
  { value: 5000000, label: '$5,000,000' },
  { value: 10000000, label: '$10,000,000' },
];

// ============================================
// Path Selection Step
// ============================================
function PathSelection({ onSelectPath, hasBuildingDefaults, buildingDefaultsSummary }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">How would you like to set requirements?</h3>
        <p className="text-sm text-gray-500 mt-1">Choose how to define insurance requirements for this tenant</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Path 1: Building Defaults */}
        <button
          onClick={() => onSelectPath('building_default')}
          disabled={!hasBuildingDefaults}
          className={`text-left p-5 rounded-xl border-2 transition-all ${
            hasBuildingDefaults
              ? 'border-blue-200 hover:border-blue-400 hover:shadow-md bg-white cursor-pointer'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${hasBuildingDefaults ? 'bg-blue-100' : 'bg-gray-200'}`}>
              <Building2 size={24} className={hasBuildingDefaults ? 'text-blue-600' : 'text-gray-400'} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Use Building Defaults</h4>
              <p className="text-sm text-gray-500 mt-1">
                {hasBuildingDefaults
                  ? 'Apply the pre-configured insurance requirements for this building. You can customize individual fields after.'
                  : 'No building defaults configured yet. Set them up in building settings first.'}
              </p>
              {hasBuildingDefaults && buildingDefaultsSummary && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {buildingDefaultsSummary.gl > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                      GL: {formatCurrency(buildingDefaultsSummary.gl)}
                    </span>
                  )}
                  {buildingDefaultsSummary.auto > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                      Auto: {formatCurrency(buildingDefaultsSummary.auto)}
                    </span>
                  )}
                  {buildingDefaultsSummary.umbrella > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                      Umbrella: {formatCurrency(buildingDefaultsSummary.umbrella)}
                    </span>
                  )}
                  {buildingDefaultsSummary.wc && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                      Workers' Comp
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Path 2: Upload Lease */}
        <button
          onClick={() => onSelectPath('lease_extracted')}
          className="text-left p-5 rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-md bg-white transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Upload size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Upload Lease Document</h4>
              <p className="text-sm text-gray-500 mt-1">
                Upload a lease PDF and let AI extract the insurance requirements automatically. You'll review and confirm each field.
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                <FileText size={12} />
                <span>Supports full leases, insurance exhibits, or requirement documents</span>
              </div>
            </div>
          </div>
        </button>

        {/* Path 3: Manual Entry */}
        <button
          onClick={() => onSelectPath('manual')}
          className="text-left p-5 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-md bg-white transition-all cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Edit3 size={24} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">Enter Manually</h4>
              <p className="text-sm text-gray-500 mt-1">
                Manually enter the insurance requirements for this tenant. Use this when you know the exact requirements.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ============================================
// Lease Upload & Extraction Step
// ============================================
function LeaseUploadStep({ onExtracted, onBack }) {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);

    try {
      const result = await extractLeaseRequirements(file);

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract requirements from lease');
      }

      // Check if the document appears to be a valid lease/insurance doc
      if (result.data.documentType === 'unknown') {
        setError('This document does not appear to be a lease or insurance requirements document. Please upload the correct document.');
        setExtracting(false);
        return;
      }

      onExtracted(result.data, file);
    } catch (err) {
      logger.error('Lease extraction error', err);
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} />
        Back to options
      </button>

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Upload Lease Document</h3>
        <p className="text-sm text-gray-500 mt-1">Upload the lease PDF or insurance exhibit for AI extraction</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-300'
        }`}
      >
        <Upload size={40} className="mx-auto text-gray-400 mb-3" />
        {file ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <button
              onClick={() => setFile(null)}
              className="text-xs text-red-500 hover:text-red-700 mt-2"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600">Drag and drop your lease PDF here, or</p>
            <label className="inline-block mt-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 cursor-pointer">
              Browse Files
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 mt-2">PDF files up to 10MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <button
        onClick={handleExtract}
        disabled={!file || extracting}
        className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {extracting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Analyzing lease document...
          </>
        ) : (
          <>
            <FileText size={18} />
            Extract Requirements
          </>
        )}
      </button>
    </div>
  );
}

// ============================================
// Extraction Review Step
// ============================================
function ExtractionReviewStep({ extractionData, profile, onConfirm, onBack }) {
  const [editedProfile, setEditedProfile] = useState(profile);

  const updateField = (field, value) => {
    setEditedProfile(prev => {
      const updated = { ...prev, [field]: value };
      // Mark source as manual if editing an AI-extracted field
      const sourceField = `${field}_source`;
      if (prev[sourceField] === 'lease_extracted') {
        updated[sourceField] = 'manual';
      }
      return updated;
    });
  };

  // Build review fields from the profile
  const reviewFields = [
    { key: 'gl_occurrence_limit', label: 'GL Per Occurrence', type: 'currency' },
    { key: 'gl_aggregate_limit', label: 'GL Aggregate', type: 'currency' },
    { key: 'property_contents_limit', label: 'Property / Contents', type: 'currency' },
    { key: 'umbrella_limit', label: 'Umbrella / Excess', type: 'currency' },
    { key: 'workers_comp_statutory', label: 'Workers\' Comp Required', type: 'boolean' },
    { key: 'workers_comp_employers_liability_limit', label: 'Employers Liability', type: 'currency' },
    { key: 'commercial_auto_csl', label: 'Commercial Auto (CSL)', type: 'currency' },
    { key: 'professional_liability_limit', label: 'Professional Liability', type: 'currency' },
    { key: 'business_interruption_required', label: 'Business Interruption', type: 'boolean' },
    { key: 'waiver_of_subrogation_required', label: 'Waiver of Subrogation', type: 'boolean' },
    { key: 'cancellation_notice_days', label: 'Cancellation Notice (Days)', type: 'number' },
    { key: 'certificate_holder_name', label: 'Certificate Holder', type: 'text' },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Review Extracted Requirements</h3>
        <p className="text-sm text-gray-500 mt-1">
          Verify the AI-extracted requirements. Edit any fields that need correction.
        </p>
      </div>

      {extractionData?.extractionNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-blue-700">{extractionData.extractionNotes}</span>
        </div>
      )}

      {extractionData?.referencesExternalDocuments && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">External documents referenced</p>
            {extractionData.externalDocumentReferences?.map((ref, i) => (
              <p key={i} className="mt-1">{ref}</p>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          High confidence (85+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Medium (60-84)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Low (&lt;60)
        </span>
      </div>

      <div className="space-y-2">
        {reviewFields.map(({ key, label, type }) => {
          const value = editedProfile[key];
          const confidence = editedProfile[`${key}_confidence`];
          const leaseRef = editedProfile[`${key}_lease_ref`];
          const source = editedProfile[`${key}_source`];
          const confidenceClasses = confidence != null ? getConfidenceClasses(confidence) : null;
          const level = confidence != null ? getConfidenceLevel(confidence) : null;

          const isPresent = value != null && value !== 0 && value !== false && value !== '';

          return (
            <div
              key={key}
              className={`p-3 rounded-lg border ${
                !isPresent
                  ? 'border-gray-200 bg-gray-50'
                  : level === 'high'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : level === 'medium'
                      ? 'border-amber-200 bg-amber-50/50'
                      : level === 'low'
                        ? 'border-red-200 bg-red-50/50'
                        : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    {confidence != null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${confidenceClasses.bg} ${confidenceClasses.text}`}>
                        {confidence}%
                      </span>
                    )}
                    {source && source !== 'manual' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getSourceInfo(source).bg} ${getSourceInfo(source).color}`}>
                        {getSourceInfo(source).label}
                      </span>
                    )}
                  </div>
                  {leaseRef && (
                    <p className="text-xs text-gray-500 mt-0.5">Found in: {leaseRef}</p>
                  )}
                  {!isPresent && confidence != null && confidence < 60 && (
                    <p className="text-xs text-red-600 mt-0.5">
                      Could not locate this requirement in the lease. Add manually if required.
                    </p>
                  )}
                  {isPresent && confidence != null && confidence >= 60 && confidence < 85 && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      {leaseRef ? `Found in ${leaseRef} -- please verify` : 'Please verify this value'}
                    </p>
                  )}
                </div>
                <div className="w-48 flex-shrink-0">
                  {type === 'currency' && (
                    <select
                      value={value || 0}
                      onChange={(e) => updateField(key, parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      {COVERAGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {type === 'boolean' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value || false}
                        onChange={(e) => updateField(key, e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{value ? 'Yes' : 'No'}</span>
                    </label>
                  )}
                  {type === 'number' && (
                    <input
                      type="number"
                      value={value || ''}
                      onChange={(e) => updateField(key, parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                  {type === 'text' && (
                    <input
                      type="text"
                      value={value || ''}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Custom coverages */}
        {editedProfile.custom_coverages?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Additional Coverages Found</h4>
            {editedProfile.custom_coverages.map((cc, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-purple-200 bg-purple-50/50 mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{cc.name}</span>
                    {cc.confidence != null && (
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${getConfidenceClasses(cc.confidence).bg} ${getConfidenceClasses(cc.confidence).text}`}>
                        {cc.confidence}%
                      </span>
                    )}
                    {cc.leaseRef && (
                      <p className="text-xs text-gray-500 mt-0.5">Found in: {cc.leaseRef}</p>
                    )}
                  </div>
                  <select
                    value={cc.limit || 0}
                    onChange={(e) => {
                      const updated = [...editedProfile.custom_coverages];
                      updated[idx] = { ...cc, limit: parseInt(e.target.value), source: 'manual' };
                      setEditedProfile({ ...editedProfile, custom_coverages: updated });
                    }}
                    className="w-48 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    {COVERAGE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => onConfirm(editedProfile)}
        className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium flex items-center justify-center gap-2"
      >
        <CheckCircle size={18} />
        Confirm Requirements
      </button>
    </div>
  );
}

// ============================================
// Manual Entry Step
// ============================================
function ManualEntryStep({ onConfirm, onBack, initialProfile }) {
  const [profile, setProfile] = useState(initialProfile || {
    creation_method: 'manual',
    gl_occurrence_limit: 1000000,
    gl_aggregate_limit: 2000000,
    property_contents_limit: 0,
    umbrella_limit: 0,
    workers_comp_statutory: false,
    workers_comp_employers_liability_limit: 0,
    commercial_auto_csl: 0,
    professional_liability_limit: 0,
    business_interruption_required: false,
    waiver_of_subrogation_required: false,
    cancellation_notice_days: 30,
    certificate_holder_name: '',
    certificate_holder_address: '',
    custom_coverages: [],
    additional_insured_entities: [],
    additional_insured_language: '',
    special_endorsements: [],
  });

  const updateField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value,
      [`${field}_source`]: 'manual',
    }));
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} />
        Back to options
      </button>

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Enter Insurance Requirements</h3>
        <p className="text-sm text-gray-500 mt-1">Set the coverage requirements for this tenant</p>
      </div>

      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Coverage Limits</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'gl_occurrence_limit', label: 'GL Per Occurrence' },
              { key: 'gl_aggregate_limit', label: 'GL Aggregate' },
              { key: 'property_contents_limit', label: 'Property / Contents' },
              { key: 'umbrella_limit', label: 'Umbrella / Excess' },
              { key: 'commercial_auto_csl', label: 'Commercial Auto (CSL)' },
              { key: 'professional_liability_limit', label: 'Professional Liability' },
              { key: 'workers_comp_employers_liability_limit', label: 'Employers Liability' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <select
                  value={profile[key] || 0}
                  onChange={(e) => updateField(key, parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  {COVERAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.workers_comp_statutory || false}
                  onChange={(e) => updateField('workers_comp_statutory', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Workers' Comp Required</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Endorsements & Requirements</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.waiver_of_subrogation_required || false}
                onChange={(e) => updateField('waiver_of_subrogation_required', e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Require Waiver of Subrogation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.business_interruption_required || false}
                onChange={(e) => updateField('business_interruption_required', e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Require Business Interruption</span>
            </label>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cancellation Notice (Days)</label>
              <input
                type="number"
                value={profile.cancellation_notice_days || 30}
                onChange={(e) => updateField('cancellation_notice_days', parseInt(e.target.value) || 30)}
                className="w-32 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                min={0}
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Certificate Holder</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Certificate Holder Name</label>
              <input
                type="text"
                value={profile.certificate_holder_name || ''}
                onChange={(e) => updateField('certificate_holder_name', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                placeholder="Property Management Co, LLC"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Certificate Holder Address</label>
              <textarea
                value={profile.certificate_holder_address || ''}
                onChange={(e) => updateField('certificate_holder_address', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                placeholder="123 Main St, Suite 100"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onConfirm(profile)}
        className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium flex items-center justify-center gap-2"
      >
        <CheckCircle size={18} />
        Save Requirements
      </button>
    </div>
  );
}

// ============================================
// Tenant Info Step
// ============================================
function TenantInfoStep({ onNext, properties, initialData }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    email: '',
    phone: '',
    property_id: '',
    unit_number: '',
    lease_start: '',
    lease_end: '',
  });

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Tenant Information</h3>
        <p className="text-sm text-gray-500 mt-1">Enter the basic tenant details</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tenant/Company Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Company Name or Tenant Name"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="tenant@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
            <select
              value={formData.property_id}
              onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select property...</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit/Suite</label>
            <input
              type="text"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Suite 100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lease Start</label>
            <input
              type="date"
              value={formData.lease_start}
              onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lease End</label>
            <input
              type="date"
              value={formData.lease_end}
              onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onNext(formData)}
        disabled={!formData.name.trim()}
        className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        Next: Set Requirements
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

// ============================================
// Main AddTenantWorkflow Component
// ============================================
export function AddTenantWorkflow({ isOpen, onClose, onSave, properties, selectedProperty }) {
  const [step, setStep] = useState('info'); // 'info' | 'path_select' | 'lease_upload' | 'lease_review' | 'manual' | 'saving'
  const [tenantInfo, setTenantInfo] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [extractionData, setExtractionData] = useState(null);
  const [extractionProfile, setExtractionProfile] = useState(null);
  const [leaseFile, setLeaseFile] = useState(null);
  const [buildingDefaults, setBuildingDefaults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load building defaults when property is selected
  useEffect(() => {
    if (isOpen && tenantInfo?.property_id) {
      loadBuildingDefaults(tenantInfo.property_id);
    }
  }, [isOpen, tenantInfo?.property_id]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setTenantInfo(null);
      setSelectedPath(null);
      setExtractionData(null);
      setExtractionProfile(null);
      setLeaseFile(null);
      setBuildingDefaults(null);
      setSaving(false);
      setError(null);
    }
  }, [isOpen]);

  const loadBuildingDefaults = async (propertyId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('building_tenant_defaults')
        .select('*')
        .eq('property_id', propertyId)
        .eq('user_id', user.id)
        .single();

      setBuildingDefaults(data);
    } catch {
      setBuildingDefaults(null);
    }
  };

  const handleTenantInfoNext = (info) => {
    setTenantInfo({
      ...info,
      property_id: info.property_id || selectedProperty?.id || '',
    });
    if (info.property_id) {
      loadBuildingDefaults(info.property_id);
    }
    setStep('path_select');
  };

  const handlePathSelected = (path) => {
    setSelectedPath(path);

    if (path === 'building_default') {
      // Create profile from building defaults and go straight to review
      const profile = buildingDefaultsToProfile(buildingDefaults);
      profile.creation_method = 'building_default';
      setExtractionProfile(profile);
      setStep('lease_review');
    } else if (path === 'lease_extracted') {
      setStep('lease_upload');
    } else {
      setStep('manual');
    }
  };

  const handleLeaseExtracted = (data, file) => {
    setExtractionData(data);
    setLeaseFile(file);
    const profile = extractionToProfile(data);

    // Pre-fill lease dates from extraction
    if (data.leaseStartDate?.value && !tenantInfo.lease_start) {
      setTenantInfo(prev => ({ ...prev, lease_start: data.leaseStartDate.value }));
    }
    if (data.leaseEndDate?.value && !tenantInfo.lease_end) {
      setTenantInfo(prev => ({ ...prev, lease_end: data.leaseEndDate.value }));
    }

    setExtractionProfile(profile);
    setStep('lease_review');
  };

  const handleProfileConfirmed = async (profile) => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Handle unit creation
      let unitId = null;
      if (tenantInfo.unit_number?.trim() && tenantInfo.property_id) {
        const { data: existingUnit } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', tenantInfo.property_id)
          .eq('user_id', user.id)
          .eq('unit_number', tenantInfo.unit_number.trim())
          .single();

        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          const { data: newUnit } = await supabase
            .from('units')
            .insert({
              user_id: user.id,
              property_id: tenantInfo.property_id,
              unit_number: tenantInfo.unit_number.trim(),
            })
            .select('id')
            .single();
          if (newUnit) unitId = newUnit.id;
        }
      }

      // Upload lease document if provided
      let leaseDocPath = null;
      if (leaseFile) {
        const timestamp = Date.now();
        const filePath = `${user.id}/leases/${tenantInfo.property_id || 'unassigned'}/${timestamp}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from('lease-documents')
          .upload(filePath, leaseFile);

        if (uploadError) {
          logger.error('Lease upload error', uploadError);
        } else {
          leaseDocPath = filePath;
        }
      }

      // Create the tenant record
      const tenantData = {
        name: tenantInfo.name,
        email: tenantInfo.email || null,
        phone: tenantInfo.phone || null,
        property_id: tenantInfo.property_id || null,
        unit_id: unitId,
        lease_start: tenantInfo.lease_start || null,
        lease_end: tenantInfo.lease_end || null,
        has_requirement_profile: true,
        insurance_status: 'pending',
        status: 'active',
      };

      // Create profile data
      const profileData = {
        user_id: user.id,
        property_id: tenantInfo.property_id || null,
        creation_method: profile.creation_method || selectedPath,
        ...profile,
        lease_document_path: leaseDocPath,
        lease_document_uploaded_at: leaseDocPath ? new Date().toISOString() : null,
        lease_start_date: tenantInfo.lease_start || profile.lease_start_date || null,
        lease_end_date: tenantInfo.lease_end || profile.lease_end_date || null,
      };

      // Clean up profile data: remove non-column fields
      delete profileData.creation_method_source;

      await onSave(tenantData, profileData);
      onClose();
    } catch (err) {
      logger.error('Error saving tenant with profile', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const buildingDefaultsSummary = buildingDefaults ? {
    gl: buildingDefaults.gl_occurrence_limit || 0,
    auto: buildingDefaults.commercial_auto_csl || 0,
    umbrella: buildingDefaults.umbrella_limit || 0,
    wc: buildingDefaults.workers_comp_statutory || false,
  } : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'info' ? 'Add New Tenant' : `Add Tenant: ${tenantInfo?.name || ''}`}
            </h2>
            {step !== 'info' && (
              <p className="text-xs text-gray-500 mt-0.5">
                {step === 'path_select' && 'Step 2: Choose requirement method'}
                {step === 'lease_upload' && 'Step 2: Upload lease document'}
                {step === 'lease_review' && 'Step 3: Review requirements'}
                {step === 'manual' && 'Step 2: Enter requirements'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-4">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {saving ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-emerald-500 mb-3" />
              <p className="text-gray-600 font-medium">Saving tenant...</p>
            </div>
          ) : (
            <>
              {step === 'info' && (
                <TenantInfoStep
                  onNext={handleTenantInfoNext}
                  properties={properties}
                  initialData={tenantInfo || { property_id: selectedProperty?.id || '' }}
                />
              )}

              {step === 'path_select' && (
                <PathSelection
                  onSelectPath={handlePathSelected}
                  hasBuildingDefaults={!!buildingDefaults}
                  buildingDefaultsSummary={buildingDefaultsSummary}
                />
              )}

              {step === 'lease_upload' && (
                <LeaseUploadStep
                  onExtracted={handleLeaseExtracted}
                  onBack={() => setStep('path_select')}
                />
              )}

              {step === 'lease_review' && (
                <ExtractionReviewStep
                  extractionData={extractionData}
                  profile={extractionProfile}
                  onConfirm={handleProfileConfirmed}
                  onBack={() => setStep(selectedPath === 'building_default' ? 'path_select' : 'lease_upload')}
                />
              )}

              {step === 'manual' && (
                <ManualEntryStep
                  onConfirm={handleProfileConfirmed}
                  onBack={() => setStep('path_select')}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddTenantWorkflow;
