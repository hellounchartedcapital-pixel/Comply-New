// TenantCOIUpload.jsx - Upload and compare tenant COI against requirement profile
import React, { useState } from 'react';
import {
  X, Upload, Loader2, CheckCircle, XCircle, AlertCircle,
  FileText, Minus
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { extractCOIFromPDF } from './extractCOI';
import { compareTenantCOI } from './utils/tenantComplianceUtils';
import { formatCurrency } from './utils/complianceUtils';
import { getComplianceFieldStatusInfo } from './utils/tenantComplianceUtils';
import logger from './logger';

const STATUS_ICONS = { CheckCircle, XCircle, AlertCircle, Minus };

export function TenantCOIUpload({ isOpen, onClose, tenant, requirementProfile, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('upload'); // 'upload' | 'processing' | 'results'
  const [error, setError] = useState(null);
  const [complianceResult, setComplianceResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
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

  const handleUpload = async () => {
    if (!file || !tenant) return;
    setUploading(true);
    setUploadStep('processing');
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Build requirements for comparison from the requirement profile
      const requirements = {
        general_liability: requirementProfile?.gl_occurrence_limit || 0,
        auto_liability: requirementProfile?.commercial_auto_csl || 0,
        workers_comp: requirementProfile?.workers_comp_statutory ? 'Statutory' : 0,
        employers_liability: requirementProfile?.workers_comp_employers_liability_limit || 0,
        company_name: requirementProfile?.certificate_holder_name || '',
        require_additional_insured: (requirementProfile?.additional_insured_entities?.length > 0) || false,
        require_waiver_of_subrogation: requirementProfile?.waiver_of_subrogation_required || false,
        is_tenant_policy: true,
      };

      // Extract COI data using existing vendor extraction (works for any COI)
      const extractResult = await extractCOIFromPDF(file, requirements);

      if (!extractResult.success) {
        throw new Error(extractResult.error || 'Failed to extract COI data');
      }

      const coiData = extractResult.data;

      // Upload the document to storage
      const timestamp = Date.now();
      const filePath = `${user.id}/tenant-coi/${tenant.id}/${timestamp}.pdf`;

      const { error: storageError } = await supabase.storage
        .from('coi-documents')
        .upload(filePath, file);

      if (storageError) {
        logger.error('Storage upload error', storageError);
        // Continue even if storage fails - we have the extracted data
      }

      // Update tenant record with COI data
      const tenantUpdate = {
        coi_document_path: storageError ? null : filePath,
        coi_uploaded_at: new Date().toISOString(),
        coi_raw_data: coiData.rawData || coiData,
        coi_coverage: coiData.coverage || {},
        coi_additional_coverages: coiData.additionalCoverages || [],
        coi_expiration_date: coiData.expirationDate || null,
        coi_additional_insured: coiData.additionalInsured || null,
        coi_has_additional_insured: coiData.hasAdditionalInsured || false,
        coi_waiver_of_subrogation: coiData.waiverOfSubrogation || null,
        coi_has_waiver_of_subrogation: coiData.hasWaiverOfSubrogation || false,
        coi_certificate_holder: coiData.certificateHolder || null,
        coi_insurance_company: coiData.insuranceCompany || '',
        policy_expiration_date: coiData.expirationDate || null,
        policy_uploaded_at: new Date().toISOString(),
        policy_document_path: storageError ? null : filePath,
      };

      // Run compliance comparison
      const updatedTenant = { ...tenant, ...tenantUpdate };
      const compliance = compareTenantCOI(updatedTenant, requirementProfile);

      tenantUpdate.insurance_status = compliance.overallStatus;
      tenantUpdate.compliance_details = compliance;

      const { error: updateError } = await supabase
        .from('tenants')
        .update(tenantUpdate)
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('tenant_activity').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        activity_type: 'coi_uploaded',
        description: `COI uploaded - Status: ${compliance.overallStatus}`,
        metadata: {
          status: compliance.overallStatus,
          issueCount: compliance.issues.length,
          insuranceCompany: coiData.insuranceCompany || 'Unknown',
        },
      });

      setComplianceResult(compliance);
      setUploadStep('results');

      if (onUploadComplete) {
        onUploadComplete({ ...tenant, ...tenantUpdate });
      }
    } catch (err) {
      logger.error('Tenant COI upload error', err);
      setError(err.message);
      setUploadStep('upload');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upload Tenant COI</h2>
            <p className="text-sm text-gray-500 mt-0.5">{tenant?.name}</p>
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

          {/* Upload Step */}
          {uploadStep === 'upload' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-emerald-300'
                }`}
              >
                <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                {file ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button onClick={() => setFile(null)} className="text-xs text-red-500 hover:text-red-700 mt-2">Remove</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">Drag and drop the COI PDF here, or</p>
                    <label className="inline-block mt-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 cursor-pointer">
                      Browse Files
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {!requirementProfile && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-amber-700">
                    No requirement profile set for this tenant. The COI will be processed but compliance cannot be fully evaluated.
                  </span>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                Upload & Analyze COI
              </button>
            </div>
          )}

          {/* Processing Step */}
          {uploadStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={40} className="animate-spin text-emerald-500 mb-4" />
              <p className="text-gray-700 font-medium">Analyzing Certificate of Insurance...</p>
              <p className="text-sm text-gray-500 mt-1">Extracting coverage data and comparing against requirements</p>
            </div>
          )}

          {/* Results Step */}
          {uploadStep === 'results' && complianceResult && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className={`p-4 rounded-xl border-2 ${
                complianceResult.overallStatus === 'compliant' ? 'border-emerald-200 bg-emerald-50' :
                complianceResult.overallStatus === 'non-compliant' ? 'border-red-200 bg-red-50' :
                complianceResult.overallStatus === 'expiring' ? 'border-amber-200 bg-amber-50' :
                complianceResult.overallStatus === 'expired' ? 'border-red-300 bg-red-100' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  {complianceResult.overallStatus === 'compliant' ? (
                    <CheckCircle size={24} className="text-emerald-600" />
                  ) : complianceResult.overallStatus === 'non-compliant' ? (
                    <XCircle size={24} className="text-red-600" />
                  ) : complianceResult.overallStatus === 'expiring' ? (
                    <AlertCircle size={24} className="text-amber-600" />
                  ) : (
                    <XCircle size={24} className="text-red-700" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {complianceResult.overallStatus === 'compliant' ? 'Fully Compliant' :
                       complianceResult.overallStatus === 'non-compliant' ? 'Non-Compliant' :
                       complianceResult.overallStatus === 'expiring' ? 'Expiring Soon' :
                       complianceResult.overallStatus === 'expired' ? 'Expired' : 'Pending Review'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {complianceResult.fields.filter(f => f.status === 'compliant').length} of {complianceResult.fields.length} requirements met
                    </p>
                  </div>
                </div>
              </div>

              {/* Field-by-field breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Coverage Breakdown</h4>
                {complianceResult.fields.map((field, idx) => {
                  const statusInfo = getComplianceFieldStatusInfo(field.status);
                  const StatusIcon = STATUS_ICONS[statusInfo.icon] || Minus;

                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${
                      field.status === 'compliant' ? 'border-emerald-200 bg-emerald-50/50' :
                      field.status === 'non_compliant' ? 'border-red-200 bg-red-50/50' :
                      field.status === 'expiring_soon' ? 'border-amber-200 bg-amber-50/50' :
                      field.status === 'expired' ? 'border-red-300 bg-red-100/50' :
                      'border-gray-200 bg-gray-50/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={16} className={statusInfo.color} />
                          <span className="text-sm font-medium text-gray-900">{field.label || field.fieldName}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                        <span>Required: {typeof field.required === 'number' ? formatCurrency(field.required) : String(field.required || 'N/A')}</span>
                        <span>Actual: {typeof field.actual === 'number' ? formatCurrency(field.actual) : String(field.actual || 'N/A')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Issues */}
              {complianceResult.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">Issues Found</h4>
                  {complianceResult.issues.map((issue, idx) => (
                    <div key={idx} className={`p-2 rounded-lg text-sm ${
                      issue.type === 'critical' ? 'bg-red-50 text-red-700' :
                      issue.type === 'error' ? 'bg-orange-50 text-orange-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {issue.message}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium"
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

export default TenantCOIUpload;
