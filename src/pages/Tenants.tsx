import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, X, Mail, Phone, Building2, Calendar, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchFilter } from '@/components/shared/SearchFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTenants, createTenant, deleteTenant } from '@/services/tenants';
import { fetchProperties } from '@/services/properties';
import { formatDate } from '@/lib/utils';
import type { Tenant } from '@/types';

export default function Tenants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '', email: '', phone: '', unit: '',
    property_id: '', lease_start: '', lease_end: '',
  });

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ['tenants', statusFilter, search],
    queryFn: () => fetchTenants({ status: statusFilter, search: search || undefined, pageSize: 100 }),
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowAddDialog(false);
      setNewTenant({ name: '', email: '', phone: '', unit: '', property_id: '', lease_start: '', lease_end: '' });
      toast.success('Tenant created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create tenant'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setSelectedTenant(null);
      toast.success('Tenant deleted successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete tenant'),
  });

  const tenants = tenantData?.data ?? [];

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
          <Button onClick={() => setShowAddDialog(true)}>
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

      {tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No tenants found"
          description="Add your first tenant to start tracking their insurance compliance."
          actionLabel="Add Tenant"
          onAction={() => setShowAddDialog(true)}
        />
      ) : (
        <div className="flex gap-0">
          <Card className={selectedTenant ? 'flex-1' : 'w-full'}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lease End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow
                      key={tenant.id}
                      className="cursor-pointer"
                      data-state={selectedTenant?.id === tenant.id ? 'selected' : undefined}
                      onClick={() => setSelectedTenant(selectedTenant?.id === tenant.id ? null : tenant)}
                    >
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.property?.name ?? 'Unassigned'}</TableCell>
                      <TableCell className="text-muted-foreground">{tenant.unit ?? 'N/A'}</TableCell>
                      <TableCell><StatusBadge status={tenant.insurance_status} /></TableCell>
                      <TableCell className="text-muted-foreground">
                        {tenant.lease_end ? formatDate(tenant.lease_end) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedTenant && (
            <Card className="w-80 shrink-0 border-l-0 rounded-l-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{selectedTenant.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTenant(null)} aria-label="Close panel">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatusBadge status={selectedTenant.insurance_status} />
                <Separator />
                {selectedTenant.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedTenant.email}</span>
                  </div>
                )}
                {selectedTenant.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedTenant.phone}</span>
                  </div>
                )}
                {selectedTenant.property && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{selectedTenant.property.name}</span>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Lease Period</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {selectedTenant.lease_start ? formatDate(selectedTenant.lease_start) : 'N/A'}
                      {' - '}
                      {selectedTenant.lease_end ? formatDate(selectedTenant.lease_end) : 'N/A'}
                    </span>
                  </div>
                </div>
                {selectedTenant.unit && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Unit</p>
                    <p className="text-sm font-medium">{selectedTenant.unit}</p>
                  </div>
                )}
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/upload?type=tenant&id=${selectedTenant.id}`)}
                >
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Upload COI
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (window.confirm(`Delete tenant "${selectedTenant.name}"?`)) {
                      deleteMutation.mutate(selectedTenant.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Tenant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Tenant</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: newTenant.name,
                property_id: newTenant.property_id || undefined,
                unit: newTenant.unit || undefined,
                email: newTenant.email || undefined,
                phone: newTenant.phone || undefined,
                lease_start: newTenant.lease_start || undefined,
                lease_end: newTenant.lease_end || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="t-name">Tenant Name</Label>
              <Input id="t-name" value={newTenant.name} onChange={(e) => setNewTenant((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-property">Property</Label>
                <Select value={newTenant.property_id} onValueChange={(v) => setNewTenant((p) => ({ ...p, property_id: v }))}>
                  <SelectTrigger id="t-property"><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {(properties ?? []).map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-unit">Unit</Label>
                <Input id="t-unit" value={newTenant.unit} onChange={(e) => setNewTenant((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g., Suite 200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-email">Email</Label>
                <Input id="t-email" type="email" value={newTenant.email} onChange={(e) => setNewTenant((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-phone">Phone</Label>
                <Input id="t-phone" value={newTenant.phone} onChange={(e) => setNewTenant((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-lease-start">Lease Start</Label>
                <Input id="t-lease-start" type="date" value={newTenant.lease_start} onChange={(e) => setNewTenant((p) => ({ ...p, lease_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-lease-end">Lease End</Label>
                <Input id="t-lease-end" type="date" value={newTenant.lease_end} onChange={(e) => setNewTenant((p) => ({ ...p, lease_end: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create Tenant</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
