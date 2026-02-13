import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, CheckCircle2, XCircle, Shield, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import {
  checkCompliance,
  extractedDataToComplianceCOI,
  getComplianceGaps,
} from '@/lib/complianceEngine';
import type { ComplianceInput, ComplianceResult } from '@/lib/complianceEngine';
import type { COIExtractedData } from '@/types';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type EntityType = 'vendor' | 'tenant';

type PortalStep = 'loading' | 'invalid' | 'ready' | 'processing' | 'result';

interface EntityData {
  id: string;
  name: string;
  email?: string;
  status?: string;
  property_id?: string;
  property?: {
    id: string;
    name: string;
    additional_insured_entities: string[];
    certificate_holder_name?: string;
    certificate_holder_address_line1?: string;
    certificate_holder_address_line2?: string;
    certificate_holder_city?: string;
    certificate_holder_state?: string;
    certificate_holder_zip?: string;
    loss_payee_entities: string[];
  };
}

// ============================================
// Helper: read file as base64
// ============================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// Sub-components
// ============================================

function PortalLogo() {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <Shield className="h-8 w-8 text-primary" />
      <span className="text-2xl font-bold tracking-tight">
        Smart<span className="text-primary">COI</span>
      </span>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your upload portal...</p>
      </div>
    </div>
  );
}

function InvalidTokenView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-md">
        <PortalLogo />
        <Card>
          <CardContent className="px-6 pb-8 pt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold">Invalid or Expired Link</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This upload link is no longer valid. It may have expired or the token is incorrect.
              Please contact your property manager for a new upload link.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ComplianceIssuesList({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null;

  return (
    <Card>
      <CardContent className="px-4 py-5 sm:px-6">
        <div className="mb-3 flex items-center gap-2">
          <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <h3 className="text-sm font-semibold text-red-700">Current Compliance Issues</h3>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          The following issues were found with your current certificate. Please upload an updated
          certificate that addresses these items:
        </p>
        <ul className="space-y-2">
          {gaps.map((gap, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <span className="mt-0.5 flex-shrink-0 font-medium text-red-400">{i + 1}.</span>
              <span>{gap}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function UploadDropZone({
  onFileSelect,
  disabled,
}: {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      // Reset the input so the same file can be re-selected
      e.target.value = '';
    },
    [onFileSelect]
  );

  return (
    <Card>
      <CardContent className="px-4 py-5 sm:px-6">
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors sm:p-12',
            disabled
              ? 'cursor-not-allowed border-muted bg-muted/20 opacity-60'
              : isDragging
                ? 'border-primary bg-primary/5'
                : 'cursor-pointer border-border hover:border-primary/50 hover:bg-accent/20'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload certificate of insurance PDF"
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent sm:h-16 sm:w-16">
            <Upload className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
          </div>
          <h3 className="mt-4 text-base font-semibold sm:text-lg">
            Drop your certificate here
          </h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            PDF file up to 25MB
          </p>
          <Button variant="outline" className="mt-4" type="button" disabled={disabled}>
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
            aria-hidden="true"
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessingView() {
  return (
    <Card>
      <CardContent className="px-6 pb-10 pt-10 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <h3 className="mt-4 text-lg font-semibold">Checking your certificate...</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We are extracting coverage details and verifying compliance. This may take a moment.
        </p>
      </CardContent>
    </Card>
  );
}

function ResultCard({
  complianceResult,
  gaps,
  onUploadAnother,
}: {
  complianceResult: ComplianceResult;
  gaps: string[];
  onUploadAnother: () => void;
}) {
  const isCompliant = complianceResult.overall_status === 'compliant';

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="px-6 pb-8 pt-8 text-center">
          {isCompliant ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-emerald-700">
                Compliant -- Thank You!
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Your certificate of insurance meets all the requirements. No further action is
                needed. Your property manager has been notified.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-red-700">
                Still Non-Compliant
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                The certificate you uploaded does not yet meet all requirements. Please review the
                issues below and upload an updated certificate.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {!isCompliant && gaps.length > 0 && (
        <Card>
          <CardContent className="px-4 py-5 sm:px-6">
            <h4 className="mb-3 text-sm font-semibold text-red-700">
              Here is what still needs to be fixed:
            </h4>
            <ul className="space-y-2">
              {gaps.map((gap, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  <span className="mt-0.5 flex-shrink-0 font-medium text-red-400">
                    {i + 1}.
                  </span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!isCompliant && (
        <div className="flex justify-center">
          <Button onClick={onUploadAnother} className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" />
            Upload Another Certificate
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function SelfServicePortal() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<PortalStep>('loading');
  const [entityType, setEntityType] = useState<EntityType>('vendor');
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [existingGaps, setExistingGaps] = useState<string[]>([]);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [resultGaps, setResultGaps] = useState<string[]>([]);

  // ---- Lookup entity by token ----
  useEffect(() => {
    if (!token) {
      setStep('invalid');
      return;
    }

    async function lookupByToken() {
      try {
        // Try vendors first
        const { data: vendor } = await supabase
          .from('vendors')
          .select('*, property:properties(*)')
          .eq('upload_token', token!)
          .maybeSingle();

        if (vendor) {
          setEntity(vendor as EntityData);
          setEntityType('vendor');
          await loadExistingCompliance('vendor', vendor as EntityData);
          setStep('ready');
          return;
        }

        // Then try tenants
        const { data: tenant } = await supabase
          .from('tenants')
          .select('*, property:properties(*)')
          .eq('upload_token', token!)
          .maybeSingle();

        if (tenant) {
          setEntity(tenant as EntityData);
          setEntityType('tenant');
          await loadExistingCompliance('tenant', tenant as EntityData);
          setStep('ready');
          return;
        }

        // Neither found
        setStep('invalid');
      } catch {
        setStep('invalid');
      }
    }

    lookupByToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---- Load existing compliance gaps (if any previous COI was on file) ----
  async function loadExistingCompliance(type: EntityType, ent: EntityData) {
    try {
      // Fetch the most recent certificate for this entity
      const { data: cert } = await supabase
        .from('certificates')
        .select('compliance_result')
        .eq('entity_type', type)
        .eq('entity_id', ent.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cert?.compliance_result) {
        const result = cert.compliance_result as ComplianceResult;
        if (result.overall_status !== 'compliant') {
          const gaps = getComplianceGaps(result);
          setExistingGaps(gaps);
        }
      } else {
        // No previous COI -- check if entity status itself indicates non-compliance
        const status = ent.status;
        if (status === 'non_compliant' || status === 'pending' || status === 'expired') {
          setExistingGaps(['No certificate of insurance is currently on file.']);
        }
      }
    } catch {
      // Non-critical -- continue without existing gaps
    }
  }

  // ---- Build ComplianceInput from requirements + extracted data ----
  async function buildComplianceInput(
    type: EntityType,
    ent: EntityData,
    extractedData: COIExtractedData
  ): Promise<ComplianceInput | null> {
    const property = ent.property;
    if (!property) return null;

    const coiInput = extractedDataToComplianceCOI(extractedData);

    let requirementsInput: ComplianceInput['requirements'];

    if (type === 'vendor') {
      const { data: vendorReqs } = await supabase
        .from('vendor_requirements')
        .select('*')
        .eq('property_id', property.id)
        .maybeSingle();

      if (vendorReqs) {
        requirementsInput = {
          general_liability_per_occurrence: vendorReqs.general_liability_per_occurrence ?? null,
          general_liability_aggregate: vendorReqs.general_liability_aggregate ?? null,
          auto_liability: vendorReqs.auto_liability ?? null,
          workers_comp_required: vendorReqs.workers_comp_required ?? false,
          employers_liability: vendorReqs.employers_liability ?? null,
          umbrella_liability: vendorReqs.umbrella_liability ?? null,
          waiver_of_subrogation_required: vendorReqs.waiver_of_subrogation_required ?? false,
          cancellation_notice_days: vendorReqs.cancellation_notice_days ?? null,
        };
      } else {
        // No requirements configured -- use empty defaults
        requirementsInput = {
          general_liability_per_occurrence: null,
          general_liability_aggregate: null,
          auto_liability: null,
          workers_comp_required: false,
          employers_liability: null,
          umbrella_liability: null,
        };
      }
    } else {
      const { data: tenantReqs } = await supabase
        .from('tenant_requirements')
        .select('*')
        .eq('tenant_id', ent.id)
        .maybeSingle();

      if (tenantReqs) {
        requirementsInput = {
          general_liability_per_occurrence: tenantReqs.general_liability_per_occurrence ?? null,
          general_liability_aggregate: tenantReqs.general_liability_aggregate ?? null,
          auto_liability: tenantReqs.auto_liability ?? null,
          workers_comp_required: tenantReqs.workers_comp_required ?? false,
          employers_liability: tenantReqs.employers_liability ?? null,
          umbrella_liability: tenantReqs.umbrella_liability ?? null,
          property_insurance_required: tenantReqs.property_insurance_required ?? false,
          waiver_of_subrogation_required: tenantReqs.waiver_of_subrogation_required ?? false,
          cancellation_notice_days: tenantReqs.cancellation_notice_days ?? null,
          liquor_liability: tenantReqs.liquor_liability ?? null,
          business_interruption_required: tenantReqs.business_interruption_required ?? false,
          additional_insured_entities: tenantReqs.additional_insured_entities ?? [],
        };
      } else {
        requirementsInput = {
          general_liability_per_occurrence: null,
          general_liability_aggregate: null,
          auto_liability: null,
          workers_comp_required: false,
          employers_liability: null,
          umbrella_liability: null,
        };
      }
    }

    const propertyInput: ComplianceInput['property'] = {
      additional_insured_entities: property.additional_insured_entities ?? [],
      certificate_holder_name: property.certificate_holder_name ?? null,
      certificate_holder_address: [
        property.certificate_holder_address_line1,
        property.certificate_holder_address_line2,
        property.certificate_holder_city,
        property.certificate_holder_state,
        property.certificate_holder_zip,
      ]
        .filter(Boolean)
        .join(', ') || null,
      loss_payee_entities: property.loss_payee_entities ?? [],
    };

    return {
      coi: coiInput,
      requirements: requirementsInput,
      property: propertyInput,
    };
  }

  // ---- Handle file upload ----
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!entity) return;

      // Validate file type
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file.');
        return;
      }

      // Validate file size (25MB)
      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File is too large. Maximum size is 25MB.');
        return;
      }

      setStep('processing');

      try {
        // Convert file to base64
        const base64 = await fileToBase64(file);

        // Call the extract-coi edge function
        const { data, error } = await supabase.functions.invoke('extract-coi', {
          body: { file_base64: base64, file_name: file.name },
        });

        if (error) {
          throw new Error(error.message || 'Failed to extract COI data');
        }

        if (!data || !data.success) {
          throw new Error(data?.error || 'Extraction returned no data');
        }

        const extractedData: COIExtractedData = data.data;

        // Build compliance input and check
        const complianceInput = await buildComplianceInput(entityType, entity, extractedData);

        if (!complianceInput) {
          toast.error('Could not load property configuration. Please contact your property manager.');
          setStep('ready');
          return;
        }

        const result = checkCompliance(complianceInput);
        const gaps = getComplianceGaps(result);

        // Save the certificate record
        try {
          await supabase.from('certificates').insert({
            entity_type: entityType,
            entity_id: entity.id,
            property_id: entity.property?.id,
            user_id: entity.property_id ? undefined : undefined,
            file_name: file.name,
            extracted_data: extractedData,
            compliance_result: result,
            overall_status: result.overall_status,
            earliest_expiration: result.earliest_expiration,
            uploaded_by: 'self_service',
          });
        } catch {
          // Non-critical -- continue to show result even if save fails
          console.warn('Failed to save certificate record');
        }

        // Update entity status based on compliance result
        try {
          const newStatus = result.overall_status === 'compliant'
            ? 'compliant'
            : result.overall_status === 'expired'
              ? 'expired'
              : 'non_compliant';

          if (entityType === 'vendor') {
            await supabase
              .from('vendors')
              .update({ status: newStatus })
              .eq('id', entity.id);
          } else {
            await supabase
              .from('tenants')
              .update({ status: newStatus })
              .eq('id', entity.id);
          }
        } catch {
          // Non-critical
          console.warn('Failed to update entity status');
        }

        setComplianceResult(result);
        setResultGaps(gaps);
        setStep('result');

        if (result.overall_status === 'compliant') {
          toast.success('Your certificate is compliant!');
        } else {
          toast.error('Your certificate does not yet meet all requirements.');
        }
      } catch (err) {
        console.error('Upload/extraction error:', err);
        toast.error(
          err instanceof Error
            ? err.message
            : 'Something went wrong while processing your certificate. Please try again.'
        );
        setStep('ready');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entity, entityType]
  );

  // ---- Reset to upload another ----
  const handleUploadAnother = useCallback(() => {
    setComplianceResult(null);
    setResultGaps([]);
    setStep('ready');
  }, []);

  // ============================================
  // Render
  // ============================================

  if (step === 'loading') {
    return <LoadingView />;
  }

  if (step === 'invalid' || !entity) {
    return <InvalidTokenView />;
  }

  const propertyName = entity.property?.name ?? 'your property';
  const entityLabel = entityType === 'vendor' ? 'Vendor' : 'Tenant';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <PortalLogo />
      </div>

      {/* Main content */}
      <main className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-12 sm:px-6">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Upload Your Certificate of Insurance
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Uploading for{' '}
            <span className="font-medium text-foreground">{propertyName}</span>
            {' '}on behalf of{' '}
            <span className="font-medium text-foreground">{entity.name}</span>
          </p>
          <div className="mx-auto mt-1.5 flex items-center justify-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{entityLabel}</span>
          </div>
        </div>

        {/* Existing compliance issues (only shown in ready state) */}
        {step === 'ready' && existingGaps.length > 0 && (
          <ComplianceIssuesList gaps={existingGaps} />
        )}

        {/* Upload zone */}
        {step === 'ready' && (
          <UploadDropZone onFileSelect={handleFileSelect} disabled={false} />
        )}

        {/* Processing state */}
        {step === 'processing' && <ProcessingView />}

        {/* Result */}
        {step === 'result' && complianceResult && (
          <ResultCard
            complianceResult={complianceResult}
            gaps={resultGaps}
            onUploadAnother={handleUploadAnother}
          />
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          This is a secure upload portal. Your documents are encrypted and only shared with your
          property manager. If you have questions, please reach out to your property management team
          directly.
        </p>
      </main>
    </div>
  );
}
