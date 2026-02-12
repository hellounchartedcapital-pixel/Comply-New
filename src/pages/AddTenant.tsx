import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { DocumentUploadZone } from '@/components/shared/DocumentUploadZone';
import { ExtractedCoverageDisplay } from '@/components/shared/ExtractedCoverageDisplay';
import { PropertySelector } from '@/components/shared/PropertySelector';
import { ComplianceResults } from '@/components/shared/ComplianceResults';
import { ConfidenceIndicator } from '@/components/shared/ConfidenceIndicator';
import { extractCOI, extractLeaseRequirements, uploadCOIFile } from '@/services/ai-extraction';
import { createTenant, updateTenant } from '@/services/tenants';
import { compareCoverageToRequirements } from '@/services/compliance';
import type {
  COIExtractionResult,
  LeaseExtractionResult,
  ComplianceResult,
  CoverageRequirement,
  RequirementSource,
} from '@/types';
import { supabase } from '@/lib/supabase';

// Editable lease requirement row
interface EditableRequirement {
  id: string;
  coverageType: string;
  occurrenceLimit: string;
  aggregateLimit: string;
  required: boolean;
  source: RequirementSource;
  confidenceScore?: number;
  sourceReference?: string;
}

function createBlankRequirement(): EditableRequirement {
  return {
    id: crypto.randomUUID(),
    coverageType: '',
    occurrenceLimit: '',
    aggregateLimit: '',
    required: true,
    source: 'manual',
  };
}

function leaseResultToEditableRequirements(result: LeaseExtractionResult): EditableRequirement[] {
  const reqs: EditableRequirement[] = [];
  const r = result.requirements;

  const addReq = (
    type: string,
    cov: CoverageRequirement | undefined
  ) => {
    if (!cov) return;
    reqs.push({
      id: crypto.randomUUID(),
      coverageType: type,
      occurrenceLimit: cov.occurrence_limit?.toString() ?? '',
      aggregateLimit: cov.aggregate_limit?.toString() ?? '',
      required: cov.required,
      source: cov.source ?? 'lease_extracted',
      confidenceScore: cov.confidence_score,
      sourceReference: cov.source_reference,
    });
  };

  addReq('General Liability', r.general_liability);
  addReq('Automobile Liability', r.automobile_liability);
  addReq("Workers' Compensation", r.workers_compensation);
  addReq('Umbrella / Excess', r.umbrella_excess);
  addReq('Professional Liability', r.professional_liability);
  addReq('Property Insurance', r.property_insurance);
  addReq('Business Interruption', r.business_interruption);

  return reqs;
}

export default function AddTenant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Lease upload state
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [isExtractingLease, setIsExtractingLease] = useState(false);
  const [leaseResult, setLeaseResult] = useState<LeaseExtractionResult | null>(null);
  const [leaseError, setLeaseError] = useState<string | null>(null);
  const [showManualRequirements, setShowManualRequirements] = useState(false);

  // COI upload state
  const [coiFile, setCoiFile] = useState<File | null>(null);
  const [isExtractingCOI, setIsExtractingCOI] = useState(false);
  const [coiResult, setCoiResult] = useState<COIExtractionResult | null>(null);
  const [coiError, setCoiError] = useState<string | null>(null);

  // Editable lease requirements
  const [requirements, setRequirements] = useState<EditableRequirement[]>([]);

  // Form state
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [propertyId, setPropertyId] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission
  const [isCreating, setIsCreating] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [createdSuccessfully, setCreatedSuccessfully] = useState(false);
  const [hadCOI, setHadCOI] = useState(false);

  // ---- Lease upload handler ----
  const handleLeaseUpload = useCallback(async (file: File) => {
    setLeaseFile(file);
    setLeaseError(null);
    setLeaseResult(null);
    setShowManualRequirements(false);
    setIsExtractingLease(true);

    try {
      const result = await extractLeaseRequirements(file);
      if (result.success) {
        setLeaseResult(result);
        const editableReqs = leaseResultToEditableRequirements(result);
        setRequirements(editableReqs.length > 0 ? editableReqs : [createBlankRequirement()]);

        // Pre-fill tenant name from lease
        if (result.tenant_name && !tenantName) setTenantName(result.tenant_name);

        if (editableReqs.length === 0) {
          setLeaseError(
            "We didn't find any insurance requirements in this document. This might be the wrong section of the lease — try uploading just the insurance exhibit. Or you can enter requirements manually."
          );
        } else {
          toast.success('Lease requirements extracted');
        }
      } else {
        setLeaseError(
          result.error ?? "We couldn't extract requirements from this document. Please check that it's a valid lease or insurance exhibit and try again."
        );
      }
    } catch {
      setLeaseError(
        "We couldn't extract requirements from this document. Please check that it's a valid lease or insurance exhibit and try again."
      );
    } finally {
      setIsExtractingLease(false);
    }
  }, [tenantName]);

  // ---- COI upload handler ----
  const handleCOIUpload = useCallback(async (file: File) => {
    setCoiFile(file);
    setCoiError(null);
    setCoiResult(null);
    setIsExtractingCOI(true);

    try {
      const result = await extractCOI(file);
      if (result.success) {
        setCoiResult(result);
        // Pre-fill tenant name from COI if not already set
        if (result.named_insured && !tenantName) {
          setTenantName(result.named_insured);
        }
        toast.success('Certificate analyzed successfully');
      } else {
        setCoiError(
          result.error ?? "We couldn't automatically extract data from this certificate. Please check that the file is a valid COI and try again, or contact support."
        );
      }
    } catch {
      setCoiError(
        "We couldn't automatically extract data from this certificate. Please check that the file is a valid COI and try again, or contact support."
      );
    } finally {
      setIsExtractingCOI(false);
    }
  }, [tenantName]);

  // ---- Requirement editing ----
  const updateRequirement = (id: string, field: keyof EditableRequirement, value: string | boolean) => {
    setRequirements((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [field]: value, source: r.source === 'lease_extracted' && field !== 'required' ? 'manual' as const : r.source } : r
      )
    );
  };

  const removeRequirement = (id: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  const addRequirement = () => {
    setRequirements((prev) => [...prev, createBlankRequirement()]);
  };

  // ---- Validation ----
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!tenantName.trim()) newErrors.name = 'Tenant name is required';
    if (!tenantEmail.trim()) {
      newErrors.email = 'Email is required for compliance notifications';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!propertyId) newErrors.property = 'Please assign this tenant to a property';

    // Only require coverage requirements if lease was uploaded or manual entry is active
    const hasLeaseOrManual = leaseResult?.success || showManualRequirements;
    if (hasLeaseOrManual) {
      const validReqs = requirements.filter((r) => r.coverageType.trim());
      if (validReqs.length === 0) {
        newErrors.requirements = 'At least one coverage requirement is needed';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---- Create tenant ----
  const handleCreate = useCallback(async () => {
    if (!validate()) return;

    setIsCreating(true);
    try {
      // 1. Create tenant record
      const tenant = await createTenant({
        name: tenantName.trim(),
        email: tenantEmail.trim(),
        property_id: propertyId,
      });

      // 2. Upload lease file to storage
      if (leaseFile) {
        try {
          const leaseFileName = `tenant/${tenant.id}/lease_${Date.now()}_${leaseFile.name}`;
          await supabase.storage
            .from('coi-documents')
            .upload(leaseFileName, leaseFile, { upsert: true });

          const { data: leaseUrlData } = supabase.storage
            .from('coi-documents')
            .getPublicUrl(leaseFileName);

          await updateTenant(tenant.id, {
            lease_document_path: leaseUrlData.publicUrl,
          } as any);
        } catch {
          // Storage might not be configured — continue
        }
      }

      // 3. Save requirement profile from lease requirements
      const validReqs = requirements.filter((r) => r.coverageType.trim());
      if (validReqs.length > 0) {
        try {
          const reqProfile: Record<string, any> = {
            entity_type: 'tenant',
            entity_id: tenant.id,
            building_id: propertyId,
            creation_method: leaseResult ? 'lease_extracted' : 'manual',
          };

          // Map requirements back to profile fields
          for (const req of validReqs) {
            const lowerType = req.coverageType.toLowerCase();
            let fieldKey = '';
            if (lowerType.includes('general')) fieldKey = 'general_liability';
            else if (lowerType.includes('auto')) fieldKey = 'automobile_liability';
            else if (lowerType.includes('worker')) fieldKey = 'workers_compensation';
            else if (lowerType.includes('umbrella') || lowerType.includes('excess')) fieldKey = 'umbrella_excess';
            else if (lowerType.includes('professional') || lowerType.includes('e&o')) fieldKey = 'professional_liability';
            else if (lowerType.includes('property')) fieldKey = 'property_insurance';
            else if (lowerType.includes('business')) fieldKey = 'business_interruption';

            if (fieldKey) {
              reqProfile[fieldKey] = {
                occurrence_limit: req.occurrenceLimit ? Number(req.occurrenceLimit) : undefined,
                aggregate_limit: req.aggregateLimit ? Number(req.aggregateLimit) : undefined,
                required: req.required,
                source: req.source,
                confidence_score: req.confidenceScore,
                source_reference: req.sourceReference,
              };
            }
          }

          await supabase.from('requirement_profiles').insert(reqProfile);
        } catch {
          // Requirement profile table might not exist — continue
        }
      }

      // 4. Handle COI if uploaded
      const coiWasUploaded = !!(coiFile && coiResult?.success);
      setHadCOI(coiWasUploaded);

      if (coiWasUploaded && coiFile && coiResult) {
        try {
          await uploadCOIFile(coiFile, 'tenant', tenant.id);
        } catch {
          // Storage might not be configured
        }

        const now = new Date();
        let insuranceStatus: 'compliant' | 'non-compliant' | 'expired' = 'non-compliant';
        if (coiResult.expiration_date) {
          insuranceStatus = new Date(coiResult.expiration_date) > now ? 'compliant' : 'expired';
        }

        await updateTenant(tenant.id, {
          insurance_status: insuranceStatus,
        } as any);

        // 5. Run compliance comparison
        try {
          const validReqs = requirements.filter((r) => r.coverageType.trim());
          // Build a RequirementTemplate-like object from the lease requirements
          const templateCoverages: Record<string, any> = {};
          for (const req of validReqs) {
            const lowerType = req.coverageType.toLowerCase();
            if (lowerType.includes('general') && req.occurrenceLimit) {
              templateCoverages.general_liability_occurrence = Number(req.occurrenceLimit);
            }
            if (lowerType.includes('general') && req.aggregateLimit) {
              templateCoverages.general_liability_aggregate = Number(req.aggregateLimit);
            }
            if (lowerType.includes('auto')) {
              templateCoverages.automobile_liability_csl = Number(req.occurrenceLimit || req.aggregateLimit);
            }
            if (lowerType.includes('worker')) {
              templateCoverages.workers_comp_statutory = true;
            }
            if (lowerType.includes('umbrella') || lowerType.includes('excess')) {
              templateCoverages.umbrella_limit = Number(req.occurrenceLimit || req.aggregateLimit);
            }
            if (lowerType.includes('professional') || lowerType.includes('e&o')) {
              templateCoverages.professional_liability_limit = Number(req.occurrenceLimit || req.aggregateLimit);
            }
            if (lowerType.includes('property')) {
              templateCoverages.property_insurance_limit = Number(req.occurrenceLimit || req.aggregateLimit);
            }
          }

          const template = {
            id: '',
            name: 'Lease Requirements',
            entity_type: 'tenant' as const,
            user_id: '',
            coverages: templateCoverages,
            endorsements: {},
            created_at: '',
            updated_at: '',
          };

          const compliance = compareCoverageToRequirements(coiResult.coverages, template);
          setComplianceResult(compliance);
        } catch {
          // Not critical
        }
      }

      // 6. Invalidate queries and show success
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setCreatedSuccessfully(true);
      toast.success(coiWasUploaded ? 'Tenant created — compliance check complete' : 'Tenant created — awaiting COI upload');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setIsCreating(false);
    }
  }, [tenantName, tenantEmail, propertyId, leaseFile, leaseResult, coiFile, coiResult, requirements, showManualRequirements, queryClient]);

  // ---- Success view ----
  if (createdSuccessfully) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Tenant Created"
          subtitle={hadCOI ? `${tenantName} has been added — compliance check complete` : `${tenantName} has been added — awaiting COI upload`}
          actions={
            <Button variant="outline" onClick={() => navigate('/tenants')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tenants
            </Button>
          }
        />

        {hadCOI && complianceResult ? (
          <ComplianceResults result={complianceResult} />
        ) : hadCOI ? (
          <ComplianceResults
            result={{ overall_status: 'non-compliant', compliance_percentage: 0, fields: [], expiring_within_30_days: 0, expired_count: 0 }}
            noRequirementsMessage="Compliance results will be available once requirements are configured."
          />
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pending COI Upload</p>
                <p className="text-xs text-muted-foreground">
                  Upload the tenant's COI from their detail page to run the compliance check.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={() => navigate('/tenants')} className="flex-1">
            Go to Tenant List
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCreatedSuccessfully(false);
              setLeaseFile(null);
              setLeaseResult(null);
              setLeaseError(null);
              setCoiFile(null);
              setCoiResult(null);
              setCoiError(null);
              setRequirements([]);
              setTenantName('');
              setTenantEmail('');
              setPropertyId('');
              setComplianceResult(null);
              setErrors({});
              setHadCOI(false);
              setShowManualRequirements(false);
            }}
            className="flex-1"
          >
            Add Another Tenant
          </Button>
        </div>
      </div>
    );
  }

  // ---- Has any extraction completed? ----
  const hasLeaseResults = leaseResult?.success || showManualRequirements;
  const hasCOIResults = coiResult?.success;
  const showReviewSection = hasLeaseResults || hasCOIResults;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Add New Tenant"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/tenants')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Step 1: Upload Documents */}
      <div className="space-y-4">
        {/* Lease upload */}
        <DocumentUploadZone
          label="Upload Lease or Insurance Exhibit"
          helperText="We'll extract the insurance requirements from the lease so you don't have to enter them manually. You can upload the full lease or just the insurance section/exhibit."
          acceptedTypes={['application/pdf']}
          acceptedExtensions=".pdf"
          onUpload={handleLeaseUpload}
          isProcessing={isExtractingLease}
          processingText="Analyzing lease..."
          uploadedFileName={leaseFile?.name}
          uploadedFileSize={leaseFile?.size}
          onRemove={() => {
            setLeaseFile(null);
            setLeaseResult(null);
            setLeaseError(null);
            setRequirements([]);
            setShowManualRequirements(false);
          }}
          error={leaseError && !showManualRequirements ? leaseError : undefined}
        />

        {/* Lease error actions */}
        {leaseError && !showManualRequirements && (
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLeaseError(null);
                setLeaseFile(null);
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowManualRequirements(true);
                setRequirements([createBlankRequirement()]);
                setLeaseError(null);
              }}
            >
              Enter Requirements Manually
            </Button>
          </div>
        )}

        {/* COI upload */}
        <DocumentUploadZone
          label="Upload Tenant's Certificate of Insurance"
          helperText="Upload the tenant's current COI to check it against the lease requirements. You can skip this and upload later."
          onUpload={handleCOIUpload}
          isProcessing={isExtractingCOI}
          processingText="Analyzing certificate..."
          uploadedFileName={coiFile?.name}
          uploadedFileSize={coiFile?.size}
          onRemove={() => {
            setCoiFile(null);
            setCoiResult(null);
            setCoiError(null);
          }}
          error={coiError ?? undefined}
        />

        {coiError && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCoiError(null);
                setCoiFile(null);
              }}
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Step 2: Review Extracted Info + Details */}
      {showReviewSection && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {/* Lease requirements (editable) */}
          {(hasLeaseResults) && (
            <Card>
              <CardHeader>
                <CardTitle>Lease Requirements</CardTitle>
                <CardDescription>
                  {leaseResult?.success
                    ? 'Extracted from the uploaded lease — you can edit these if needed'
                    : 'Enter the insurance requirements from the lease'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {requirements.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Coverage Type</Label>
                          <Input
                            value={req.coverageType}
                            onChange={(e) => updateRequirement(req.id, 'coverageType', e.target.value)}
                            placeholder="e.g., General Liability"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Per Occurrence Limit</Label>
                          <Input
                            value={req.occurrenceLimit}
                            onChange={(e) => updateRequirement(req.id, 'occurrenceLimit', e.target.value)}
                            placeholder="e.g., 1000000"
                            className="h-9"
                            type="number"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Aggregate Limit</Label>
                          <Input
                            value={req.aggregateLimit}
                            onChange={(e) => updateRequirement(req.id, 'aggregateLimit', e.target.value)}
                            placeholder="e.g., 2000000"
                            className="h-9"
                            type="number"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        {req.confidenceScore !== undefined && (
                          <ConfidenceIndicator score={req.confidenceScore} />
                        )}
                        {req.sourceReference && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {req.sourceReference}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeRequirement(req.id)}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {req.source === 'manual' && req.confidenceScore !== undefined && (
                      <p className="text-xs text-muted-foreground italic">
                        Edited from extracted value
                      </p>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRequirement}
                  type="button"
                  className="w-full"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Requirement
                </Button>
                {errors.requirements && (
                  <p className="text-sm text-destructive">{errors.requirements}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Extracted COI coverages (read-only) */}
          {hasCOIResults && coiResult && (
            <ExtractedCoverageDisplay
              coverages={coiResult.coverages}
              carrier={coiResult.carrier}
              policyNumber={coiResult.policy_number}
              effectiveDate={coiResult.effective_date}
              expirationDate={coiResult.expiration_date}
              overallConfidence={coiResult.confidence_score}
              title="Tenant's Coverage"
              description="These are the coverages found on the uploaded certificate."
            />
          )}

          {!coiFile && !isExtractingCOI && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
                <FileText className="h-5 w-5" />
                <p className="text-sm">
                  No COI uploaded yet. You can upload it later from the tenant's detail page.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tenant info */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
              <CardDescription>
                {(leaseResult?.tenant_name || coiResult?.named_insured)
                  ? 'Pre-filled from uploaded documents — edit if needed'
                  : 'Enter the tenant details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">
                  Tenant Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tenant-name"
                  value={tenantName}
                  onChange={(e) => {
                    setTenantName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Tenant name"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenant-email">
                  Tenant Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={tenantEmail}
                  onChange={(e) => {
                    setTenantEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="tenant@example.com"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                <p className="text-xs text-muted-foreground">
                  Used for compliance notifications and COI update requests
                </p>
              </div>

              <PropertySelector
                value={propertyId}
                onChange={(v) => {
                  setPropertyId(v);
                  if (errors.property) setErrors((prev) => ({ ...prev, property: '' }));
                }}
                required
                error={errors.property}
              />
            </CardContent>
          </Card>

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={isCreating || !tenantName.trim() || !tenantEmail.trim() || !propertyId}
            className="w-full h-12 text-base"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Tenant...
              </>
            ) : (
              'Create Tenant'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
