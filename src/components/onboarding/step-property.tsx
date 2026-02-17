'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PropertyType } from '@/types';
import type { OrgSetupData } from './step-org-setup';

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

interface PropertyEntityEntry {
  id: string;
  entity_name: string;
  entity_address: string;
  entity_type: 'certificate_holder' | 'additional_insured';
}

export interface PropertyData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: PropertyType;
  entities: PropertyEntityEntry[];
}

interface StepPropertyProps {
  orgData: OrgSetupData;
  data: PropertyData | null;
  onNext: (data: PropertyData) => void;
  onSkip: () => void;
  saving: boolean;
}

export function StepProperty({ orgData, data, onNext, onSkip, saving }: StepPropertyProps) {
  // Pre-populate entities from org defaults
  function buildDefaultEntities(): PropertyEntityEntry[] {
    const entities: PropertyEntityEntry[] = [];
    if (orgData.certificateHolder && orgData.certificateHolder.entity_name) {
      entities.push({
        id: crypto.randomUUID(),
        entity_name: orgData.certificateHolder.entity_name,
        entity_address: orgData.certificateHolder.entity_address,
        entity_type: 'certificate_holder',
      });
    }
    for (const ai of orgData.additionalInsured) {
      if (ai.entity_name.trim()) {
        entities.push({
          id: crypto.randomUUID(),
          entity_name: ai.entity_name,
          entity_address: ai.entity_address,
          entity_type: 'additional_insured',
        });
      }
    }
    return entities;
  }

  const [name, setName] = useState(data?.name ?? '');
  const [address, setAddress] = useState(data?.address ?? '');
  const [city, setCity] = useState(data?.city ?? '');
  const [state, setState] = useState(data?.state ?? '');
  const [zip, setZip] = useState(data?.zip ?? '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    data?.property_type ?? 'office'
  );
  const [entities, setEntities] = useState<PropertyEntityEntry[]>(
    data?.entities ?? buildDefaultEntities()
  );

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

  function updateEntity(
    id: string,
    field: 'entity_name' | 'entity_address',
    value: string
  ) {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onNext({
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Add your first property
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Properties are the buildings you manage. You can always add more later.
        </p>
      </div>

      {/* Property details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="propName">Property name *</Label>
          <Input
            id="propName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="100 Park Avenue"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="propAddress">Street address</Label>
          <Input
            id="propAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="100 Park Avenue"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="propCity">City</Label>
            <Input
              id="propCity"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propState">State</Label>
            <select
              id="propState"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select...</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="propZip">ZIP</Label>
            <Input
              id="propZip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="10178"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="propType">Property type</Label>
          <select
            id="propType"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as PropertyType)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Property entities (pre-populated from org defaults) */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Certificate Holder &amp; Additional Insured
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pre-filled from your organization defaults. Edit or add more for
            this property.
          </p>
        </div>

        <div className="space-y-3">
          {entities.map((entity) => (
            <div
              key={entity.id}
              className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]"
            >
              <div className="flex items-end">
                <span className="inline-flex h-10 items-center rounded-md bg-slate-100 px-2 text-xs font-medium text-slate-600">
                  {entity.entity_type === 'certificate_holder' ? 'Cert Holder' : 'Add\'l Insured'}
                </span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Entity name</Label>
                <Input
                  value={entity.entity_name}
                  onChange={(e) => updateEntity(entity.id, 'entity_name', e.target.value)}
                  placeholder="Entity name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={entity.entity_address}
                  onChange={(e) => updateEntity(entity.id, 'entity_address', e.target.value)}
                  placeholder="Address"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntity(entity.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addEntity}>
          + Add another
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full font-semibold" disabled={saving}>
          {saving ? 'Saving...' : 'Continue'}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-center text-sm text-muted-foreground hover:text-foreground"
          disabled={saving}
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
