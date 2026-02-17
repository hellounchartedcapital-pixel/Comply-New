'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PropertyType, EntityType } from '@/types';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const;

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed-Use' },
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'other', label: 'Other' },
];

interface EntityEntry {
  id: string;
  entity_name: string;
  entity_address: string;
  entity_type: EntityType;
}

export interface PropertyFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: PropertyType;
  entities: EntityEntry[];
}

interface PropertyFormProps {
  initial?: PropertyFormData;
  defaultEntities?: { entity_name: string; entity_address: string | null; entity_type: EntityType }[];
  onSubmit: (data: PropertyFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  submitLabel?: string;
}

export function PropertyForm({
  initial,
  defaultEntities,
  onSubmit,
  onCancel,
  saving,
  submitLabel = 'Save',
}: PropertyFormProps) {
  function buildInitialEntities(): EntityEntry[] {
    if (initial?.entities && initial.entities.length > 0) return initial.entities;
    if (defaultEntities && defaultEntities.length > 0) {
      return defaultEntities.map((e) => ({
        id: crypto.randomUUID(),
        entity_name: e.entity_name,
        entity_address: e.entity_address ?? '',
        entity_type: e.entity_type,
      }));
    }
    return [];
  }

  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [state, setState] = useState(initial?.state ?? '');
  const [zip, setZip] = useState(initial?.zip ?? '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    initial?.property_type ?? 'office'
  );
  const [entities, setEntities] = useState<EntityEntry[]>(buildInitialEntities());

  function addEntity() {
    setEntities((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        entity_name: '',
        entity_address: '',
        entity_type: 'additional_insured',
      },
    ]);
  }

  function removeEntity(id: string) {
    setEntities((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEntity(id: string, field: keyof EntityEntry, value: string) {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state,
      zip: zip.trim(),
      property_type: propertyType,
      entities: entities.filter((e) => e.entity_name.trim()),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Property details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prop-name">Property name *</Label>
          <Input
            id="prop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="100 Park Avenue"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prop-address">Street address</Label>
          <Input
            id="prop-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="100 Park Avenue"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="prop-city">City</Label>
            <Input
              id="prop-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
            />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-zip">ZIP</Label>
            <Input
              id="prop-zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="10178"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Property type</Label>
          <Select
            value={propertyType}
            onValueChange={(v) => setPropertyType(v as PropertyType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>
                  {pt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Entities */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Certificate Holder &amp; Additional Insured
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Entities required on COIs for this property.
          </p>
        </div>

        {entities.map((entity) => (
          <div
            key={entity.id}
            className="grid gap-2 sm:grid-cols-[100px_1fr_1fr_auto]"
          >
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={entity.entity_type}
                onValueChange={(v) => updateEntity(entity.id, 'entity_type', v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certificate_holder">Cert Holder</SelectItem>
                  <SelectItem value="additional_insured">Add&apos;l Insured</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entity name</Label>
              <Input
                className="h-9 text-sm"
                value={entity.entity_name}
                onChange={(e) =>
                  updateEntity(entity.id, 'entity_name', e.target.value)
                }
                placeholder="Entity name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                className="h-9 text-sm"
                value={entity.entity_address}
                onChange={(e) =>
                  updateEntity(entity.id, 'entity_address', e.target.value)
                }
                placeholder="Address"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground hover:text-destructive"
                onClick={() => removeEntity(entity.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addEntity}>
          + Add entity
        </Button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
