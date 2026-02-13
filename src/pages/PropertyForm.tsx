import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { fetchProperty, createProperty, updateProperty } from '@/services/properties';
import type { Property } from '@/types';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

interface FormData {
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  additional_insured_entities: string[];
  certificate_holder_name: string;
  certificate_holder_address_line1: string;
  certificate_holder_address_line2: string;
  certificate_holder_city: string;
  certificate_holder_state: string;
  certificate_holder_zip: string;
  loss_payee_entities: string[];
}

const emptyForm: FormData = {
  name: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  additional_insured_entities: [''],
  certificate_holder_name: '',
  certificate_holder_address_line1: '',
  certificate_holder_address_line2: '',
  certificate_holder_city: '',
  certificate_holder_state: '',
  certificate_holder_zip: '',
  loss_payee_entities: [],
};

export default function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [showLossPayee, setShowLossPayee] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (property) {
      setForm({
        name: property.name || '',
        address_street: property.address_street || '',
        address_city: property.address_city || '',
        address_state: property.address_state || '',
        address_zip: property.address_zip || '',
        additional_insured_entities:
          property.additional_insured_entities?.length
            ? property.additional_insured_entities
            : [''],
        certificate_holder_name: property.certificate_holder_name || '',
        certificate_holder_address_line1: property.certificate_holder_address_line1 || '',
        certificate_holder_address_line2: property.certificate_holder_address_line2 || '',
        certificate_holder_city: property.certificate_holder_city || '',
        certificate_holder_state: property.certificate_holder_state || '',
        certificate_holder_zip: property.certificate_holder_zip || '',
        loss_payee_entities: property.loss_payee_entities?.length ? property.loss_payee_entities : [],
      });
      if (property.loss_payee_entities?.length) setShowLossPayee(true);
    }
  }, [property]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        address_street: data.address_street || undefined,
        address_city: data.address_city || undefined,
        address_state: data.address_state || undefined,
        address_zip: data.address_zip || undefined,
        additional_insured_entities: data.additional_insured_entities.filter(Boolean),
        certificate_holder_name: data.certificate_holder_name || undefined,
        certificate_holder_address_line1: data.certificate_holder_address_line1 || undefined,
        certificate_holder_address_line2: data.certificate_holder_address_line2 || undefined,
        certificate_holder_city: data.certificate_holder_city || undefined,
        certificate_holder_state: data.certificate_holder_state || undefined,
        certificate_holder_zip: data.certificate_holder_zip || undefined,
        loss_payee_entities: data.loss_payee_entities.filter(Boolean),
      };
      if (isEdit) {
        return updateProperty(id!, payload as Partial<Property>);
      }
      return createProperty(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      toast.success(isEdit ? 'Property updated' : 'Property created');
      navigate(`/properties/${result.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Property name is required');
      return;
    }
    saveMutation.mutate(form);
  };

  const updateAI = (index: number, value: string) => {
    const updated = [...form.additional_insured_entities];
    updated[index] = value;
    setForm({ ...form, additional_insured_entities: updated });
  };

  const addAI = () => {
    setForm({ ...form, additional_insured_entities: [...form.additional_insured_entities, ''] });
  };

  const removeAI = (index: number) => {
    const updated = form.additional_insured_entities.filter((_, i) => i !== index);
    setForm({ ...form, additional_insured_entities: updated.length ? updated : [''] });
  };

  const updateLP = (index: number, value: string) => {
    const updated = [...form.loss_payee_entities];
    updated[index] = value;
    setForm({ ...form, loss_payee_entities: updated });
  };

  const addLP = () => {
    setForm({ ...form, loss_payee_entities: [...form.loss_payee_entities, ''] });
  };

  const removeLP = (index: number) => {
    const updated = form.loss_payee_entities.filter((_, i) => i !== index);
    setForm({ ...form, loss_payee_entities: updated });
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Property' : 'New Property'}</h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update property details and insurance identity' : 'Add a new property to manage COI compliance'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Main Street Office Building"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={form.address_street}
                  onChange={(e) => setForm({ ...form, address_street: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.address_city}
                  onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={form.address_state}
                    onChange={(e) => setForm({ ...form, address_state: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Select</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={form.address_zip}
                    onChange={(e) => setForm({ ...form, address_zip: e.target.value })}
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Identity</CardTitle>
            <CardDescription>
              These names and addresses will be checked on every COI for this property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Additional Insured */}
            <div className="space-y-3">
              <Label>Additional Insured Names</Label>
              <p className="text-xs text-muted-foreground">
                These names must appear as Additional Insured on all COIs for this property
              </p>
              {form.additional_insured_entities.map((entity, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={entity}
                    onChange={(e) => updateAI(i, e.target.value)}
                    placeholder="e.g., ABC Holdings, LLC"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAI(i)}
                    disabled={form.additional_insured_entities.length === 1 && !entity}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addAI}>
                <Plus className="mr-1 h-4 w-4" /> Add Name
              </Button>
            </div>

            <Separator />

            {/* Certificate Holder */}
            <div className="space-y-3">
              <Label>Certificate Holder</Label>
              <p className="text-xs text-muted-foreground">
                This will be checked on every COI for this property
              </p>
              <div>
                <Label htmlFor="ch_name">Name</Label>
                <Input
                  id="ch_name"
                  value={form.certificate_holder_name}
                  onChange={(e) => setForm({ ...form, certificate_holder_name: e.target.value })}
                  placeholder="e.g., ABC Holdings, LLC"
                />
              </div>
              <div>
                <Label htmlFor="ch_addr1">Address Line 1</Label>
                <Input
                  id="ch_addr1"
                  value={form.certificate_holder_address_line1}
                  onChange={(e) => setForm({ ...form, certificate_holder_address_line1: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ch_addr2">Address Line 2</Label>
                <Input
                  id="ch_addr2"
                  value={form.certificate_holder_address_line2}
                  onChange={(e) => setForm({ ...form, certificate_holder_address_line2: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ch_city">City</Label>
                  <Input
                    id="ch_city"
                    value={form.certificate_holder_city}
                    onChange={(e) => setForm({ ...form, certificate_holder_city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ch_state">State</Label>
                  <select
                    id="ch_state"
                    value={form.certificate_holder_state}
                    onChange={(e) => setForm({ ...form, certificate_holder_state: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Select</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="ch_zip">ZIP</Label>
                  <Input
                    id="ch_zip"
                    value={form.certificate_holder_zip}
                    onChange={(e) => setForm({ ...form, certificate_holder_zip: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Loss Payee (collapsed by default) */}
            <div>
              {!showLossPayee ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => {
                    setShowLossPayee(true);
                    if (!form.loss_payee_entities.length) {
                      setForm({ ...form, loss_payee_entities: [''] });
                    }
                  }}
                >
                  <ChevronDown className="mr-1 h-4 w-4" /> Add Loss Payee (optional)
                </Button>
              ) : (
                <div className="space-y-3">
                  <Label>Loss Payee Entities</Label>
                  {form.loss_payee_entities.map((entity, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={entity}
                        onChange={(e) => updateLP(i, e.target.value)}
                        placeholder="e.g., XYZ Lender, Inc."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLP(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addLP}>
                    <Plus className="mr-1 h-4 w-4" /> Add Loss Payee
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Property' : 'Create Property'}
          </Button>
        </div>
      </form>
    </div>
  );
}
