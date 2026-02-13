import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, MapPin, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

  // Insurance identity fields
  const [aiEntities, setAiEntities] = useState<string[]>(['']);
  const [certHolderName, setCertHolderName] = useState('');
  const [certHolderAddr1, setCertHolderAddr1] = useState('');
  const [certHolderAddr2, setCertHolderAddr2] = useState('');
  const [certHolderCity, setCertHolderCity] = useState('');
  const [certHolderState, setCertHolderState] = useState('');
  const [certHolderZip, setCertHolderZip] = useState('');
  const [lossPayeeEntities, setLossPayeeEntities] = useState<string[]>(['']);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const resetForm = () => {
    setNewName('');
    setNewAddress('');
    setNewOwnershipEntity('');
    setAiEntities(['']);
    setCertHolderName('');
    setCertHolderAddr1('');
    setCertHolderAddr2('');
    setCertHolderCity('');
    setCertHolderState('');
    setCertHolderZip('');
    setLossPayeeEntities(['']);
  };

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setShowAddDialog(false);
      resetForm();
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
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{property.vendor_count ?? 0} vendors, {property.tenant_count ?? 0} tenants</span>
                    </div>
                    <div className={`text-lg font-bold ${
                      compliance >= 80 ? 'text-emerald-600' :
                      compliance >= 50 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {compliance}%
                      <span className={`ml-1 text-xs font-medium ${
                        compliance >= 80 ? 'text-emerald-600/70' :
                        compliance >= 50 ? 'text-amber-600/70' :
                        'text-red-600/70'
                      }`}>Compliant</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: newName,
                address: newAddress || undefined,
                ownership_entity: newOwnershipEntity || undefined,
                additional_insured_entities: aiEntities.filter(Boolean),
                certificate_holder_name: certHolderName || undefined,
                certificate_holder_address_line1: certHolderAddr1 || undefined,
                certificate_holder_address_line2: certHolderAddr2 || undefined,
                certificate_holder_city: certHolderCity || undefined,
                certificate_holder_state: certHolderState || undefined,
                certificate_holder_zip: certHolderZip || undefined,
                loss_payee_entities: lossPayeeEntities.filter(Boolean),
              });
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

            {/* Insurance Identity Section */}
            <div className="border-t pt-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Insurance Identity</h4>
                <p className="text-xs text-muted-foreground">
                  These names appear on all COIs for this property
                </p>
              </div>

              {/* Additional Insured Names */}
              <div className="space-y-2">
                <Label>Additional Insured Names</Label>
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
                <Label>Certificate Holder</Label>
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
                    placeholder="State"
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
                <Label>Loss Payee <span className="text-muted-foreground font-normal">(optional)</span></Label>
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
                        onClick={() => setLossPayeeEntities(lossPayeeEntities.filter((_, i) => i !== idx))}
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
