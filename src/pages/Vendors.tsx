import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, X, Mail, Phone, Building2, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { fetchVendors, createVendor, deleteVendor } from '@/services/vendors';
import { fetchProperties } from '@/services/properties';
import { formatDate } from '@/lib/utils';
import type { Vendor } from '@/types';

export default function Vendors() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', contact_name: '', contact_email: '', contact_phone: '', property_id: '' });

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

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowAddDialog(false);
      setNewVendor({ name: '', contact_name: '', contact_email: '', contact_phone: '', property_id: '' });
      toast.success('Vendor created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create vendor'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setSelectedVendor(null);
      toast.success('Vendor deleted successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete vendor'),
  });

  const vendors = vendorData?.data ?? [];

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
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
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

      {vendors.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No vendors found"
          description="Add your first vendor to start tracking their COI compliance."
          actionLabel="Add Vendor"
          onAction={() => setShowAddDialog(true)}
        />
      ) : (
        <div className="flex gap-0">
          <Card className={selectedVendor ? 'flex-1' : 'w-full'}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow
                      key={vendor.id}
                      className="cursor-pointer"
                      data-state={selectedVendor?.id === vendor.id ? 'selected' : undefined}
                      onClick={() => setSelectedVendor(selectedVendor?.id === vendor.id ? null : vendor)}
                    >
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.property?.name ?? 'Unassigned'}
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

          {selectedVendor && (
            <Card className="w-80 shrink-0 border-l-0 rounded-l-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{selectedVendor.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(null)} aria-label="Close panel">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <StatusBadge status={selectedVendor.status} />
                </div>
                <Separator />
                {selectedVendor.contact_name && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{selectedVendor.contact_name}</p>
                  </div>
                )}
                {selectedVendor.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedVendor.contact_email}</span>
                  </div>
                )}
                {selectedVendor.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedVendor.contact_phone}</span>
                  </div>
                )}
                {selectedVendor.property && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedVendor.property.name}</span>
                  </div>
                )}
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Expiration</p>
                  <p className="text-sm">
                    {selectedVendor.expiration_date
                      ? formatDate(selectedVendor.expiration_date)
                      : 'No COI on file'}
                  </p>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/upload?type=vendor&id=${selectedVendor.id}`)}
                >
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Upload COI
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm(`Delete vendor "${selectedVendor.name}"?`)) {
                      deleteMutation.mutate(selectedVendor.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Vendor
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: newVendor.name,
                property_id: newVendor.property_id || undefined,
                contact_name: newVendor.contact_name || undefined,
                contact_email: newVendor.contact_email || undefined,
                contact_phone: newVendor.contact_phone || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="v-name">Vendor Name</Label>
              <Input id="v-name" value={newVendor.name} onChange={(e) => setNewVendor((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-property">Property</Label>
              <Select value={newVendor.property_id} onValueChange={(v) => setNewVendor((p) => ({ ...p, property_id: v }))}>
                <SelectTrigger id="v-property"><SelectValue placeholder="Select a property" /></SelectTrigger>
                <SelectContent>
                  {(properties ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-contact">Contact Name</Label>
              <Input id="v-contact" value={newVendor.contact_name} onChange={(e) => setNewVendor((p) => ({ ...p, contact_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="v-email">Email</Label>
                <Input id="v-email" type="email" value={newVendor.contact_email} onChange={(e) => setNewVendor((p) => ({ ...p, contact_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-phone">Phone</Label>
                <Input id="v-phone" value={newVendor.contact_phone} onChange={(e) => setNewVendor((p) => ({ ...p, contact_phone: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create Vendor</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
