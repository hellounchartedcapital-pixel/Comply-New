'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { validatePDFFile, computeFileHash, formatFileSize } from '@/lib/utils/file-validation';
import { isPlanInactiveError } from '@/lib/plan-status';
import { useUpgradeModal } from '@/components/dashboard/upgrade-modal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileText,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyOption {
  id: string;
  name: string;
}

interface EntityOption {
  id: string;
  company_name: string;
  type: 'vendor' | 'tenant';
}

type UploadStep =
  | 'idle'
  | 'uploading'
  | 'creating_record'
  | 'extracting'
  | 'done'
  | 'failed';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CertificateUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showUpgradeModal } = useUpgradeModal();

  const supabase = createClient();

  // Query-param context
  const vendorIdParam = searchParams.get('vendorId');
  const tenantIdParam = searchParams.get('tenantId');

  // Auth / org
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Entity context
  const [entityType, setEntityType] = useState<'vendor' | 'tenant' | null>(
    vendorIdParam ? 'vendor' : tenantIdParam ? 'tenant' : null
  );
  const [entityId, setEntityId] = useState<string | null>(vendorIdParam ?? tenantIdParam ?? null);
  const [entityName, setEntityName] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string | null>(null);

  // Selector state (when no query param)
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  // Processing state
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ------ Bootstrap auth & context ------
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      if (!profile?.organization_id) return;
      setOrgId(profile.organization_id);
    })();
  }, [supabase]);

  // ------ Load entity name from query params ------
  useEffect(() => {
    if (!orgId) return;

    (async () => {
      if (vendorIdParam) {
        const { data } = await supabase
          .from('vendors')
          .select('company_name, property_id, properties(name)')
          .eq('id', vendorIdParam)
          .eq('organization_id', orgId)
          .single();
        if (data) {
          setEntityName(data.company_name);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setPropertyName((data as any).properties?.name ?? null);
        }
      } else if (tenantIdParam) {
        const { data } = await supabase
          .from('tenants')
          .select('company_name, property_id, properties(name)')
          .eq('id', tenantIdParam)
          .eq('organization_id', orgId)
          .single();
        if (data) {
          setEntityName(data.company_name);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setPropertyName((data as any).properties?.name ?? null);
        }
      }
    })();
  }, [orgId, vendorIdParam, tenantIdParam, supabase]);

  // ------ Load properties for selector ------
  useEffect(() => {
    if (!orgId || entityId) return; // skip if we already have entity from param
    (async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name');
      if (data) setProperties(data);
    })();
  }, [orgId, entityId, supabase]);

  // ------ Load vendors + tenants for selected property ------
  useEffect(() => {
    if (!orgId || !selectedPropertyId) return;
    setLoadingEntities(true);
    (async () => {
      const [vendorsRes, tenantsRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, company_name')
          .eq('organization_id', orgId)
          .eq('property_id', selectedPropertyId)
          .is('deleted_at', null)
          .order('company_name'),
        supabase
          .from('tenants')
          .select('id, company_name')
          .eq('organization_id', orgId)
          .eq('property_id', selectedPropertyId)
          .is('deleted_at', null)
          .order('company_name'),
      ]);

      const merged: EntityOption[] = [
        ...(vendorsRes.data ?? []).map((v) => ({ ...v, type: 'vendor' as const })),
        ...(tenantsRes.data ?? []).map((t) => ({ ...t, type: 'tenant' as const })),
      ];
      setEntities(merged);
      setLoadingEntities(false);
    })();
  }, [orgId, selectedPropertyId, supabase]);

  // ------ File handlers ------
  const handleFileSelect = useCallback(async (selected: File) => {
    setFileError(null);
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);

    const validation = await validatePDFFile(selected);
    if (!validation.valid) {
      setFileError(validation.error!);
      return;
    }

    setFile(selected);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => setDragActive(false), []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFileSelect(selected);
    },
    [handleFileSelect]
  );

  const removeFile = () => {
    setFile(null);
    setFileError(null);
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ------ Upload & Process ------
  const handleUploadAndProcess = async () => {
    if (!file || !orgId || !userId || !entityId || !entityType) return;
    setErrorMessage(null);

    try {
      // Step 1 — Upload to storage
      setUploadStep('uploading');
      const fileHash = await computeFileHash(file);
      const storagePath = `${entityType}/${entityId}/${Date.now()}_${file.name}`;

      // Duplicate check
      if (!duplicateConfirmed) {
        const { data: existing } = await supabase
          .from('certificates')
          .select('id, uploaded_at')
          .eq('file_hash', fileHash)
          .eq(entityType === 'vendor' ? 'vendor_id' : 'tenant_id', entityId)
          .limit(1);

        if (existing && existing.length > 0) {
          const uploadDate = new Date(existing[0].uploaded_at).toLocaleDateString();
          setDuplicateWarning(
            `This document appears to have been uploaded previously on ${uploadDate}. Upload anyway?`
          );
          setUploadStep('idle');
          return;
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('coi-documents')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Step 2 — Create certificate record
      setUploadStep('creating_record');
      const { data: cert, error: certError } = await supabase
        .from('certificates')
        .insert({
          organization_id: orgId,
          vendor_id: entityType === 'vendor' ? entityId : null,
          tenant_id: entityType === 'tenant' ? entityId : null,
          file_path: storagePath,
          file_hash: fileHash,
          upload_source: 'pm_upload',
          processing_status: 'processing',
        })
        .select('id')
        .single();

      if (certError || !cert) throw new Error(`Failed to create certificate record: ${certError?.message}`);

      // Log upload activity
      await supabase.from('activity_log').insert({
        organization_id: orgId,
        certificate_id: cert.id,
        vendor_id: entityType === 'vendor' ? entityId : null,
        tenant_id: entityType === 'tenant' ? entityId : null,
        action: 'coi_uploaded',
        description: `COI uploaded for ${entityType} "${entityName ?? entityId}"`,
        performed_by: userId,
      });

      // Step 3 — AI extraction via API route
      setUploadStep('extracting');
      const extractRes = await fetch('/api/certificates/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId: cert.id }),
      });

      if (!extractRes.ok) {
        const body = await extractRes.json().catch(() => ({}));
        throw new Error(
          body.error ??
            "We couldn't process this certificate. It may be a scanned image or corrupted file. Please try uploading a clearer copy."
        );
      }

      // Step 4 — Done, redirect to review
      setUploadStep('done');
      setTimeout(() => {
        router.push(`/dashboard/certificates/${cert.id}/review`);
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't process this certificate. Please try uploading a clearer copy.";
      if (isPlanInactiveError(message)) {
        showUpgradeModal(message);
        setUploadStep('idle');
        return;
      }
      setUploadStep('failed');
      setErrorMessage(message);
    }
  };

  // ------ Derived state ------
  const isProcessing = uploadStep !== 'idle' && uploadStep !== 'failed';
  const needsSelector = !vendorIdParam && !tenantIdParam && !entityId;

  // ------ Render ------
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={
            entityType && entityId
              ? `/dashboard/${entityType}s/${entityId}`
              : '/dashboard'
          }
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Upload Certificate of Insurance</h1>
        {entityName && (
          <p className="text-sm text-muted-foreground">
            {entityType === 'vendor' ? 'Vendor' : 'Tenant'}:{' '}
            <span className="font-medium text-foreground">{entityName}</span>
            {propertyName && (
              <>
                {' '}
                &middot; Property:{' '}
                <span className="font-medium text-foreground">{propertyName}</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Selector (when no vendorId/tenantId in params) */}
      {needsSelector && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <Select
                value={selectedPropertyId ?? ''}
                onValueChange={(val) => {
                  setSelectedPropertyId(val);
                  setEntityId(null);
                  setEntityType(null);
                  setEntityName(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPropertyId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor or Tenant</label>
                {loadingEntities ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : entities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No vendors or tenants found for this property.
                  </p>
                ) : (
                  <Select
                    value={entityId ?? ''}
                    onValueChange={(val) => {
                      const picked = entities.find((e) => e.id === val);
                      if (picked) {
                        setEntityId(picked.id);
                        setEntityType(picked.type);
                        setEntityName(picked.company_name);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor or tenant…" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.company_name}{' '}
                          <span className="text-muted-foreground">
                            ({e.type})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload area */}
      <Card>
        <CardContent className="pt-6">
          {!file ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop your COI PDF here or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">PDF files only, up to 10 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={onInputChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <FileText className="h-8 w-8 flex-shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                {!isProcessing && (
                  <button
                    onClick={removeFile}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Duplicate warning */}
              {duplicateWarning && !duplicateConfirmed && (
                <div className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-600 dark:bg-yellow-950/30">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {duplicateWarning}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDuplicateConfirmed(true);
                          setDuplicateWarning(null);
                        }}
                      >
                        Continue
                      </Button>
                      <Button size="sm" variant="ghost" onClick={removeFile}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing steps */}
              {isProcessing && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <ProcessingIndicator step={uploadStep} />
                </div>
              )}

              {/* Error state */}
              {uploadStep === 'failed' && errorMessage && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-destructive">{errorMessage}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUploadStep('idle');
                        setErrorMessage(null);
                        removeFile();
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload button */}
              {uploadStep === 'idle' && !duplicateWarning && (
                <Button
                  className="w-full"
                  disabled={!entityId || !entityType}
                  onClick={handleUploadAndProcess}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload &amp; Process
                </Button>
              )}
            </div>
          )}

          {fileError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">{fileError}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Processing indicator sub-component
// ---------------------------------------------------------------------------

function ProcessingIndicator({ step }: { step: UploadStep }) {
  const steps: { key: UploadStep; label: string }[] = [
    { key: 'uploading', label: 'Uploading document…' },
    { key: 'creating_record', label: 'Creating certificate record…' },
    { key: 'extracting', label: 'Analyzing certificate…' },
    { key: 'done', label: 'Extraction complete!' },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-2">
      {steps.map((s, idx) => {
        const isComplete = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : isCurrent ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
            )}
            <span
              className={
                isComplete
                  ? 'text-muted-foreground line-through'
                  : isCurrent
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
              }
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
