import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Mail, Upload, Eye, Trash2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchFilter } from '@/components/shared/SearchFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityDetailModal } from '@/components/shared/EntityDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTenants, deleteTenant, deleteTenants } from '@/services/tenants';
import { generatePortalLink } from '@/services/portal-links';
import { formatDate } from '@/lib/utils';
import type { Tenant } from '@/types';

export default function Tenants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['tenants', statusFilter, search],
    queryFn: () => fetchTenants({ status: statusFilter, search: search || undefined, pageSize: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDetailTenant(null);
      toast.success('Tenant deleted successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete tenant'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: deleteTenants,
    onSuccess: (_, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setSelectedIds(new Set());
      toast.success(`${deletedIds.length} tenant${deletedIds.length > 1 ? 's' : ''} deleted successfully`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete tenants'),
  });

  const tenants = tenantData?.data ?? [];

  const allSelected = tenants.length > 0 && tenants.every((t) => selectedIds.has(t.id));
  const someSelected = tenants.some((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tenants.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (window.confirm(`Delete ${count} tenant${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleCopyPortalLink = async (tenant: Tenant) => {
    try {
      const link = await generatePortalLink('tenant', tenant.id);
      await navigator.clipboard.writeText(link);
      toast.success(`Portal link for ${tenant.name} copied to clipboard`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate portal link');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tenants" subtitle="Manage tenant insurance compliance" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Manage tenant insurance compliance"
        actions={
          <Button onClick={() => navigate('/tenants/add')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        }
      />

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tenants..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={[
          { value: 'compliant', label: 'Compliant' },
          { value: 'non-compliant', label: 'Non-Compliant' },
          { value: 'expiring', label: 'Expiring' },
          { value: 'expired', label: 'Expired' },
        ]}
        filterPlaceholder="Status"
      />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.size} tenant{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description="Add your first tenant to start tracking their insurance compliance."
          actionLabel="Add Tenant"
          onAction={() => navigate('/tenants/add')}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] pl-4">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all tenants"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    data-state={selectedIds.has(tenant.id) ? 'selected' : undefined}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedIds.has(tenant.id)}
                        onCheckedChange={() => toggleSelect(tenant.id)}
                        aria-label={`Select ${tenant.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.email ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" />
                          {tenant.email}
                        </span>
                      ) : (
                        <span className="text-xs text-destructive">No email</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tenant.property?.name ?? 'Unassigned'}</TableCell>
                    <TableCell><StatusBadge status={tenant.insurance_status} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.expiration_date ? formatDate(tenant.expiration_date) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDetailTenant(tenant)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/upload?type=tenant&id=${tenant.id}`)}
                          title="Upload COI"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyPortalLink(tenant)}
                          title="Copy portal link"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {detailTenant && (
        <EntityDetailModal
          open={!!detailTenant}
          onOpenChange={(open) => !open && setDetailTenant(null)}
          entity={detailTenant}
          entityType="tenant"
          onDelete={() => deleteMutation.mutate(detailTenant.id)}
          onEdit={() => navigate(`/upload?type=tenant&id=${detailTenant.id}`)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
