import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Shield,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  Zap,
  HardHat,
  Leaf,
  Building2,
  ShoppingBag,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { PropertySelector } from '@/components/shared/PropertySelector';
import {
  fetchRequirementTemplates,
  fetchTemplateByProperty,
  createRequirementTemplate,
  updateRequirementTemplate,
} from '@/services/requirements';
import { fetchProperties } from '@/services/properties';
import { fetchOrganizationSettings } from '@/services/settings';
import type { RequirementTemplate, EntityType } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ============================================
// CONSTANTS
// ============================================

const LIMIT_OPTIONS = [500_000, 1_000_000, 1_500_000, 2_000_000];
const UMBRELLA_LIMIT_OPTIONS = [500_000, 1_000_000, 1_500_000, 2_000_000, 5_000_000, 10_000_000];
const CANCELLATION_DAYS_OPTIONS = [10, 15, 30, 60, 90];

type CoveragesData = RequirementTemplate['coverages'];
type EndorsementsData = RequirementTemplate['endorsements'];

interface FormState {
  coverages: CoveragesData;
  endorsements: EndorsementsData;
}

const EMPTY_FORM: FormState = { coverages: {}, endorsements: {} };

// ============================================
// VENDOR TEMPLATES
// ============================================

interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  form: FormState;
}

const VENDOR_TEMPLATES: TemplatePreset[] = [
  {
    id: 'standard-commercial',
    name: 'Standard Commercial',
    description: 'General office vendors, maintenance, cleaning, landscaping',
    icon: Zap,
    form: {
      coverages: {
        general_liability_required: true,
        general_liability_occurrence: 1_000_000,
        automobile_liability_required: true,
        automobile_liability_csl: 1_000_000,
        automobile_liability_owned_hired_non_owned: true,
        workers_comp_statutory: true,
        workers_comp_accept_exemption: true,
        employers_liability_required: true,
        workers_comp_employers_liability: 500_000,
      },
      endorsements: {},
    },
  },
  {
    id: 'high-risk-contractor',
    name: 'High-Risk Contractor',
    description: 'Roofing, electrical, HVAC, plumbing, elevator, construction',
    icon: HardHat,
    form: {
      coverages: {
        general_liability_required: true,
        general_liability_occurrence: 2_000_000,
        automobile_liability_required: true,
        automobile_liability_csl: 1_000_000,
        automobile_liability_owned_hired_non_owned: true,
        workers_comp_statutory: true,
        employers_liability_required: true,
        workers_comp_employers_liability: 500_000,
        umbrella_required: true,
        umbrella_limit: 5_000_000,
        professional_liability_required: true,
        professional_liability_limit: 1_000_000,
      },
      endorsements: {},
    },
  },
  {
    id: 'low-risk-vendor',
    name: 'Low-Risk Vendor',
    description: 'Janitorial, vending, courier, small deliveries',
    icon: Leaf,
    form: {
      coverages: {
        general_liability_required: true,
        general_liability_occurrence: 500_000,
        automobile_liability_required: true,
        automobile_liability_csl: 500_000,
        workers_comp_statutory: true,
        employers_liability_required: true,
        workers_comp_employers_liability: 500_000,
      },
      endorsements: {},
    },
  },
];

const TENANT_TEMPLATES: TemplatePreset[] = [
  {
    id: 'standard-office',
    name: 'Standard Office Tenant',
    description: 'Professional services, corporate offices, coworking',
    icon: Building2,
    form: {
      coverages: {
        general_liability_required: true,
        general_liability_occurrence: 1_000_000,
        general_liability_aggregate: 2_000_000,
        property_insurance_limit: 500_000,
        workers_comp_statutory: true,
        employers_liability_required: true,
        workers_comp_employers_liability: 500_000,
      },
      endorsements: {},
    },
  },
  {
    id: 'retail-restaurant',
    name: 'Retail / Restaurant Tenant',
    description: 'Restaurants, cafés, retail stores, bars, gyms',
    icon: ShoppingBag,
    form: {
      coverages: {
        general_liability_required: true,
        general_liability_occurrence: 1_000_000,
        general_liability_aggregate: 2_000_000,
        property_insurance_limit: 1_000_000,
        workers_comp_statutory: true,
        employers_liability_required: true,
        workers_comp_employers_liability: 500_000,
        business_interruption_required: true,
        umbrella_required: true,
        umbrella_limit: 1_000_000,
      },
      endorsements: {},
    },
  },
  {
    id: 'medical-professional',
    name: 'Medical / Professional Tenant',
    description: 'Medical offices, dental, law firms, financial services',
    icon: Stethoscope,
    form: {
      coverages: {
        general_liability_required: true,
        general_liability_occurrence: 1_000_000,
        general_liability_aggregate: 2_000_000,
        property_insurance_limit: 1_000_000,
        workers_comp_statutory: true,
        employers_liability_required: true,
        workers_comp_employers_liability: 500_000,
        professional_liability_required: true,
        professional_liability_limit: 1_000_000,
        umbrella_required: true,
        umbrella_limit: 2_000_000,
      },
      endorsements: {},
    },
  },
];

// ============================================
// SUB-COMPONENTS
// ============================================

function CoverageRow({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(enabled);
  useEffect(() => { if (enabled) setOpen(true); }, [enabled]);

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium">{title}</span>
          {enabled && <Badge variant="success" className="text-[10px]">Required</Badge>}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </button>
      {open && <div className="border-t px-4 pb-4 pt-3 space-y-3">{children}</div>}
    </div>
  );
}

function LimitSelect({
  label,
  value,
  onChange,
  options = LIMIT_OPTIONS,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  options?: number[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value ? String(value) : ''} onValueChange={(v) => onChange(v ? Number(v) : undefined)}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select limit" />
        </SelectTrigger>
        <SelectContent>
          {options.map((amt) => (
            <SelectItem key={amt} value={String(amt)}>{formatCurrency(amt)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TemplateCard({
  preset,
  selected,
  onSelect,
}: {
  preset: TemplatePreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = preset.icon;
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${selected ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${selected ? 'bg-primary/10' : 'bg-secondary'}`}>
            <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{preset.name}</h4>
              {selected && <Check className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Best for: {preset.description}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {preset.form.coverages.general_liability_required && preset.form.coverages.general_liability_occurrence && (
            <Badge variant="outline" className="text-[10px]">GL {formatCurrency(preset.form.coverages.general_liability_occurrence)}</Badge>
          )}
          {preset.form.coverages.automobile_liability_required && preset.form.coverages.automobile_liability_csl && (
            <Badge variant="outline" className="text-[10px]">Auto {formatCurrency(preset.form.coverages.automobile_liability_csl)}</Badge>
          )}
          {preset.form.coverages.workers_comp_statutory && (
            <Badge variant="outline" className="text-[10px]">WC Statutory</Badge>
          )}
          {preset.form.coverages.umbrella_required && preset.form.coverages.umbrella_limit && (
            <Badge variant="outline" className="text-[10px]">Umbrella {formatCurrency(preset.form.coverages.umbrella_limit)}</Badge>
          )}
          {preset.form.coverages.professional_liability_required && (
            <Badge variant="outline" className="text-[10px]">Prof Liability</Badge>
          )}
          {preset.form.coverages.property_insurance_limit && (
            <Badge variant="outline" className="text-[10px]">Property {formatCurrency(preset.form.coverages.property_insurance_limit)}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// REQUIREMENTS FORM (shared by both tabs)
// ============================================

function RequirementsForm({
  form,
  setForm,
  entityType,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  entityType: EntityType;
}) {
  const updateCoverage = (key: keyof CoveragesData, value: number | boolean | undefined) => {
    setForm((p) => ({ ...p, coverages: { ...p.coverages, [key]: value } }));
  };
  const updateEndorsement = (key: keyof EndorsementsData, value: number | boolean | string | undefined) => {
    setForm((p) => ({ ...p, endorsements: { ...p.endorsements, [key]: value } }));
  };

  return (
    <div className="space-y-6">
      {/* Coverage Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coverage Requirements</CardTitle>
          <CardDescription>Toggle each coverage type on/off and set the required minimum limit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* General Liability */}
          <CoverageRow title="General Liability" enabled={form.coverages.general_liability_required ?? false} onToggle={(v) => updateCoverage('general_liability_required', v)}>
            <div className="grid grid-cols-2 gap-3">
              <LimitSelect label="Each Occurrence" value={form.coverages.general_liability_occurrence} onChange={(v) => updateCoverage('general_liability_occurrence', v)} />
              <LimitSelect label="General Aggregate" value={form.coverages.general_liability_aggregate} onChange={(v) => updateCoverage('general_liability_aggregate', v)} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox checked={form.coverages.general_liability_contractual ?? false} onCheckedChange={(v) => updateCoverage('general_liability_contractual', v === true)} />
              <Label className="text-xs">Must include Contractual Liability</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.coverages.general_liability_umbrella_note ?? false} onCheckedChange={(v) => updateCoverage('general_liability_umbrella_note', v === true)} />
              <Label className="text-xs text-muted-foreground">May be combined with umbrella/excess</Label>
            </div>
          </CoverageRow>

          {/* Business Auto */}
          <CoverageRow title="Business Auto Liability" enabled={form.coverages.automobile_liability_required ?? false} onToggle={(v) => updateCoverage('automobile_liability_required', v)}>
            <LimitSelect label="Combined Single Limit" value={form.coverages.automobile_liability_csl} onChange={(v) => updateCoverage('automobile_liability_csl', v)} />
            <div className="flex items-center gap-2 pt-1">
              <Checkbox checked={form.coverages.automobile_liability_owned_hired_non_owned ?? false} onCheckedChange={(v) => updateCoverage('automobile_liability_owned_hired_non_owned', v === true)} />
              <Label className="text-xs">Must include Owned, Non-Owned, and Hired Autos</Label>
            </div>
          </CoverageRow>

          {/* Workers' Comp */}
          <CoverageRow title="Workers' Compensation" enabled={form.coverages.workers_comp_statutory ?? false} onToggle={(v) => updateCoverage('workers_comp_statutory', v)}>
            <p className="text-xs text-muted-foreground">Limit is always Statutory / As Required by Law</p>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox checked={form.coverages.workers_comp_accept_exemption ?? false} onCheckedChange={(v) => updateCoverage('workers_comp_accept_exemption', v === true)} />
              <Label className="text-xs">Accept signed exemption statement if no employees</Label>
            </div>
          </CoverageRow>

          {/* Employers' Liability */}
          <CoverageRow title="Employers' Liability" enabled={form.coverages.employers_liability_required ?? false} onToggle={(v) => updateCoverage('employers_liability_required', v)}>
            <LimitSelect label="Each Accident" value={form.coverages.workers_comp_employers_liability} onChange={(v) => updateCoverage('workers_comp_employers_liability', v)} />
          </CoverageRow>

          {/* Umbrella */}
          <CoverageRow title="Umbrella / Excess Liability" enabled={form.coverages.umbrella_required ?? false} onToggle={(v) => updateCoverage('umbrella_required', v)}>
            <LimitSelect label="Each Occurrence" value={form.coverages.umbrella_limit} onChange={(v) => updateCoverage('umbrella_limit', v)} options={UMBRELLA_LIMIT_OPTIONS} />
          </CoverageRow>

          {/* Professional Liability */}
          <CoverageRow title="Professional Liability / E&O" enabled={form.coverages.professional_liability_required ?? false} onToggle={(v) => updateCoverage('professional_liability_required', v)}>
            <LimitSelect label="Each Claim" value={form.coverages.professional_liability_limit} onChange={(v) => updateCoverage('professional_liability_limit', v)} />
          </CoverageRow>

          {/* Tenant-specific coverages */}
          {entityType === 'tenant' && (
            <>
              <CoverageRow title="Property / Contents Insurance" enabled={!!form.coverages.property_insurance_limit} onToggle={(v) => updateCoverage('property_insurance_limit', v ? 500_000 : undefined)}>
                <LimitSelect label="Coverage Limit" value={form.coverages.property_insurance_limit} onChange={(v) => updateCoverage('property_insurance_limit', v)} />
              </CoverageRow>
              <CoverageRow title="Business Interruption / Loss of Rent" enabled={form.coverages.business_interruption_required ?? false} onToggle={(v) => updateCoverage('business_interruption_required', v)}>
                <p className="text-xs text-muted-foreground">Coverage for loss of income due to covered perils</p>
              </CoverageRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* Endorsements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Endorsements &amp; Additional Requirements</CardTitle>
          <CardDescription>Auto-filled from your organization settings and property record. Edit here to override for this property.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Additional Insured Required</Label>
              <Switch checked={form.endorsements.require_additional_insured ?? false} onCheckedChange={(v) => updateEndorsement('require_additional_insured', v)} />
            </div>
            {form.endorsements.require_additional_insured && (
              <div className="space-y-2 pl-1">
                <Textarea
                  value={form.endorsements.additional_insured_entities ?? ''}
                  onChange={(e) => updateEndorsement('additional_insured_entities', e.target.value)}
                  placeholder="e.g., ABC Management LLC, 123 Main Street Properties Inc."
                  className="min-h-[60px] text-sm"
                />
                <p className="text-xs text-muted-foreground">Enter the names that must appear as Additional Insured on the COI</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <Checkbox checked={form.endorsements.blanket_additional_insured_accepted ?? false} onCheckedChange={(v) => updateEndorsement('blanket_additional_insured_accepted', v === true)} />
            <div>
              <Label className="text-sm">Blanket Additional Insured Accepted</Label>
              <p className="text-xs text-muted-foreground">Check if you accept blanket additional insured endorsements in lieu of specific naming</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Certificate Holder</Label>
            <div className="space-y-2">
              <Input value={form.endorsements.certificate_holder_name ?? ''} onChange={(e) => updateEndorsement('certificate_holder_name', e.target.value)} placeholder="Certificate holder name" className="text-sm" />
              <Textarea value={form.endorsements.certificate_holder_address ?? ''} onChange={(e) => updateEndorsement('certificate_holder_address', e.target.value)} placeholder="Certificate holder address" className="min-h-[60px] text-sm" />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Cancellation Notice</Label>
            <Select value={form.endorsements.cancellation_notice_days ? String(form.endorsements.cancellation_notice_days) : ''} onValueChange={(v) => updateEndorsement('cancellation_notice_days', v ? Number(v) : undefined)}>
              <SelectTrigger className="h-9 text-sm w-48">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_DAYS_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Required number of days advance notice before policy cancellation</p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Property Address on COI Required</Label>
              <p className="text-xs text-muted-foreground">The property address must appear on the certificate</p>
            </div>
            <Switch checked={form.endorsements.property_address_on_coi_required ?? false} onCheckedChange={(v) => updateEndorsement('property_address_on_coi_required', v)} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Declarations &amp; Endorsement Pages Required</Label>
              <p className="text-xs text-muted-foreground">Vendor must submit dec pages along with the COI</p>
            </div>
            <Switch checked={form.endorsements.dec_pages_required ?? false} onCheckedChange={(v) => updateEndorsement('dec_pages_required', v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// ENTITY TAB CONTENT
// ============================================

function EntityTabContent({ entityType }: { entityType: EntityType }) {
  const queryClient = useQueryClient();

  const [propertyId, setPropertyId] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: fetchProperties });
  const { data: orgSettings } = useQuery({ queryKey: ['organization-settings'], queryFn: fetchOrganizationSettings });

  const templates = entityType === 'vendor' ? VENDOR_TEMPLATES : TENANT_TEMPLATES;

  // Auto-assemble endorsements from org settings
  const assembleEndorsements = useCallback((base: EndorsementsData): EndorsementsData => {
    const result = { ...base };
    if (orgSettings) {
      if (!result.certificate_holder_name && orgSettings.company_name) {
        result.certificate_holder_name = orgSettings.company_name;
      }
    }
    return result;
  }, [orgSettings]);

  // Load existing requirements when property changes
  const loadExisting = useCallback(async (propId: string) => {
    if (!propId) {
      setForm(EMPTY_FORM);
      setExistingTemplateId(null);
      setSelectedPreset(null);
      setShowForm(false);
      return;
    }
    setLoadingExisting(true);
    try {
      const existing = await fetchTemplateByProperty(propId, entityType);
      if (existing) {
        setExistingTemplateId(existing.id);
        setForm({
          coverages: existing.coverages ?? {},
          endorsements: existing.endorsements ?? {},
        });
        setShowForm(true);
        setSelectedPreset(null);
      } else {
        setExistingTemplateId(null);
        setForm(EMPTY_FORM);
        setShowForm(false);
        setSelectedPreset(null);
      }
    } catch {
      setExistingTemplateId(null);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setLoadingExisting(false);
    }
  }, [entityType]);

  useEffect(() => {
    if (propertyId) {
      loadExisting(propertyId);
    } else {
      setForm(EMPTY_FORM);
      setExistingTemplateId(null);
      setShowForm(false);
      setSelectedPreset(null);
    }
  }, [propertyId, loadExisting]);

  const handleSelectPreset = (preset: TemplatePreset) => {
    setSelectedPreset(preset.id);
    setForm({
      coverages: { ...preset.form.coverages },
      endorsements: assembleEndorsements(preset.form.endorsements),
    });
    setShowForm(true);
  };

  const handleStartFromScratch = () => {
    setSelectedPreset('custom');
    setForm({ coverages: {}, endorsements: assembleEndorsements({}) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!propertyId) {
      toast.error('Please select a property first');
      return;
    }
    const selectedProperty = properties?.find((p) => p.id === propertyId);
    const label = entityType === 'vendor' ? 'Vendor' : 'Tenant';
    const templateName = selectedProperty
      ? `${selectedProperty.name} — ${label} Requirements`
      : `${label} Requirements`;

    setIsSaving(true);
    try {
      if (existingTemplateId) {
        await updateRequirementTemplate(existingTemplateId, {
          coverages: form.coverages,
          endorsements: form.endorsements,
        });
        toast.success('Requirements updated');
      } else {
        const created = await createRequirementTemplate({
          name: templateName,
          entity_type: entityType,
          property_id: propertyId,
          coverages: form.coverages,
          endorsements: form.endorsements,
        } as Omit<RequirementTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
        setExistingTemplateId(created.id);
        toast.success('Requirements saved');
      }
      queryClient.invalidateQueries({ queryKey: ['requirement-templates'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save requirements');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Choose Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PropertySelector value={propertyId} onChange={setPropertyId} label="Property" required />
          {propertyId && existingTemplateId && !loadingExisting && (
            <p className="text-xs text-muted-foreground mt-2">Requirements exist for this property. Editing in place.</p>
          )}
          {loadingExisting && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />Loading existing requirements...
            </div>
          )}
        </CardContent>
      </Card>

      {!propertyId ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Select a property"
          description={`Choose a property above to configure ${entityType} insurance requirements.`}
        />
      ) : loadingExisting ? (
        <Skeleton className="h-[300px] w-full" />
      ) : !showForm ? (
        /* Template selection */
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Choose a template</h3>
            <p className="text-xs text-muted-foreground">Pick a starting point, then customize if needed.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                preset={t}
                selected={selectedPreset === t.id}
                onSelect={() => handleSelectPreset(t)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleStartFromScratch}
            className="text-sm text-primary hover:underline"
          >
            Start from scratch
          </button>
        </div>
      ) : (
        /* Form + Save */
        <>
          <div className="flex items-center gap-2">
            {selectedPreset && selectedPreset !== 'custom' && (
              <Badge variant="outline">
                Template: {templates.find((t) => t.id === selectedPreset)?.name}
              </Badge>
            )}
            <button
              type="button"
              onClick={() => { setShowForm(false); setSelectedPreset(null); setExistingTemplateId(null); }}
              className="text-xs text-primary hover:underline"
            >
              {selectedPreset && selectedPreset !== 'custom' ? 'Change template' : 'Back to templates'}
            </button>
          </div>
          <RequirementsForm form={form} setForm={setForm} entityType={entityType} />
          <Button onClick={handleSave} disabled={isSaving || !propertyId} className="w-full h-12 text-base">
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : existingTemplateId ? 'Update Requirements' : 'Save Requirements'}
          </Button>
        </>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function Requirements() {
  const { isLoading: templatesLoading } = useQuery({
    queryKey: ['requirement-templates'],
    queryFn: fetchRequirementTemplates,
  });

  if (templatesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Requirements" subtitle="Configure insurance requirements by property" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Requirements"
        subtitle="Configure the insurance requirements vendors and tenants must meet"
      />

      <Tabs defaultValue="vendor">
        <TabsList className="w-full">
          <TabsTrigger value="vendor" className="flex-1">Vendors</TabsTrigger>
          <TabsTrigger value="tenant" className="flex-1">Tenants</TabsTrigger>
        </TabsList>
        <TabsContent value="vendor" className="mt-6">
          <EntityTabContent entityType="vendor" />
        </TabsContent>
        <TabsContent value="tenant" className="mt-6">
          <EntityTabContent entityType="tenant" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
