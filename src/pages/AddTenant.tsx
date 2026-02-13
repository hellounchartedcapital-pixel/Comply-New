import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, Plus, Trash2, FileText,
  Building2, Store, UtensilsCrossed,
  Upload, LayoutTemplate, Edit3, type LucideIcon,
} from 'lucide-react';
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
import { fetchProperty } from '@/services/properties';
import { compareCoverageToRequirements } from '@/services/compliance';
import { TENANT_TEMPLATES, templateCoverageSummary, type TenantTemplate } from '@/constants/tenantTemplates';
import type {
  COIExtractionResult,
  LeaseExtractionResult,
  ComplianceResult,
  CoverageRequirement,
  RequirementSource,
  ProfileCreationMethod,
} from '@/types';
import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

type RequirementPath = 'lease' | 'template' | 'manual';

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

// ============================================
// Helpers
// ============================================

const ICON_MAP: Record<string, LucideIcon> = {
  Building2, Store, UtensilsCrossed,
};

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

  const addReq = (type: string, cov: CoverageRequirement | undefined) => {
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

function templateToEditableRequirements(t: TenantTemplate): EditableRequirement[] {
  const reqs: EditableRequirement[] = [];
  const src: RequirementSource = `template_${t.key}` as RequirementSource;

  const add = (type: string, occ: number | null, agg?: number | null) => {
    if (occ == null && agg == null) return;
    reqs.push({
      id: crypto.randomUUID(),
      coverageType: type,
      occurrenceLimit: occ?.toString() ?? '',
      aggregateLimit: agg?.toString() ?? '',
      required: true,
      source: src,
    });
  };

  add('General Liability', t.general_liability_per_occurrence, t.general_liability_aggregate);
  add('Automobile Liability', t.auto_liability);
  if (t.workers_comp_required) {
    reqs.push({
      id: crypto.randomUUID(),
      coverageType: "Workers' Compensation",
      occurrenceLimit: t.employers_liability?.toString() ?? '',
      aggregateLimit: '',
      required: true,
      source: src,
    });
  }
  add('Umbrella / Excess', t.umbrella_liability);
  add('Professional Liability', t.professional_liability);
  add('Property Insurance', t.property_insurance_amount);
  add('Liquor Liability', t.liquor_liability);
  add('Pollution Liability', t.pollution_liability);
  add('Cyber Liability', t.cyber_liability);
  add('Product Liability', t.product_liability);

  return reqs;
}

// ============================================
// Component
// ============================================

export default function AddTenant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Path selection
  const [selectedPath, setSelectedPath] = useState<RequirementPath | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TenantTemplate | null>(null);

  // Lease upload state
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [isExtractingLease, setIsExtractingLease] = useState(false);
  const [leaseResult, setLeaseResult] = useState<LeaseExtractionResult | null>(null);
  const [leaseError, setLeaseError] = useState<string | null>(null);

  // COI upload state
  const [coiFile, setCoiFile] = useState<File | null>(null);
  const [isExtractingCOI, setIsExtractingCOI] = useState(false);
  const [coiResult, setCoiResult] = useState<COIExtractionResult | null>(null);
  const [coiError, setCoiError] = useState<string | null>(null);

  // Editable requirements
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

  // Derived
  const hasRequirements = requirements.some((r) => r.coverageType.trim());

  // ---- Path selection handlers ----
  const handleSelectPath = (path: RequirementPath) => {
    setSelectedPath(path);
    if (path === 'manual') {
      setRequirements([createBlankRequirement()]);
    }
  };

  const handleSelectTemplate = (t: TenantTemplate) => {
    setSelectedTemplate(t);
    setRequirements(templateToEditableRequirements(t));
  };

  const handleBackToPathSelection = () => {
    setSelectedPath(null);
    setSelectedTemplate(null);
    setRequirements([]);
    setLeaseFile(null);
    setLeaseResult(null);
    setLeaseError(null);
  };

  // ---- Lease upload handler ----
  const handleLeaseUpload = useCallback(async (file: File) => {
    setLeaseFile(file);
    setLeaseError(null);
    setLeaseResult(null);
    setIsExtractingLease(true);

    try {
      const result = await extractLeaseRequirements(file);
      if (result.success) {
        setLeaseResult(result);
        const editableReqs = leaseResultToEditableRequirements(result);
        setRequirements(editableReqs.length > 0 ? editableReqs : [createBlankRequirement()]);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('too large') || msg.includes('413') || msg.includes('payload')) {
        setLeaseError(
          'This file is too large to process. Try uploading just the insurance exhibit or requirements section instead of the full lease.'
        );
      } else {
        setLeaseError(
          msg || "We couldn't extract requirements from this document. Please check that it's a valid lease or insurance exhibit and try again."
        );
      }
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
        r.id === id
          ? { ...r, [field]: value, source: r.source !== 'manual' && field !== 'required' ? 'manual' as const : r.source }
          : r
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---- Determine creation method ----
  const getCreationMethod = (): ProfileCreationMethod => {
    if (selectedPath === 'lease' && leaseResult?.success) return 'lease_extracted';
    if (selectedPath === 'template' && selectedTemplate) return `template_${selectedTemplate.key}` as ProfileCreationMethod;
    return 'manual';
  };

  // ---- Create tenant ----
  const handleCreate = useCallback(async () => {
    if (!validate()) return;

    setIsCreating(true);
    try {
      const tenant = await createTenant({
        name: tenantName.trim(),
        email: tenantEmail.trim(),
        property_id: propertyId,
        tenant_type: selectedTemplate?.key,
      });

      // Upload lease file to storage
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
          // Storage might not be configured
        }
      }

      // Save requirement profile
      const validReqs = requirements.filter((r) => r.coverageType.trim());
      if (validReqs.length > 0) {
        try {
          const reqProfile: Record<string, any> = {
            entity_type: 'tenant',
            entity_id: tenant.id,
            building_id: propertyId,
            creation_method: getCreationMethod(),
          };

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
          // Requirement profile table might not exist
        }
      }

      // Handle COI if uploaded
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
          coverage: coiResult.coverages,
          endorsements: coiResult.endorsements ?? [],
          certificate_holder_on_coi: coiResult.certificate_holder ?? '',
          expiration_date: coiResult.expiration_date,
        } as any);

        // Run compliance comparison
        try {
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
            name: 'Requirements',
            entity_type: 'tenant' as const,
            user_id: '',
            coverages: templateCoverages,
            endorsements: {},
            created_at: '',
            updated_at: '',
          };

          // Fetch property data for endorsement/entity name checks
          let propertyData = null;
          if (propertyId) {
            try {
              propertyData = await fetchProperty(propertyId);
            } catch {
              // Non-critical
            }
          }
          const compliance = compareCoverageToRequirements(
            coiResult.coverages,
            template,
            { endorsements: coiResult.endorsements, property: propertyData, certificateHolder: coiResult.certificate_holder }
          );
          setComplianceResult(compliance);
        } catch {
          // Not critical
        }
      }

      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setCreatedSuccessfully(true);
      toast.success(coiWasUploaded ? 'Tenant created — compliance check complete' : 'Tenant created — awaiting COI upload');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setIsCreating(false);
    }
  }, [tenantName, tenantEmail, propertyId, leaseFile, leaseResult, coiFile, coiResult, requirements, selectedPath, selectedTemplate, queryClient]);

  // ---- Reset everything ----
  const resetAll = () => {
    setCreatedSuccessfully(false);
    setSelectedPath(null);
    setSelectedTemplate(null);
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
  };

  // ============================================
  // Success view
  // ============================================
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
          <Button variant="outline" onClick={resetAll} className="flex-1">
            Add Another Tenant
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // Main form
  // ============================================
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

      {/* Step 1: Choose path */}
      {!selectedPath && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">How would you like to set up requirements?</h3>
            <p className="text-sm text-muted-foreground">Choose how to define the insurance requirements for this tenant</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {([
              {
                id: 'lease' as const,
                title: 'Upload Lease',
                description: 'Upload a lease or insurance exhibit and let AI extract the requirements automatically.',
                icon: Upload,
                cta: 'Upload Lease',
                primary: true,
              },
              {
                id: 'template' as const,
                title: 'Start from Template',
                description: 'Pick a tenant type template as a starting point, then customize.',
                icon: LayoutTemplate,
                cta: 'Choose Template',
                primary: false,
              },
              {
                id: 'manual' as const,
                title: 'Enter Manually',
                description: 'Manually enter the insurance requirements for this tenant.',
                icon: Edit3,
                cta: 'Enter Manually',
                primary: false,
              },
            ]).map((path) => (
              <Card
                key={path.id}
                className="hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => handleSelectPath(path.id)}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <path.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{path.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{path.description}</p>
                  <Button
                    className="mt-4 w-full"
                    variant={path.primary ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPath(path.id);
                    }}
                  >
                    {path.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2a: Template selection */}
      {selectedPath === 'template' && !selectedTemplate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToPathSelection}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div>
              <h3 className="text-base font-semibold">Choose a Tenant Type</h3>
              <p className="text-sm text-muted-foreground">Select a template as a starting point — you can customize after</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TENANT_TEMPLATES.map((t) => {
              const Icon = ICON_MAP[t.icon] ?? Building2;
              return (
                <Card
                  key={t.key}
                  className="hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() => handleSelectTemplate(t)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm">{t.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1.5 truncate">
                          {templateCoverageSummary(t)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2b: Lease upload */}
      {selectedPath === 'lease' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToPathSelection}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <h3 className="text-base font-semibold">Upload Lease</h3>
          </div>

          <DocumentUploadZone
            label="Upload Lease or Insurance Exhibit"
            helperText="We'll extract the insurance requirements from the lease so you don't have to enter them manually."
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
            }}
            error={leaseError ?? undefined}
            success={!!leaseResult?.success}
            successText={leaseResult?.success ? 'Requirements extracted — review below' : undefined}
          />

          {leaseError && (
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
                  setSelectedPath('manual');
                  setRequirements([createBlankRequirement()]);
                  setLeaseError(null);
                }}
              >
                Enter Manually Instead
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Requirements review section (shown for all paths once requirements exist) */}
      {selectedPath && hasRequirements && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Insurance Requirements</CardTitle>
                <CardDescription>
                  {selectedPath === 'lease' && leaseResult?.success
                    ? 'Extracted from lease — edit if needed'
                    : selectedPath === 'template' && selectedTemplate
                      ? `Based on ${selectedTemplate.name} template — customize as needed`
                      : 'Enter the insurance requirements'}
                </CardDescription>
              </div>
              {selectedPath === 'template' && selectedTemplate && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {selectedTemplate.name}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {requirements.map((req) => (
              <div key={req.id} className="rounded-lg border bg-card p-4 space-y-3">
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
                  <p className="text-xs text-muted-foreground italic">Edited from extracted value</p>
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

      {/* Manual path — empty state prompting first requirement */}
      {selectedPath === 'manual' && !hasRequirements && (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No requirements added yet</p>
            <Button variant="outline" size="sm" onClick={() => setRequirements([createBlankRequirement()])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add First Requirement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* COI upload — shown once a path has been selected */}
      {selectedPath && (
        <div className="space-y-4">
          <DocumentUploadZone
            label="Upload Tenant's Certificate of Insurance"
            helperText="Upload the tenant's current COI to check it against the requirements. You can skip this and upload later."
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
            success={!!coiResult?.success}
            successText={coiResult?.success ? 'Certificate analyzed — review below' : undefined}
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
      )}

      {/* Extracted COI coverages (read-only) */}
      {coiResult?.success && (
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

      {/* Tenant info — shown once a path has been selected */}
      {selectedPath && (
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
      )}

      {/* Create button */}
      {selectedPath && (
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
      )}
    </div>
  );
}
