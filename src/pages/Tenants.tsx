import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Mail, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchFilter } from '@/components/shared/SearchFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTenants, deleteTenant } from '@/services/tenants';
import { fetchProperties } from '@/services/properties';
import { formatDate } from '@/lib/utils';
import type { Tenant, Property } from '@/types';

export default function Tenants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['tenants', statusFilter, propertyFilter, search],
    queryFn: () =>
      fetchTenants({
        status: statusFilter,
        propertyId: propertyFilter,
        search: search || undefined,
        pageSize: 100,
      }),
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Tenant deleted successfully');
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete tenant'
      ),
  });

  const handleDelete = (tenant: Tenant) => {
    if (
      window.confirm(
        `Delete ${tenant.name}? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(tenant.id);
    }
  };

  const tenants = tenantData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tenants"
          subtitle="Manage tenant COI compliance"
        />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Manage tenant COI compliance"
        actions={
          <Button onClick={() => navigate('/tenants/add')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search tenants..."
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={[
              { value: 'compliant', label: 'Compliant' },
              { value: 'non_compliant', label: 'Non-Compliant' },
              { value: 'expiring_soon', label: 'Expiring Soon' },
              { value: 'expired', label: 'Expired' },
              { value: 'pending', label: 'Pending' },
            ]}
            filterPlaceholder="Status"
          />
        </div>

        {properties && properties.length > 0 && (
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger
              className="w-full sm:w-[220px]"
              aria-label="Filter by property"
            >
              <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p: Property) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No tenants found"
          description="Add your first tenant to start tracking their COI compliance."
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
                  <TableHead>Email</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit/Suite</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant: Tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      {tenant.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.email ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" />
                          {tenant.email}
                        </span>
                      ) : (
                        <span className="text-xs text-destructive">
                          No email
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.property?.name ?? 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.unit_suite || tenant.unit || '--'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tenant.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.expiration_date
                        ? formatDate(tenant.expiration_date)
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            navigate(
                              `/upload?type=tenant&id=${tenant.id}`
                            )
                          }
                          title="Upload COI"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tenant)}
                          disabled={deleteMutation.isPending}
                          title="Delete tenant"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
