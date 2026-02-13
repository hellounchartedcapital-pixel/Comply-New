import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  Upload,
  LayoutTemplate,
  Edit3,
  Building2,
  Store,
  UtensilsCrossed,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DocumentUploadZone } from '@/components/shared/DocumentUploadZone';
import { PropertySelector } from '@/components/shared/PropertySelector';
import { createTenant, upsertTenantRequirements } from '@/services/tenants';
import { fetchProperties } from '@/services/properties';
import {
  TENANT_TEMPLATES,
  COVERAGE_AMOUNT_OPTIONS,
  CANCELLATION_NOTICE_OPTIONS,
  templateCoverageSummary,
} from '@/constants/tenantTemplates';
import type { TenantTemplate } from '@/constants/tenantTemplates';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import type { Property, LeaseExtractedData } from '@/types';

// ============================================
// Types
// ============================================

type RequirementPath = 'lease' | 'template' | 'manual';

interface RequirementFormState {
  general_liability_per_occurrence: number | null;
  general_liability_aggregate: number | null;
  auto_liability: number | null;
  workers_comp_required: boolean;
  employers_liability: number | null;
  umbrella_liability: number | null;
  property_insurance_required: boolean;
  business_interruption_required: boolean;
  liquor_liability: number | null;
  waiver_of_subrogation_required: boolean;
  cancellation_notice_days: number | null;
  insurer_rating_minimum: string;
}

const ICON_MAP: Record<string, typeof Building2> = {
  office: Building2,
  retail: Store,
  restaurant: UtensilsCrossed,
};

function blankRequirements(): RequirementFormState {
  return {
    general_liability_per_occurrence: null,
    general_liability_aggregate: null,
    auto_liability: null,
    workers_comp_required: false,
    employers_liability: null,
    umbrella_liability: null,
    property_insurance_required: false,
    business_interruption_required: false,
    liquor_liability: null,
    waiver_of_subrogation_required: false,
    cancellation_notice_days: null,
    insurer_rating_minimum: '',
  };
}

function templateToRequirements(t: TenantTemplate): RequirementFormState {
  return {
    general_liability_per_occurrence: t.general_liability_per_occurrence,
    general_liability_aggregate: t.general_liability_aggregate,
    auto_liability: t.auto_liability,
    workers_comp_required: t.workers_comp_required,
    employers_liability: t.employers_liability,
    umbrella_liability: t.umbrella_liability,
    property_insurance_required: t.property_insurance_required,
    business_interruption_required: t.business_interruption_required,
    liquor_liability: t.liquor_liability,
    waiver_of_subrogation_required: t.waiver_of_subrogation_required,
    cancellation_notice_days: null,
    insurer_rating_minimum: t.insurer_rating_minimum ?? '',
  };
}

function leaseDataToRequirements(d: LeaseExtractedData): RequirementFormState {
  return {
    general_liability_per_occurrence: d.general_liability_per_occurrence,
    general_liability_aggregate: d.general_liability_aggregate,
    auto_liability: d.auto_liability,
    workers_comp_required: d.workers_comp_required,
    employers_liability: d.employers_liability,
    umbrella_liability: d.umbrella_liability,
    property_insurance_required: d.property_insurance_required,
    business_interruption_required: d.business_interruption_required,
    liquor_liability: d.liquor_liability,
    waiver_of_subrogation_required: d.waiver_of_subrogation_required,
    cancellation_notice_days: d.cancellation_notice_days,
    insurer_rating_minimum: d.insurer_rating_minimum ?? '',
  };
}

// ============================================
// Component
// ============================================

export default function AddTenant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Path selection
  const [selectedPath, setSelectedPath] = useState<RequirementPath | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<TenantTemplate | null>(null);

  // Lease upload state
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [isExtractingLease, setIsExtractingLease] = useState(false);
  const [leaseExtracted, setLeaseExtracted] =
    useState<LeaseExtractedData | null>(null);
  const [leaseError, setLeaseError] = useState<string | null>(null);

  // COI upload state (optional, at end of flow)
  const [coiFile, setCoiFile] = useState<File | null>(null);

  // Requirement form
  const [requirements, setRequirements] = useState<RequirementFormState>(
    blankRequirements()
  );
  const [showLiquorLiability, setShowLiquorLiability] = useState(false);

  // Tenant info form
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitSuite, setUnitSuite] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission
  const [isCreating, setIsCreating] = useState(false);
  const [createdSuccessfully, setCreatedSuccessfully] = useState(false);

  // Properties for auto-filling additional insured / certificate holder
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const selectedProperty = properties?.find(
    (p: Property) => p.id === propertyId
  );

  // Whether the requirement form is ready to show
  const showRequirementForm =
    (selectedPath === 'lease' && leaseExtracted !== null) ||
    (selectedPath === 'template' && selectedTemplate !== null) ||
    selectedPath === 'manual';

  // ---- Helpers ----

  const updateReq = <K extends keyof RequirementFormState>(
    field: K,
    value: RequirementFormState[K]
  ) => {
    setRequirements((prev) => ({ ...prev, [field]: value }));
  };

  const getSource = () => {
    if (selectedPath === 'lease') return 'lease_extracted' as const;
    if (selectedPath === 'template' && selectedTemplate)
      return `template_${selectedTemplate.id}` as const;
    return 'manual' as const;
  };

  // ---- Path selection handlers ----

  const handleSelectPath = (path: RequirementPath) => {
    setSelectedPath(path);
    if (path === 'manual') {
      setRequirements(blankRequirements());
    }
  };

  const handleSelectTemplate = (t: TenantTemplate) => {
    setSelectedTemplate(t);
    const reqs = templateToRequirements(t);
    setRequirements(reqs);
    if (t.id === 'restaurant') {
      setShowLiquorLiability(true);
    }
  };

  const handleBackToPathSelection = () => {
    setSelectedPath(null);
    setSelectedTemplate(null);
    setRequirements(blankRequirements());
    setLeaseFile(null);
    setLeaseExtracted(null);
    setLeaseError(null);
    setShowLiquorLiability(false);
  };

  // ---- Lease upload handler ----

  const handleLeaseUpload = useCallback(async (file: File) => {
    setLeaseFile(file);
    setLeaseError(null);
    setLeaseExtracted(null);
    setIsExtractingLease(true);

    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const file_base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke(
        'extract-lease',
        {
          body: { file_base64, file_name: file.name },
        }
      );

      if (error) {
        setLeaseError(
          "We couldn't extract requirements from this document. Please check that it's a valid lease or insurance exhibit and try again."
        );
        return;
      }

      if (data && data.success && data.data) {
        const extracted: LeaseExtractedData = data.data;
        setLeaseExtracted(extracted);
        const reqs = leaseDataToRequirements(extracted);
        setRequirements(reqs);

        // Show liquor liability if extracted
        if (extracted.liquor_liability !== null) {
          setShowLiquorLiability(true);
        }

        // Pre-fill tenant name from lease
        if (extracted.tenant_name) {
          setTenantName(extracted.tenant_name);
        }

        toast.success('Lease requirements extracted successfully');
      } else {
        setLeaseError(
          data?.error ??
            "We couldn't find insurance requirements in this document. Try uploading just the insurance exhibit section."
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (
        msg.includes('too large') ||
        msg.includes('413') ||
        msg.includes('payload')
      ) {
        setLeaseError(
          'This file is too large to process. Try uploading just the insurance exhibit or requirements section instead of the full lease.'
        );
      } else {
        setLeaseError(
          msg ||
            "We couldn't extract requirements from this document. Please check that it's a valid lease or insurance exhibit and try again."
        );
      }
    } finally {
      setIsExtractingLease(false);
    }
  }, []);

  // ---- Validation ----

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!tenantName.trim()) newErrors.name = 'Tenant name is required';
    if (!tenantEmail.trim()) {
      newErrors.email = 'Email is required for compliance notifications';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!propertyId) {
      newErrors.property = 'Please assign this tenant to a property';
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
        unit_suite: unitSuite.trim() || undefined,
        tenant_type: selectedTemplate?.id,
        lease_start_date: leaseExtracted?.lease_start_date ?? undefined,
        lease_end_date: leaseExtracted?.lease_end_date ?? undefined,
      });

      // 2. Save requirements
      const source = getSource();
      const additionalInsured =
        selectedProperty?.additional_insured_entities ?? [];

      await upsertTenantRequirements(tenant.id, {
        source: source as any,
        general_liability_per_occurrence:
          requirements.general_liability_per_occurrence,
        general_liability_aggregate:
          requirements.general_liability_aggregate,
        auto_liability: requirements.auto_liability,
        workers_comp_required: requirements.workers_comp_required,
        employers_liability: requirements.employers_liability,
        umbrella_liability: requirements.umbrella_liability,
        property_insurance_required:
          requirements.property_insurance_required,
        business_interruption_required:
          requirements.business_interruption_required,
        liquor_liability: requirements.liquor_liability,
        additional_insured_entities: additionalInsured,
        waiver_of_subrogation_required:
          requirements.waiver_of_subrogation_required,
        cancellation_notice_days: requirements.cancellation_notice_days,
        insurer_rating_minimum:
          requirements.insurer_rating_minimum || null,
      });

      // 3. Upload COI file if provided
      if (coiFile) {
        try {
          const coiFileName = `tenant/${tenant.id}/coi_${Date.now()}_${coiFile.name}`;
          await supabase.storage
            .from('coi-documents')
            .upload(coiFileName, coiFile, { upsert: true });
        } catch {
          // Storage might not be configured
        }
      }

      // 4. Invalidate queries and show success
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setCreatedSuccessfully(true);
      toast.success('Tenant created successfully');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create tenant'
      );
    } finally {
      setIsCreating(false);
    }
  }, [
    tenantName,
    tenantEmail,
    propertyId,
    unitSuite,
    selectedTemplate,
    leaseExtracted,
    requirements,
    coiFile,
    selectedProperty,
    queryClient,
  ]);

  // ---- Reset ----

  const resetAll = () => {
    setCreatedSuccessfully(false);
    setSelectedPath(null);
    setSelectedTemplate(null);
    setRequirements(blankRequirements());
    setLeaseFile(null);
    setLeaseExtracted(null);
    setLeaseError(null);
    setCoiFile(null);
    setTenantName('');
    setTenantEmail('');
    setPropertyId('');
    setUnitSuite('');
    setErrors({});
    setShowLiquorLiability(false);
  };

  // ============================================
  // Coverage amount dropdown helper
  // ============================================

  const CoverageAmountSelect = ({
    label,
    value,
    onChange,
    id,
  }: {
    label: string;
    value: number | null;
    onChange: (v: number | null) => void;
    id: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value !== null ? value.toString() : 'none'}
        onValueChange={(v) => onChange(v === 'none' ? null : Number(v))}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select amount" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not Required</SelectItem>
          {COVERAGE_AMOUNT_OPTIONS.map((amount) => (
            <SelectItem key={amount} value={amount.toString()}>
              {formatCurrency(amount)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // ============================================
  // Success view
  // ============================================

  if (createdSuccessfully) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Tenant Created"
          subtitle={`${tenantName} has been added successfully`}
          actions={
            <Button
              variant="outline"
              onClick={() => navigate('/tenants')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tenants
            </Button>
          }
        />

        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">
                Tenant and requirements saved
              </p>
              <p className="text-xs text-muted-foreground">
                Upload the tenant's COI from the tenant list to run a
                compliance check.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/tenants')}
            className="flex-1"
          >
            Go to Tenant List
          </Button>
          <Button
            variant="outline"
            onClick={resetAll}
            className="flex-1"
          >
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tenants')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* ============================== */}
      {/* Step 1: Choose path            */}
      {/* ============================== */}
      {!selectedPath && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">
              How would you like to set up requirements?
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose how to define the insurance requirements for this
              tenant
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                {
                  id: 'lease' as const,
                  title: 'Upload Lease',
                  subtitle: 'Recommended',
                  description:
                    'Upload a lease or insurance exhibit and let AI extract the requirements automatically.',
                  icon: Upload,
                  cta: 'Upload Lease',
                  primary: true,
                },
                {
                  id: 'template' as const,
                  title: 'Start from Template',
                  subtitle: null,
                  description:
                    'Pick a tenant type template (Office, Retail, Restaurant) as a starting point.',
                  icon: LayoutTemplate,
                  cta: 'Choose Template',
                  primary: false,
                },
                {
                  id: 'manual' as const,
                  title: 'Enter Manually',
                  subtitle: null,
                  description:
                    'Manually enter the insurance requirements for this tenant.',
                  icon: Edit3,
                  cta: 'Enter Manually',
                  primary: false,
                },
              ] as const
            ).map((path) => (
              <Card
                key={path.id}
                className="hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => handleSelectPath(path.id)}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <path.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    {path.title}
                  </h3>
                  {path.subtitle && (
                    <span className="mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {path.subtitle}
                    </span>
                  )}
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {path.description}
                  </p>
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

      {/* ============================== */}
      {/* Path A: Lease upload            */}
      {/* ============================== */}
      {selectedPath === 'lease' && !leaseExtracted && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToPathSelection}
            >
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
              setLeaseExtracted(null);
              setLeaseError(null);
            }}
            error={leaseError ?? undefined}
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
                  setRequirements(blankRequirements());
                  setLeaseError(null);
                }}
              >
                Enter Manually Instead
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Lease extracted confirmation */}
      {selectedPath === 'lease' && leaseExtracted && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPathSelection}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-base font-semibold">
              Lease Requirements Extracted
            </h3>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* Path B: Template selection      */}
      {/* ============================== */}
      {selectedPath === 'template' && !selectedTemplate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToPathSelection}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div>
              <h3 className="text-base font-semibold">
                Choose a Tenant Type
              </h3>
              <p className="text-sm text-muted-foreground">
                Select a template as a starting point — you can customize
                after
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TENANT_TEMPLATES.map((t) => {
              const Icon = ICON_MAP[t.id] ?? Building2;
              return (
                <Card
                  key={t.id}
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.description}
                        </p>
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

      {/* Template selected confirmation */}
      {selectedPath === 'template' && selectedTemplate && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPathSelection}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {selectedTemplate.name} Template
            </span>
          </div>
        </div>
      )}

      {/* Manual path back button */}
      {selectedPath === 'manual' && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPathSelection}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h3 className="text-base font-semibold">
            Enter Requirements Manually
          </h3>
        </div>
      )}

      {/* ============================== */}
      {/* Requirement form               */}
      {/* ============================== */}
      {showRequirementForm && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Insurance Requirements</CardTitle>
                <CardDescription>
                  {selectedPath === 'lease'
                    ? 'Extracted from lease -- edit if needed'
                    : selectedPath === 'template' && selectedTemplate
                      ? `Based on ${selectedTemplate.name} template -- customize as needed`
                      : 'Enter the insurance requirements for this tenant'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* General Liability */}
            <div>
              <h4 className="text-sm font-semibold mb-3">
                General Liability
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <CoverageAmountSelect
                  label="Per Occurrence"
                  value={requirements.general_liability_per_occurrence}
                  onChange={(v) =>
                    updateReq('general_liability_per_occurrence', v)
                  }
                  id="gl-per-occurrence"
                />
                <CoverageAmountSelect
                  label="Aggregate"
                  value={requirements.general_liability_aggregate}
                  onChange={(v) =>
                    updateReq('general_liability_aggregate', v)
                  }
                  id="gl-aggregate"
                />
              </div>
            </div>

            {/* Auto Liability */}
            <CoverageAmountSelect
              label="Auto Liability"
              value={requirements.auto_liability}
              onChange={(v) => updateReq('auto_liability', v)}
              id="auto-liability"
            />

            {/* Workers Comp */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="workers-comp" className="text-sm font-medium">
                  Workers' Compensation
                </Label>
                <p className="text-xs text-muted-foreground">
                  Statutory limits required
                </p>
              </div>
              <Switch
                id="workers-comp"
                checked={requirements.workers_comp_required}
                onCheckedChange={(checked) =>
                  updateReq('workers_comp_required', checked)
                }
              />
            </div>

            {/* Employers' Liability -- shown when WC is on */}
            {requirements.workers_comp_required && (
              <CoverageAmountSelect
                label="Employers' Liability"
                value={requirements.employers_liability}
                onChange={(v) => updateReq('employers_liability', v)}
                id="employers-liability"
              />
            )}

            {/* Umbrella */}
            <CoverageAmountSelect
              label="Umbrella / Excess Liability"
              value={requirements.umbrella_liability}
              onChange={(v) => updateReq('umbrella_liability', v)}
              id="umbrella-liability"
            />

            {/* Property Insurance */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label
                  htmlFor="property-insurance"
                  className="text-sm font-medium"
                >
                  Property Insurance Required
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tenant must carry property insurance for their contents
                </p>
              </div>
              <Switch
                id="property-insurance"
                checked={requirements.property_insurance_required}
                onCheckedChange={(checked) =>
                  updateReq('property_insurance_required', checked)
                }
              />
            </div>

            {/* Business Interruption */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label
                  htmlFor="business-interruption"
                  className="text-sm font-medium"
                >
                  Business Interruption Required
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tenant must carry business interruption insurance
                </p>
              </div>
              <Switch
                id="business-interruption"
                checked={requirements.business_interruption_required}
                onCheckedChange={(checked) =>
                  updateReq('business_interruption_required', checked)
                }
              />
            </div>

            {/* Liquor Liability -- shown for restaurant template or if extracted */}
            {(showLiquorLiability ||
              selectedTemplate?.id === 'restaurant' ||
              requirements.liquor_liability !== null) && (
              <CoverageAmountSelect
                label="Liquor Liability"
                value={requirements.liquor_liability}
                onChange={(v) => updateReq('liquor_liability', v)}
                id="liquor-liability"
              />
            )}

            {/* Waiver of Subrogation */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label
                  htmlFor="waiver-of-sub"
                  className="text-sm font-medium"
                >
                  Waiver of Subrogation
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tenant's policies must include waiver of subrogation in
                  favor of landlord
                </p>
              </div>
              <Switch
                id="waiver-of-sub"
                checked={requirements.waiver_of_subrogation_required}
                onCheckedChange={(checked) =>
                  updateReq('waiver_of_subrogation_required', checked)
                }
              />
            </div>

            {/* Cancellation Notice Days */}
            <div className="space-y-2">
              <Label htmlFor="cancellation-days">
                Cancellation Notice Days
              </Label>
              <Select
                value={
                  requirements.cancellation_notice_days !== null
                    ? requirements.cancellation_notice_days.toString()
                    : 'none'
                }
                onValueChange={(v) =>
                  updateReq(
                    'cancellation_notice_days',
                    v === 'none' ? null : Number(v)
                  )
                }
              >
                <SelectTrigger id="cancellation-days">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Required</SelectItem>
                  {CANCELLATION_NOTICE_OPTIONS.map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Insurer Rating Minimum */}
            <div className="space-y-2">
              <Label htmlFor="insurer-rating">
                Insurer Rating Minimum
              </Label>
              <Input
                id="insurer-rating"
                value={requirements.insurer_rating_minimum}
                onChange={(e) =>
                  updateReq('insurer_rating_minimum', e.target.value)
                }
                placeholder="e.g., A.M. Best A VII"
              />
              <p className="text-xs text-muted-foreground">
                Minimum acceptable insurer financial strength rating
              </p>
            </div>

            {/* Additional insured info from property */}
            {selectedProperty &&
              selectedProperty.additional_insured_entities.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium">
                    Additional Insured (from property)
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {selectedProperty.additional_insured_entities.map(
                      (entity, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground"
                        >
                          {entity}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

            {selectedProperty &&
              selectedProperty.certificate_holder_name && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium">
                    Certificate Holder (from property)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProperty.certificate_holder_name}
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* ============================== */}
      {/* Optional COI upload             */}
      {/* ============================== */}
      {showRequirementForm && (
        <DocumentUploadZone
          label="Upload Tenant's Certificate of Insurance (Optional)"
          helperText="Upload the tenant's current COI now, or skip and upload later from the tenant list."
          onUpload={(file) => {
            setCoiFile(file);
            toast.success('COI attached -- it will be uploaded when you save.');
          }}
          uploadedFileName={coiFile?.name}
          uploadedFileSize={coiFile?.size}
          onRemove={() => setCoiFile(null)}
          success={!!coiFile}
          successText={coiFile ? 'COI attached' : undefined}
        />
      )}

      {/* ============================== */}
      {/* Tenant information              */}
      {/* ============================== */}
      {showRequirementForm && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
            <CardDescription>
              {leaseExtracted?.tenant_name
                ? 'Pre-filled from lease -- edit if needed'
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
                  if (errors.name)
                    setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Tenant name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
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
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="tenant@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Used for compliance notifications and COI update requests
              </p>
            </div>

            <PropertySelector
              value={propertyId}
              onChange={(v) => {
                setPropertyId(v);
                if (errors.property)
                  setErrors((prev) => ({ ...prev, property: '' }));
              }}
              required
              error={errors.property}
            />

            <div className="space-y-2">
              <Label htmlFor="unit-suite">Unit / Suite</Label>
              <Input
                id="unit-suite"
                value={unitSuite}
                onChange={(e) => setUnitSuite(e.target.value)}
                placeholder="e.g., Suite 200, Unit 3B"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================== */}
      {/* Create button                   */}
      {/* ============================== */}
      {showRequirementForm && (
        <Button
          onClick={handleCreate}
          disabled={
            isCreating ||
            !tenantName.trim() ||
            !tenantEmail.trim() ||
            !propertyId
          }
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
