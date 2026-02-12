import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchFilter } from '@/components/shared/SearchFilter';
import { EmptyState } from '@/components/shared/EmptyState';
import { IconContainer } from '@/components/shared/IconContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProperties, createProperty } from '@/services/properties';

export default function Properties() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newOwnershipEntity, setNewOwnershipEntity] = useState('');

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setShowAddDialog(false);
      setNewName('');
      setNewAddress('');
      setNewOwnershipEntity('');
      toast.success('Property created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create property');
    },
  });

  const filtered = (properties ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Properties" subtitle="Manage your buildings and properties" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle="Manage your buildings and properties"
        actions={
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        }
      />

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search properties..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start tracking vendor and tenant compliance."
          actionLabel="Add Property"
          onAction={() => setShowAddDialog(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => {
            const compliance = property.compliance_percentage ?? 0;
            return (
              <Card
                key={property.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <IconContainer icon={Building2} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{property.name}</h3>
                      {property.address && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{property.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {property.vendor_count ?? 0} vendors, {property.tenant_count ?? 0} tenants
                      </span>
                      <span className="font-medium">{compliance}%</span>
                    </div>
                    <Progress value={compliance} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name: newName, address: newAddress || undefined, ownership_entity: newOwnershipEntity || undefined });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="prop-name">Property Name</Label>
              <Input
                id="prop-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Sunset Business Park"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-address">Address</Label>
              <Input
                id="prop-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="e.g., 123 Main St, Suite 100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-entity">Ownership Entity / Property LLC</Label>
              <Input
                id="prop-entity"
                value={newOwnershipEntity}
                onChange={(e) => setNewOwnershipEntity(e.target.value)}
                placeholder="e.g., Sunset Holdings LLC"
              />
              <p className="text-xs text-muted-foreground">
                The legal entity that owns this property
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create Property
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
