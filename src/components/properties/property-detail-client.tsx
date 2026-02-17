'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComplianceBadge } from './compliance-badge';
import { EditPropertyDialog } from './edit-property-dialog';
import { AddVendorDialog } from './add-vendor-dialog';
import { AddTenantDialog } from './add-tenant-dialog';
import { ConfirmDialog } from './confirm-dialog';
import {
  deleteProperty,
  softDeleteVendor,
  softDeleteTenant,
} from '@/lib/actions/properties';
import { toast } from 'sonner';
import type {
  Property,
  PropertyEntity,
  Vendor,
  Tenant,
  RequirementTemplate,
  ComplianceStatus,
  PropertyType,
} from '@/types';

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  office: 'Office',
  retail: 'Retail',
  industrial: 'Industrial',
  mixed_use: 'Mixed-Use',
  multifamily: 'Multifamily',
  other: 'Other',
};

type SortField = 'name' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<ComplianceStatus, number> = {
  non_compliant: 0,
  expired: 1,
  expiring_soon: 2,
  under_review: 3,
  pending: 4,
  compliant: 5,
};

interface PropertyDetailClientProps {
  property: Property;
  entities: PropertyEntity[];
  vendors: (Vendor & { template?: RequirementTemplate | null; latest_coi_date?: string | null })[];
  tenants: (Tenant & { template?: RequirementTemplate | null; latest_coi_date?: string | null })[];
  templates: RequirementTemplate[];
}

export function PropertyDetailClient({
  property,
  entities,
  vendors,
  tenants,
  templates,
}: PropertyDetailClientProps) {
  const router = useRouter();

  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [deletePropertyOpen, setDeletePropertyOpen] = useState(false);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [deleteTenantId, setDeleteTenantId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Vendor table state
  const [vendorStatusFilter, setVendorStatusFilter] = useState<string>('all');
  const [vendorSort, setVendorSort] = useState<{ field: SortField; dir: SortDir }>({
    field: 'name',
    dir: 'asc',
  });

  // Tenant table state
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>('all');
  const [tenantSort, setTenantSort] = useState<{ field: SortField; dir: SortDir }>({
    field: 'name',
    dir: 'asc',
  });

  // Address formatting
  const addressParts = [
    property.address,
    property.city,
    property.state ? `${property.state} ${property.zip ?? ''}`.trim() : property.zip,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

  const certHolders = entities.filter((e) => e.entity_type === 'certificate_holder');
  const additionalInsured = entities.filter((e) => e.entity_type === 'additional_insured');

  // Sort + filter logic
  function sortItems<T extends { company_name: string; compliance_status: ComplianceStatus }>(
    items: T[],
    sort: { field: SortField; dir: SortDir },
    statusFilter: string
  ): T[] {
    let filtered = items;
    if (statusFilter !== 'all') {
      filtered = items.filter((i) => i.compliance_status === statusFilter);
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort.field === 'name') {
        cmp = a.company_name.localeCompare(b.company_name);
      } else {
        cmp = STATUS_ORDER[a.compliance_status] - STATUS_ORDER[b.compliance_status];
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }

  function toggleSort(
    current: { field: SortField; dir: SortDir },
    field: SortField,
    setter: (v: { field: SortField; dir: SortDir }) => void
  ) {
    if (current.field === field) {
      setter({ field, dir: current.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setter({ field, dir: 'asc' });
    }
  }

  const filteredVendors = useMemo(
    () => sortItems(vendors, vendorSort, vendorStatusFilter),
    [vendors, vendorSort, vendorStatusFilter]
  );

  const filteredTenants = useMemo(
    () => sortItems(tenants, tenantSort, tenantStatusFilter),
    [tenants, tenantSort, tenantStatusFilter]
  );

  // Delete handlers
  async function handleDeleteProperty() {
    setDeleting(true);
    try {
      await deleteProperty(property.id);
      toast.success('Property deleted');
      router.push('/dashboard/properties');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete property');
    } finally {
      setDeleting(false);
      setDeletePropertyOpen(false);
    }
  }

  async function handleDeleteVendor() {
    if (!deleteVendorId) return;
    setDeleting(true);
    try {
      await softDeleteVendor(deleteVendorId, property.id);
      toast.success('Vendor removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove vendor');
    } finally {
      setDeleting(false);
      setDeleteVendorId(null);
    }
  }

  async function handleDeleteTenant() {
    if (!deleteTenantId) return;
    setDeleting(true);
    try {
      await softDeleteTenant(deleteTenantId, property.id);
      toast.success('Tenant removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove tenant');
    } finally {
      setDeleting(false);
      setDeleteTenantId(null);
    }
  }

  function SortIndicator({ field, current }: { field: SortField; current: { field: SortField; dir: SortDir } }) {
    if (current.field !== field) return <span className="ml-1 text-slate-300">&#x2195;</span>;
    return <span className="ml-1">{current.dir === 'asc' ? '&#x2191;' : '&#x2193;'}</span>;
  }

  function StatusFilterSelect({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="compliant">Compliant</SelectItem>
          <SelectItem value="non_compliant">Non-Compliant</SelectItem>
          <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="under_review">Under Review</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {property.name}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {PROPERTY_TYPE_LABELS[property.property_type]}
            </Badge>
          </div>
          {fullAddress && (
            <p className="mt-1 text-sm text-muted-foreground">{fullAddress}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit Property
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeletePropertyOpen(true)}
              >
                Delete Property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Entity Requirements */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Entity Requirements
          </h2>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit Entities
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          {certHolders.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Certificate Holder
              </p>
              {certHolders.map((e) => (
                <div key={e.id} className="mt-1">
                  <p className="text-sm font-medium text-foreground">
                    {e.entity_name}
                  </p>
                  {e.entity_address && (
                    <p className="text-xs text-muted-foreground">
                      {e.entity_address}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {additionalInsured.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Additional Insured
              </p>
              {additionalInsured.map((e) => (
                <div key={e.id} className="mt-1">
                  <p className="text-sm font-medium text-foreground">
                    {e.entity_name}
                  </p>
                  {e.entity_address && (
                    <p className="text-xs text-muted-foreground">
                      {e.entity_address}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {certHolders.length === 0 && additionalInsured.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No entities configured. Click &quot;Edit Entities&quot; to add certificate
              holders and additional insured entities.
            </p>
          )}
        </div>
      </div>

      {/* Vendors / Tenants Tabs */}
      <Tabs defaultValue="vendors">
        <TabsList>
          <TabsTrigger value="vendors">
            Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="tenants">
            Tenants ({tenants.length})
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusFilterSelect
              value={vendorStatusFilter}
              onChange={setVendorStatusFilter}
            />
            <Button size="sm" onClick={() => setAddVendorOpen(true)}>
              + Add Vendor
            </Button>
          </div>

          {vendors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No vendors for this property yet.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setAddVendorOpen(true)}
              >
                + Add Vendor
              </Button>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No vendors match the selected filter.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort(vendorSort, 'name', setVendorSort)}
                    >
                      Name <SortIndicator field="name" current={vendorSort} />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Template
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort(vendorSort, 'status', setVendorSort)}
                    >
                      Status <SortIndicator field="status" current={vendorSort} />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Last COI
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        {v.company_name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">{v.contact_name ?? '—'}</div>
                        {v.contact_email && (
                          <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {v.contact_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {v.vendor_type ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {v.template?.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ComplianceBadge status={v.compliance_status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {v.latest_coi_date ?? (
                            <span className="text-slate-400">None</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Upload COI</DropdownMenuItem>
                            <DropdownMenuItem>Send Follow-up</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteVendorId(v.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusFilterSelect
              value={tenantStatusFilter}
              onChange={setTenantStatusFilter}
            />
            <Button size="sm" onClick={() => setAddTenantOpen(true)}>
              + Add Tenant
            </Button>
          </div>

          {tenants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No tenants for this property yet.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setAddTenantOpen(true)}
              >
                + Add Tenant
              </Button>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No tenants match the selected filter.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort(tenantSort, 'name', setTenantSort)}
                    >
                      Name <SortIndicator field="name" current={tenantSort} />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Contact
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Template
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort(tenantSort, 'status', setTenantSort)}
                    >
                      Status <SortIndicator field="status" current={tenantSort} />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Last COI
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.company_name}
                        {t.unit_suite && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({t.unit_suite})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">{t.contact_name ?? '—'}</div>
                        {t.contact_email && (
                          <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {t.contact_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {t.tenant_type ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {t.template?.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ComplianceBadge status={t.compliance_status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {t.latest_coi_date ?? (
                            <span className="text-slate-400">None</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Upload COI</DropdownMenuItem>
                            <DropdownMenuItem>Send Follow-up</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTenantId(t.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EditPropertyDialog
        property={property}
        entities={entities}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AddVendorDialog
        propertyId={property.id}
        templates={templates}
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
      />
      <AddTenantDialog
        propertyId={property.id}
        templates={templates}
        open={addTenantOpen}
        onOpenChange={setAddTenantOpen}
      />
      <ConfirmDialog
        open={deletePropertyOpen}
        onOpenChange={setDeletePropertyOpen}
        title="Delete Property"
        description={
          vendors.length > 0 || tenants.length > 0
            ? 'This property has active vendors or tenants. Remove them before deleting the property.'
            : 'Are you sure you want to delete this property? This action cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDeleteProperty}
      />
      <ConfirmDialog
        open={deleteVendorId !== null}
        onOpenChange={(open) => !open && setDeleteVendorId(null)}
        title="Remove Vendor"
        description="Are you sure you want to remove this vendor? They will be archived and can be restored later."
        confirmLabel="Remove"
        destructive
        loading={deleting}
        onConfirm={handleDeleteVendor}
      />
      <ConfirmDialog
        open={deleteTenantId !== null}
        onOpenChange={(open) => !open && setDeleteTenantId(null)}
        title="Remove Tenant"
        description="Are you sure you want to remove this tenant? They will be archived and can be restored later."
        confirmLabel="Remove"
        destructive
        loading={deleting}
        onConfirm={handleDeleteTenant}
      />
    </div>
  );
}
