import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Shield,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
import type { RequirementTemplate } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ============================================
// CONSTANTS
// ============================================

const LIMIT_OPTIONS = [500_000, 1_000_000, 1_500_000, 2_000_000];

const CANCELLATION_DAYS_OPTIONS = [10, 15, 30, 60, 90];

type CoveragesData = RequirementTemplate['coverages'];
type EndorsementsData = RequirementTemplate['endorsements'];

interface FormState {
  coverages: CoveragesData;
  endorsements: EndorsementsData;
}

const EMPTY_FORM: FormState = {
  coverages: {},
  endorsements: {},
};

// ============================================
// COVERAGE ROW COMPONENT
// ============================================

function CoverageRow({
  title,
  enabled,
  onToggle,
  children,
  defaultOpen = false,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || enabled);

  // Auto-open when enabled
  useEffect(() => {
    if (enabled) setOpen(true);
  }, [enabled]);

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Label className="text-xs text-muted-foreground">Required</Label>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// LIMIT SELECT COMPONENT
// ============================================

function LimitSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value ? String(value) : ''}
        onValueChange={(v) => onChange(v ? Number(v) : undefined)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select limit" />
        </SelectTrigger>
        <SelectContent>
          {LIMIT_OPTIONS.map((amt) => (
            <SelectItem key={amt} value={String(amt)}>
              {formatCurrency(amt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function Requirements() {
  const queryClient = useQueryClient();

  // Property selection
  const [propertyId, setPropertyId] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Saving
  const [isSaving, setIsSaving] = useState(false);

  // Fetch properties to show count on page header
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  // Fetch all templates to know loading state
  const { isLoading: templatesLoading } = useQuery({
    queryKey: ['requirement-templates'],
    queryFn: fetchRequirementTemplates,
  });

  // When property changes, load existing requirements
  const loadExistingRequirements = useCallback(async (propId: string) => {
    if (!propId) {
      setForm(EMPTY_FORM);
      setExistingTemplateId(null);
      return;
    }
    setLoadingExisting(true);
    try {
      const existing = await fetchTemplateByProperty(propId, 'vendor');
      if (existing) {
        setExistingTemplateId(existing.id);
        setForm({
          coverages: existing.coverages ?? {},
          endorsements: existing.endorsements ?? {},
        });
      } else {
        setExistingTemplateId(null);
        setForm(EMPTY_FORM);
      }
    } catch {
      setExistingTemplateId(null);
      setForm(EMPTY_FORM);
    } finally {
      setLoadingExisting(false);
    }
  }, []);

  useEffect(() => {
    if (propertyId) {
      loadExistingRequirements(propertyId);
    } else {
      setForm(EMPTY_FORM);
      setExistingTemplateId(null);
    }
  }, [propertyId, loadExistingRequirements]);

  // Helpers to update state
  const updateCoverage = (key: keyof CoveragesData, value: number | boolean | undefined) => {
    setForm((p) => ({
      ...p,
      coverages: { ...p.coverages, [key]: value },
    }));
  };

  const updateEndorsement = (key: keyof EndorsementsData, value: number | boolean | string | undefined) => {
    setForm((p) => ({
      ...p,
      endorsements: { ...p.endorsements, [key]: value },
    }));
  };

  // Save handler
  const handleSave = async () => {
    if (!propertyId) {
      toast.error('Please select a property first');
      return;
    }

    const selectedProperty = properties?.find((p) => p.id === propertyId);
    const templateName = selectedProperty
      ? `${selectedProperty.name} — Vendor Requirements`
      : 'Vendor Requirements';

    setIsSaving(true);
    try {
      if (existingTemplateId) {
        await updateRequirementTemplate(existingTemplateId, {
          coverages: form.coverages,
          endorsements: form.endorsements,
        });
        toast.success('Requirements updated successfully');
      } else {
        const created = await createRequirementTemplate({
          name: templateName,
          entity_type: 'vendor',
          property_id: propertyId,
          coverages: form.coverages,
          endorsements: form.endorsements,
        } as Omit<RequirementTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
        setExistingTemplateId(created.id);
        toast.success('Requirements saved successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['requirement-templates'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save requirements');
    } finally {
      setIsSaving(false);
    }
  };

  if (templatesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Requirements" subtitle="Configure vendor insurance requirements by property" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Requirements"
        subtitle="Configure the insurance requirements vendors must meet for each property"
      />

      {/* Property Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Assign to Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PropertySelector
            value={propertyId}
            onChange={setPropertyId}
            label="Property"
            required
          />
          {propertyId && existingTemplateId && !loadingExisting && (
            <p className="text-xs text-muted-foreground mt-2">
              Requirements already exist for this property. Editing in place.
            </p>
          )}
          {propertyId && !existingTemplateId && !loadingExisting && (
            <p className="text-xs text-muted-foreground mt-2">
              No requirements yet for this property. Configure below and save.
            </p>
          )}
          {loadingExisting && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading existing requirements...
            </div>
          )}
        </CardContent>
      </Card>

      {!propertyId ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Select a property"
          description="Choose a property above to configure or edit its vendor insurance requirements."
        />
      ) : loadingExisting ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <>
          {/* Coverage Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Coverage Requirements</CardTitle>
              <p className="text-xs text-muted-foreground">
                Toggle each coverage type on/off and set the required minimum limit.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* General Liability */}
              <CoverageRow
                title="General Liability"
                enabled={form.coverages.general_liability_required ?? false}
                onToggle={(v) => updateCoverage('general_liability_required', v)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <LimitSelect
                    label="Each Occurrence"
                    value={form.coverages.general_liability_occurrence}
                    onChange={(v) => updateCoverage('general_liability_occurrence', v)}
                  />
                  <LimitSelect
                    label="General Aggregate"
                    value={form.coverages.general_liability_aggregate}
                    onChange={(v) => updateCoverage('general_liability_aggregate', v)}
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={form.coverages.general_liability_contractual ?? false}
                    onCheckedChange={(v) => updateCoverage('general_liability_contractual', v === true)}
                  />
                  <Label className="text-xs">Must include Contractual Liability</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.coverages.general_liability_umbrella_note ?? false}
                    onCheckedChange={(v) => updateCoverage('general_liability_umbrella_note', v === true)}
                  />
                  <Label className="text-xs text-muted-foreground">May be combined with umbrella/excess</Label>
                </div>
              </CoverageRow>

              {/* Business Auto Liability */}
              <CoverageRow
                title="Business Auto Liability"
                enabled={form.coverages.automobile_liability_required ?? false}
                onToggle={(v) => updateCoverage('automobile_liability_required', v)}
              >
                <LimitSelect
                  label="Combined Single Limit"
                  value={form.coverages.automobile_liability_csl}
                  onChange={(v) => updateCoverage('automobile_liability_csl', v)}
                />
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={form.coverages.automobile_liability_owned_hired_non_owned ?? false}
                    onCheckedChange={(v) => updateCoverage('automobile_liability_owned_hired_non_owned', v === true)}
                  />
                  <Label className="text-xs">Must include Owned, Non-Owned, and Hired Autos</Label>
                </div>
              </CoverageRow>

              {/* Workers' Compensation */}
              <CoverageRow
                title="Workers' Compensation"
                enabled={form.coverages.workers_comp_statutory ?? false}
                onToggle={(v) => updateCoverage('workers_comp_statutory', v)}
              >
                <p className="text-xs text-muted-foreground">
                  Limit is always Statutory / As Required by Law
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={form.coverages.workers_comp_accept_exemption ?? false}
                    onCheckedChange={(v) => updateCoverage('workers_comp_accept_exemption', v === true)}
                  />
                  <Label className="text-xs">Accept signed exemption statement if no employees</Label>
                </div>
              </CoverageRow>

              {/* Employers' Liability */}
              <CoverageRow
                title="Employers' Liability"
                enabled={form.coverages.employers_liability_required ?? false}
                onToggle={(v) => updateCoverage('employers_liability_required', v)}
              >
                <LimitSelect
                  label="Each Accident"
                  value={form.coverages.workers_comp_employers_liability}
                  onChange={(v) => updateCoverage('workers_comp_employers_liability', v)}
                />
              </CoverageRow>

              {/* Umbrella / Excess Liability */}
              <CoverageRow
                title="Umbrella / Excess Liability"
                enabled={form.coverages.umbrella_required ?? false}
                onToggle={(v) => updateCoverage('umbrella_required', v)}
              >
                <LimitSelect
                  label="Each Occurrence"
                  value={form.coverages.umbrella_limit}
                  onChange={(v) => updateCoverage('umbrella_limit', v)}
                />
              </CoverageRow>

              {/* Professional Liability / E&O */}
              <CoverageRow
                title="Professional Liability / E&O"
                enabled={form.coverages.professional_liability_required ?? false}
                onToggle={(v) => updateCoverage('professional_liability_required', v)}
              >
                <LimitSelect
                  label="Each Claim"
                  value={form.coverages.professional_liability_limit}
                  onChange={(v) => updateCoverage('professional_liability_limit', v)}
                />
              </CoverageRow>
            </CardContent>
          </Card>

          {/* Endorsements & Additional Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Endorsements &amp; Additional Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Additional Insured */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Additional Insured Required</Label>
                  <Switch
                    checked={form.endorsements.require_additional_insured ?? false}
                    onCheckedChange={(v) => updateEndorsement('require_additional_insured', v)}
                  />
                </div>
                {form.endorsements.require_additional_insured && (
                  <div className="space-y-2 pl-1">
                    <Textarea
                      value={form.endorsements.additional_insured_entities ?? ''}
                      onChange={(e) => updateEndorsement('additional_insured_entities', e.target.value)}
                      placeholder="e.g., ABC Management LLC, 123 Main Street Properties Inc."
                      className="min-h-[60px] text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the names that must appear as Additional Insured on the COI
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Blanket Additional Insured */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.endorsements.blanket_additional_insured_accepted ?? false}
                  onCheckedChange={(v) => updateEndorsement('blanket_additional_insured_accepted', v === true)}
                />
                <div>
                  <Label className="text-sm">Blanket Additional Insured Accepted</Label>
                  <p className="text-xs text-muted-foreground">
                    Check if you accept blanket additional insured endorsements in lieu of specific naming
                  </p>
                </div>
              </div>

              <Separator />

              {/* Certificate Holder */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Certificate Holder</Label>
                <div className="space-y-2">
                  <Input
                    value={form.endorsements.certificate_holder_name ?? ''}
                    onChange={(e) => updateEndorsement('certificate_holder_name', e.target.value)}
                    placeholder="Certificate holder name"
                    className="text-sm"
                  />
                  <Textarea
                    value={form.endorsements.certificate_holder_address ?? ''}
                    onChange={(e) => updateEndorsement('certificate_holder_address', e.target.value)}
                    placeholder="Certificate holder address"
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </div>

              <Separator />

              {/* Cancellation Notice */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Cancellation Notice</Label>
                <Select
                  value={form.endorsements.cancellation_notice_days ? String(form.endorsements.cancellation_notice_days) : ''}
                  onValueChange={(v) => updateEndorsement('cancellation_notice_days', v ? Number(v) : undefined)}
                >
                  <SelectTrigger className="h-9 text-sm w-48">
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_DAYS_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Required number of days advance notice before policy cancellation
                </p>
              </div>

              <Separator />

              {/* Property Address on COI */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Property Address on COI Required</Label>
                  <p className="text-xs text-muted-foreground">
                    The property address must appear on the certificate
                  </p>
                </div>
                <Switch
                  checked={form.endorsements.property_address_on_coi_required ?? false}
                  onCheckedChange={(v) => updateEndorsement('property_address_on_coi_required', v)}
                />
              </div>

              <Separator />

              {/* Declarations & Endorsement Pages */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Declarations &amp; Endorsement Pages Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Vendor must submit dec pages along with the COI
                  </p>
                </div>
                <Switch
                  checked={form.endorsements.dec_pages_required ?? false}
                  onCheckedChange={(v) => updateEndorsement('dec_pages_required', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !propertyId}
            className="w-full h-12 text-base"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : existingTemplateId ? (
              'Update Requirements'
            ) : (
              'Save Requirements'
            )}
          </Button>
        </>
      )}
    </div>
  );
}
