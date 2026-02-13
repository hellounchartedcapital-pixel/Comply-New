import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeft,
  Pencil,
  Save,
  X,
  Truck,
  Users,
  ShieldCheck,
  ClipboardList,
  Plus,
  Trash2,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  fetchProperty,
  fetchVendorRequirements,
  upsertVendorRequirements,
  updateProperty,
} from '@/services/properties';
import { fetchVendors } from '@/services/vendors';
import { fetchTenants } from '@/services/tenants';
import {
  COVERAGE_AMOUNT_OPTIONS,
  CANCELLATION_NOTICE_OPTIONS,
} from '@/constants/tenantTemplates';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Property, VendorRequirements, Vendor, Tenant } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a display address from structured or legacy fields */
function buildAddress(p: Property): string {
  if (p.address) return p.address;
  const parts = [p.address_street, p.address_city, p.address_state, p.address_zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

/** Limit value -> select string (or "not_required") */
function limitToString(val: number | null | undefined): string {
  if (val === null || val === undefined || val === 0) return 'not_required';
  return String(val);
}

/** Select string -> limit value */
function stringToLimit(val: string): number | null {
  if (val === 'not_required') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/** Cancellation days -> select string */
function daysToString(val: number | null | undefined): string {
  if (val === null || val === undefined) return '30';
  return String(val);
}

// ---------------------------------------------------------------------------
// Coverage limit dropdown shared component
// ---------------------------------------------------------------------------

function CoverageLimitSelect({
  id,
  label,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="not_required">Not Required</SelectItem>
          {COVERAGE_AMOUNT_OPTIONS.map((amt) => (
            <SelectItem key={amt} value={String(amt)}>
              {formatCurrency(amt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ---- Data fetching ----
  const { data: property, isLoading: propLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
  });

  const { data: vendorReqs, isLoading: reqsLoading } = useQuery({
    queryKey: ['vendor-requirements', id],
    queryFn: () => fetchVendorRequirements(id!),
    enabled: !!id,
  });

  const { data: vendorData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'property', id],
    queryFn: () => fetchVendors({ propertyId: id, pageSize: 200 }),
    enabled: !!id,
  });

  const { data: tenantData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', 'property', id],
    queryFn: () => fetchTenants({ propertyId: id, pageSize: 200 }),
    enabled: !!id,
  });

  const vendors: Vendor[] = vendorData?.data ?? [];
  const tenants: Tenant[] = tenantData?.data ?? [];

  // ---- Property edit state ----
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZip, setEditZip] = useState('');

  // ---- Insurance identity edit state ----
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [aiEntities, setAiEntities] = useState<string[]>(['']);
  const [certHolderName, setCertHolderName] = useState('');
  const [certHolderAddr1, setCertHolderAddr1] = useState('');
  const [certHolderAddr2, setCertHolderAddr2] = useState('');
  const [certHolderCity, setCertHolderCity] = useState('');
  const [certHolderState, setCertHolderState] = useState('');
  const [certHolderZip, setCertHolderZip] = useState('');
  const [lossPayeeEntities, setLossPayeeEntities] = useState<string[]>(['']);

  // ---- Vendor requirements form state ----
  const [glPerOccurrence, setGlPerOccurrence] = useState('not_required');
  const [glAggregate, setGlAggregate] = useState('not_required');
  const [autoLiability, setAutoLiability] = useState('not_required');
  const [autoHiredNonOwned, setAutoHiredNonOwned] = useState(false);
  const [wcRequired, setWcRequired] = useState(false);
  const [employersLiability, setEmployersLiability] = useState('not_required');
  const [umbrellaLiability, setUmbrellaLiability] = useState('not_required');
  const [cancellationDays, setCancellationDays] = useState('30');
  const [waiverOfSubrogation, setWaiverOfSubrogation] = useState(false);
  const [blanketAI, setBlanketAI] = useState(false);
  const [reqsDirty, setReqsDirty] = useState(false);

  // ---- Hydrate property edit state when data loads ----
  useEffect(() => {
    if (property) {
      setEditName(property.name);
      setEditStreet(property.address_street ?? '');
      setEditCity(property.address_city ?? '');
      setEditState(property.address_state ?? '');
      setEditZip(property.address_zip ?? '');

      const ai = property.additional_insured_entities?.length
        ? [...property.additional_insured_entities]
        : [''];
      setAiEntities(ai);
      setCertHolderName(property.certificate_holder_name ?? '');
      setCertHolderAddr1(property.certificate_holder_address_line1 ?? '');
      setCertHolderAddr2(property.certificate_holder_address_line2 ?? '');
      setCertHolderCity(property.certificate_holder_city ?? '');
      setCertHolderState(property.certificate_holder_state ?? '');
      setCertHolderZip(property.certificate_holder_zip ?? '');
      const lp = property.loss_payee_entities?.length
        ? [...property.loss_payee_entities]
        : [''];
      setLossPayeeEntities(lp);
    }
  }, [property]);

  // ---- Hydrate vendor requirements state when data loads ----
  useEffect(() => {
    if (vendorReqs) {
      setGlPerOccurrence(limitToString(vendorReqs.general_liability_per_occurrence));
      setGlAggregate(limitToString(vendorReqs.general_liability_aggregate));
      setAutoLiability(limitToString(vendorReqs.auto_liability));
      setAutoHiredNonOwned(vendorReqs.auto_includes_hired_non_owned ?? false);
      setWcRequired(vendorReqs.workers_comp_required ?? false);
      setEmployersLiability(limitToString(vendorReqs.employers_liability));
      setUmbrellaLiability(limitToString(vendorReqs.umbrella_liability));
      setCancellationDays(daysToString(vendorReqs.cancellation_notice_days));
      setWaiverOfSubrogation(vendorReqs.waiver_of_subrogation_required ?? false);
      setBlanketAI(vendorReqs.blanket_additional_insured_accepted ?? false);
    }
    setReqsDirty(false);
  }, [vendorReqs]);

  // ---- Mutations ----
  const updatePropertyMutation = useMutation({
    mutationFn: (updates: Partial<Property>) => updateProperty(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setEditingInfo(false);
      setEditingIdentity(false);
      toast.success('Property updated');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update property'),
  });

  const upsertReqsMutation = useMutation({
    mutationFn: (reqs: Partial<VendorRequirements>) => upsertVendorRequirements(id!, reqs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-requirements', id] });
      setReqsDirty(false);
      toast.success('Vendor requirements saved');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save requirements'),
  });

  // ---- Handlers ----
  const handleSaveInfo = () => {
    updatePropertyMutation.mutate({
      name: editName,
      address_street: editStreet || undefined,
      address_city: editCity || undefined,
      address_state: editState || undefined,
      address_zip: editZip || undefined,
      address: [editStreet, editCity, editState, editZip].filter(Boolean).join(', ') || undefined,
    });
  };

  const handleSaveIdentity = () => {
    updatePropertyMutation.mutate({
      additional_insured_entities: aiEntities.filter(Boolean),
      certificate_holder_name: certHolderName || undefined,
      certificate_holder_address_line1: certHolderAddr1 || undefined,
      certificate_holder_address_line2: certHolderAddr2 || undefined,
      certificate_holder_city: certHolderCity || undefined,
      certificate_holder_state: certHolderState || undefined,
      certificate_holder_zip: certHolderZip || undefined,
      loss_payee_entities: lossPayeeEntities.filter(Boolean),
    });
  };

  const handleSaveRequirements = () => {
    upsertReqsMutation.mutate({
      general_liability_per_occurrence: stringToLimit(glPerOccurrence),
      general_liability_aggregate: stringToLimit(glAggregate),
      auto_liability: stringToLimit(autoLiability),
      auto_includes_hired_non_owned: autoHiredNonOwned,
      workers_comp_required: wcRequired,
      employers_liability: stringToLimit(employersLiability),
      umbrella_liability: stringToLimit(umbrellaLiability),
      cancellation_notice_days: Number(cancellationDays),
      waiver_of_subrogation_required: waiverOfSubrogation,
      blanket_additional_insured_accepted: blanketAI,
    });
  };

  const markDirty = () => {
    if (!reqsDirty) setReqsDirty(true);
  };

  // ---- Loading / not found ----
  const isLoading = propLoading || reqsLoading || vendorsLoading || tenantsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <EmptyState
        icon={Building2}
        title="Property not found"
        description="The property you're looking for doesn't exist or has been removed."
        actionLabel="Back to Properties"
        onAction={() => navigate('/properties')}
      />
    );
  }

  const address = buildAddress(property);

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Top bar: back + title                                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/properties')}
          aria-label="Back to properties"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={property.name}
          subtitle={address || 'No address set'}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Property Info + Insurance Identity (side by side on lg)           */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Property Info Card ---- */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Property Info
              </h2>
              {editingInfo ? (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingInfo(false);
                      setEditName(property.name);
                      setEditStreet(property.address_street ?? '');
                      setEditCity(property.address_city ?? '');
                      setEditState(property.address_state ?? '');
                      setEditZip(property.address_zip ?? '');
                    }}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveInfo}
                    disabled={updatePropertyMutation.isPending}
                  >
                    <Save className="mr-1 h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingInfo(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>

            {editingInfo ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-street">Street</Label>
                  <Input
                    id="edit-street"
                    value={editStreet}
                    onChange={(e) => setEditStreet(e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-3 space-y-1.5">
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 space-y-1.5">
                    <Label htmlFor="edit-state">State</Label>
                    <Input
                      id="edit-state"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      maxLength={2}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="edit-zip">ZIP</Label>
                    <Input
                      id="edit-zip"
                      value={editZip}
                      onChange={(e) => setEditZip(e.target.value)}
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{property.name}</span>
                </div>
                {address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{address}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Insurance Identity Card ---- */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Insurance Identity
              </h2>
              {editingIdentity ? (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingIdentity(false);
                      // Reset to property values
                      const ai = property.additional_insured_entities?.length
                        ? [...property.additional_insured_entities]
                        : [''];
                      setAiEntities(ai);
                      setCertHolderName(property.certificate_holder_name ?? '');
                      setCertHolderAddr1(property.certificate_holder_address_line1 ?? '');
                      setCertHolderAddr2(property.certificate_holder_address_line2 ?? '');
                      setCertHolderCity(property.certificate_holder_city ?? '');
                      setCertHolderState(property.certificate_holder_state ?? '');
                      setCertHolderZip(property.certificate_holder_zip ?? '');
                      const lp = property.loss_payee_entities?.length
                        ? [...property.loss_payee_entities]
                        : [''];
                      setLossPayeeEntities(lp);
                    }}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveIdentity}
                    disabled={updatePropertyMutation.isPending}
                  >
                    <Save className="mr-1 h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditingIdentity(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>

            {editingIdentity ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {/* Additional Insured */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Additional Insured Entities</Label>
                  {aiEntities.map((entity, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={entity}
                        onChange={(e) => {
                          const updated = [...aiEntities];
                          updated[idx] = e.target.value;
                          setAiEntities(updated);
                        }}
                        placeholder={idx === 0 ? 'e.g., Sunset Holdings LLC' : 'Additional entity...'}
                        className="flex-1"
                      />
                      {aiEntities.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => setAiEntities(aiEntities.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAiEntities([...aiEntities, ''])}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Entity
                  </Button>
                </div>

                {/* Certificate Holder */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Certificate Holder</Label>
                  <Input
                    value={certHolderName}
                    onChange={(e) => setCertHolderName(e.target.value)}
                    placeholder="Certificate holder name"
                  />
                  <Input
                    value={certHolderAddr1}
                    onChange={(e) => setCertHolderAddr1(e.target.value)}
                    placeholder="Address line 1"
                  />
                  <Input
                    value={certHolderAddr2}
                    onChange={(e) => setCertHolderAddr2(e.target.value)}
                    placeholder="Address line 2 (optional)"
                  />
                  <div className="grid grid-cols-6 gap-2">
                    <Input
                      className="col-span-3"
                      value={certHolderCity}
                      onChange={(e) => setCertHolderCity(e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      className="col-span-1"
                      value={certHolderState}
                      onChange={(e) => setCertHolderState(e.target.value)}
                      placeholder="ST"
                      maxLength={2}
                    />
                    <Input
                      className="col-span-2"
                      value={certHolderZip}
                      onChange={(e) => setCertHolderZip(e.target.value)}
                      placeholder="ZIP"
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* Loss Payee */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Loss Payee{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  {lossPayeeEntities.map((entity, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={entity}
                        onChange={(e) => {
                          const updated = [...lossPayeeEntities];
                          updated[idx] = e.target.value;
                          setLossPayeeEntities(updated);
                        }}
                        placeholder="Loss payee entity name"
                        className="flex-1"
                      />
                      {lossPayeeEntities.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            setLossPayeeEntities(lossPayeeEntities.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLossPayeeEntities([...lossPayeeEntities, ''])}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Loss Payee
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {/* Additional Insured display */}
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Additional Insured
                  </span>
                  {property.additional_insured_entities?.filter(Boolean).length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {property.additional_insured_entities.filter(Boolean).map((e, i) => (
                        <Badge key={i} variant="secondary">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground italic">None set</p>
                  )}
                </div>

                {/* Certificate Holder display */}
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Certificate Holder
                  </span>
                  {property.certificate_holder_name ? (
                    <div className="mt-0.5">
                      <p className="font-medium">{property.certificate_holder_name}</p>
                      {property.certificate_holder_address_line1 && (
                        <p className="text-muted-foreground">
                          {property.certificate_holder_address_line1}
                        </p>
                      )}
                      {property.certificate_holder_address_line2 && (
                        <p className="text-muted-foreground">
                          {property.certificate_holder_address_line2}
                        </p>
                      )}
                      {(property.certificate_holder_city ||
                        property.certificate_holder_state ||
                        property.certificate_holder_zip) && (
                        <p className="text-muted-foreground">
                          {[
                            property.certificate_holder_city,
                            property.certificate_holder_state,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                          {property.certificate_holder_zip
                            ? ` ${property.certificate_holder_zip}`
                            : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground italic">None set</p>
                  )}
                </div>

                {/* Loss Payee display */}
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Loss Payee
                  </span>
                  {property.loss_payee_entities?.filter(Boolean).length ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {property.loss_payee_entities.filter(Boolean).map((e, i) => (
                        <Badge key={i} variant="secondary">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground italic">None set</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Vendor Requirements                                               */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Vendor Requirements
            </h2>
            <Button
              size="sm"
              onClick={handleSaveRequirements}
              disabled={!reqsDirty || upsertReqsMutation.isPending}
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              {upsertReqsMutation.isPending ? 'Saving...' : 'Save Requirements'}
            </Button>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* General Liability */}
            <CoverageLimitSelect
              id="gl-per-occurrence"
              label="General Liability -- Per Occurrence"
              value={glPerOccurrence}
              onValueChange={(v) => {
                setGlPerOccurrence(v);
                markDirty();
              }}
            />
            <CoverageLimitSelect
              id="gl-aggregate"
              label="General Liability -- Aggregate"
              value={glAggregate}
              onValueChange={(v) => {
                setGlAggregate(v);
                markDirty();
              }}
            />

            {/* Auto Liability */}
            <CoverageLimitSelect
              id="auto-liability"
              label="Auto Liability -- Limit"
              value={autoLiability}
              onValueChange={(v) => {
                setAutoLiability(v);
                markDirty();
              }}
            />

            {/* Auto Hired & Non-Owned checkbox */}
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
              <Switch
                id="auto-hired"
                checked={autoHiredNonOwned}
                onCheckedChange={(checked) => {
                  setAutoHiredNonOwned(!!checked);
                  markDirty();
                }}
              />
              <Label htmlFor="auto-hired" className="text-sm cursor-pointer">
                Hired &amp; Non-Owned Auto Required
              </Label>
            </div>

            {/* Workers Compensation toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="wc-required"
                checked={wcRequired}
                onCheckedChange={(checked) => {
                  setWcRequired(!!checked);
                  markDirty();
                }}
              />
              <Label htmlFor="wc-required" className="text-sm cursor-pointer">
                Workers' Compensation Required
              </Label>
            </div>

            {/* Employers' Liability */}
            <CoverageLimitSelect
              id="employers-liability"
              label="Employers' Liability -- Limit"
              value={employersLiability}
              onValueChange={(v) => {
                setEmployersLiability(v);
                markDirty();
              }}
            />

            {/* Umbrella / Excess */}
            <CoverageLimitSelect
              id="umbrella-liability"
              label="Umbrella / Excess -- Limit"
              value={umbrellaLiability}
              onValueChange={(v) => {
                setUmbrellaLiability(v);
                markDirty();
              }}
            />

            {/* Cancellation Notice Days */}
            <div className="space-y-1.5">
              <Label htmlFor="cancellation-days" className="text-sm">
                Cancellation Notice Days
              </Label>
              <Select
                value={cancellationDays}
                onValueChange={(v) => {
                  setCancellationDays(v);
                  markDirty();
                }}
              >
                <SelectTrigger id="cancellation-days" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_NOTICE_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Waiver of Subrogation */}
            <div className="flex items-center gap-3">
              <Switch
                id="wos"
                checked={waiverOfSubrogation}
                onCheckedChange={(checked) => {
                  setWaiverOfSubrogation(!!checked);
                  markDirty();
                }}
              />
              <Label htmlFor="wos" className="text-sm cursor-pointer">
                Waiver of Subrogation
              </Label>
            </div>

            {/* Blanket Additional Insured */}
            <div className="flex items-center gap-3">
              <Switch
                id="blanket-ai"
                checked={blanketAI}
                onCheckedChange={(checked) => {
                  setBlanketAI(!!checked);
                  markDirty();
                }}
              />
              <Label htmlFor="blanket-ai" className="text-sm cursor-pointer">
                Blanket Additional Insured Accepted
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Vendors + Tenants tabs                                            */}
      {/* ---------------------------------------------------------------- */}
      <Tabs defaultValue="vendors">
        <TabsList>
          <TabsTrigger value="vendors" className="gap-2">
            <Truck className="h-4 w-4" />
            Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-2">
            <Users className="h-4 w-4" />
            Tenants ({tenants.length})
          </TabsTrigger>
        </TabsList>

        {/* ---- Vendors Tab ---- */}
        <TabsContent value="vendors">
          {vendors.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No vendors assigned"
              description="Add vendors to this property to track their COI compliance."
              actionLabel="Add Vendor"
              onAction={() => navigate('/vendors/add')}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor: Vendor) => (
                      <TableRow
                        key={vendor.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate('/vendors')}
                      >
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {vendor.email || vendor.contact_email || '--'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={vendor.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vendor.expiration_date ? formatDate(vendor.expiration_date) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---- Tenants Tab ---- */}
        <TabsContent value="tenants">
          {tenants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No tenants assigned"
              description="Add tenants to this property to track their lease compliance."
              actionLabel="Add Tenant"
              onAction={() => navigate('/tenants/add')}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Unit / Suite</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant: Tenant) => (
                      <TableRow
                        key={tenant.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate('/tenants')}
                      >
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {tenant.unit_suite || tenant.unit || '--'}
                        </TableCell>
                        <TableCell>
                          {tenant.tenant_type ? (
                            <Badge variant="secondary" className="capitalize">
                              {tenant.tenant_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={tenant.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.expiration_date ? formatDate(tenant.expiration_date) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
