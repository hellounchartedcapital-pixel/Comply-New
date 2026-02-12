import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Mail, Upload, Eye, Trash2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchFilter } from '@/components/shared/SearchFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { EntityDetailModal } from '@/components/shared/EntityDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchVendors, deleteVendor, deleteVendors } from '@/services/vendors';
import { formatDate } from '@/lib/utils';
import type { Vendor } from '@/types';

export default function Vendors() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter] = useState('all');
  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: vendorData, isLoading } = useQuery({
    queryKey: ['vendors', statusFilter, propertyFilter, search],
    queryFn: () =>
      fetchVendors({
        status: statusFilter,
        propertyId: propertyFilter,
        search: search || undefined,
        pageSize: 100,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setDetailVendor(null);
      toast.success('Vendor deleted successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete vendor'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: deleteVendors,
    onSuccess: (_, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setSelectedIds(new Set());
      toast.success(`${deletedIds.length} vendor${deletedIds.length > 1 ? 's' : ''} deleted successfully`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete vendors'),
  });

  const vendors = vendorData?.data ?? [];

  const allSelected = vendors.length > 0 && vendors.every((v) => selectedIds.has(v.id));
  const someSelected = vendors.some((v) => selectedIds.has(v.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(vendors.map((v) => v.id)));
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
    if (window.confirm(`Delete ${count} vendor${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vendors" subtitle="Manage vendor COI compliance" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage vendor COI compliance"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/vendors/bulk-import')}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Button onClick={() => navigate('/vendors/add')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </div>
        }
      />

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendors..."
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
            {selectedIds.size} vendor{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete Selected`}
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

      {vendors.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vendors found"
          description="Add your first vendor to start tracking their COI compliance."
          actionLabel="Add Vendor"
          onAction={() => navigate('/vendors/add')}
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
                      aria-label="Select all vendors"
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
                {vendors.map((vendor) => (
                  <TableRow
                    key={vendor.id}
                    data-state={selectedIds.has(vendor.id) ? 'selected' : undefined}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedIds.has(vendor.id)}
                        onCheckedChange={() => toggleSelect(vendor.id)}
                        aria-label={`Select ${vendor.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.contact_email ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" />
                          {vendor.contact_email}
                        </span>
                      ) : (
                        <span className="text-xs text-destructive">No email</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.property?.name ?? 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={vendor.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.expiration_date ? formatDate(vendor.expiration_date) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDetailVendor(vendor)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/upload?type=vendor&id=${vendor.id}`)}
                          title="Upload COI"
                        >
                          <Upload className="h-4 w-4" />
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

      {detailVendor && (
        <EntityDetailModal
          open={!!detailVendor}
          onOpenChange={(open) => !open && setDetailVendor(null)}
          entity={detailVendor}
          entityType="vendor"
          onDelete={() => deleteMutation.mutate(detailVendor.id)}
          onEdit={() => navigate(`/upload?type=vendor&id=${detailVendor.id}`)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
