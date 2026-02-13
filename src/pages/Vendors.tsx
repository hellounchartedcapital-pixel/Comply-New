import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Mail, Eye, Trash2, Building2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchVendors, deleteVendor } from '@/services/vendors';
import { fetchProperties } from '@/services/properties';
import { formatDate } from '@/lib/utils';
import { STATUS_CONFIG } from '@/constants';
import type { Vendor, Property } from '@/types';
import { Search, Filter } from 'lucide-react';

export default function Vendors() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');

  // Fetch vendors with filters
  const { data: vendorData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', statusFilter, propertyFilter, search],
    queryFn: () =>
      fetchVendors({
        status: statusFilter,
        propertyId: propertyFilter,
        search: search || undefined,
        pageSize: 100,
      }),
  });

  // Fetch properties for the property filter dropdown
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to delete vendor'),
  });

  const handleDelete = (vendor: Vendor) => {
    if (
      window.confirm(
        `Delete "${vendor.name}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(vendor.id);
    }
  };

  const handleRowClick = (vendor: Vendor) => {
    // Navigate to vendor detail page (future page)
    navigate(`/vendors/${vendor.id}`);
  };

  const vendors = vendorData?.data ?? [];

  if (vendorsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Vendors" subtitle="Manage vendor COI compliance across all properties" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="Manage vendor COI compliance across all properties"
        actions={
          <Button onClick={() => navigate('/vendors/add')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search by name */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors by name..."
            className="bg-secondary border-0 pl-10"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG)
              .filter(
                ([key]) =>
                  key === 'compliant' ||
                  key === 'non_compliant' ||
                  key === 'expiring_soon' ||
                  key === 'expired' ||
                  key === 'pending'
              )
              .map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Property filter */}
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Building2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {(properties ?? []).map((p: Property) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vendor Table or Empty State */}
      {vendors.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vendors yet"
          description="Add your first vendor to get started."
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
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow
                    key={vendor.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(vendor)}
                  >
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.email || vendor.contact_email ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" />
                          {vendor.email || vendor.contact_email}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.property?.name ?? 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={vendor.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.expiration_date
                        ? formatDate(vendor.expiration_date)
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vendors/${vendor.id}`);
                          }}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(vendor);
                          }}
                          title="Delete vendor"
                          disabled={deleteMutation.isPending}
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
