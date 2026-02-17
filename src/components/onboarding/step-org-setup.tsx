'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EntityEntry {
  id: string;
  entity_name: string;
  entity_address: string;
}

export interface OrgSetupData {
  companyName: string;
  certificateHolder: { entity_name: string; entity_address: string } | null;
  additionalInsured: EntityEntry[];
}

interface StepOrgSetupProps {
  data: OrgSetupData;
  onNext: (data: OrgSetupData) => void;
  saving: boolean;
}

export function StepOrgSetup({ data, onNext, saving }: StepOrgSetupProps) {
  const [companyName, setCompanyName] = useState(data.companyName);
  const [certHolderName, setCertHolderName] = useState(
    data.certificateHolder?.entity_name ?? ''
  );
  const [certHolderAddress, setCertHolderAddress] = useState(
    data.certificateHolder?.entity_address ?? ''
  );
  const [additionalInsured, setAdditionalInsured] = useState<EntityEntry[]>(
    data.additionalInsured.length > 0
      ? data.additionalInsured
      : [{ id: crypto.randomUUID(), entity_name: '', entity_address: '' }]
  );

  function addAdditionalInsured() {
    setAdditionalInsured((prev) => [
      ...prev,
      { id: crypto.randomUUID(), entity_name: '', entity_address: '' },
    ]);
  }

  function removeAdditionalInsured(id: string) {
    setAdditionalInsured((prev) => prev.filter((e) => e.id !== id));
  }

  function updateAdditionalInsured(
    id: string,
    field: 'entity_name' | 'entity_address',
    value: string
  ) {
    setAdditionalInsured((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;

    const certHolder =
      certHolderName.trim()
        ? { entity_name: certHolderName.trim(), entity_address: certHolderAddress.trim() }
        : null;

    const filtered = additionalInsured.filter((e) => e.entity_name.trim());

    onNext({
      companyName: companyName.trim(),
      certificateHolder: certHolder,
      additionalInsured: filtered,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Let&apos;s set up your account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your organization so we can configure SmartCOI for you.
        </p>
      </div>

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="companyName">Organization / Company name *</Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Property Management"
          required
        />
      </div>

      {/* Default Certificate Holder */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Default Certificate Holder
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This is typically your management company name and address. It will
            appear as the certificate holder on all vendor and tenant COIs.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="certHolderName" className="text-xs">
              Entity name
            </Label>
            <Input
              id="certHolderName"
              value={certHolderName}
              onChange={(e) => setCertHolderName(e.target.value)}
              placeholder="Acme Property Management LLC"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="certHolderAddress" className="text-xs">
              Address
            </Label>
            <Input
              id="certHolderAddress"
              value={certHolderAddress}
              onChange={(e) => setCertHolderAddress(e.target.value)}
              placeholder="123 Main St, Suite 400, New York, NY 10001"
            />
          </div>
        </div>
      </div>

      {/* Default Additional Insured Entities */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Default Additional Insured Entities
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These are the entities that must appear on every vendor and tenant
            COI. You can customize per property later.
          </p>
        </div>

        <div className="space-y-3">
          {additionalInsured.map((entity, idx) => (
            <div
              key={entity.id}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Entity name {idx === 0 && ''}
                </Label>
                <Input
                  value={entity.entity_name}
                  onChange={(e) =>
                    updateAdditionalInsured(entity.id, 'entity_name', e.target.value)
                  }
                  placeholder="Entity name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={entity.entity_address}
                  onChange={(e) =>
                    updateAdditionalInsured(entity.id, 'entity_address', e.target.value)
                  }
                  placeholder="Address"
                />
              </div>
              {additionalInsured.length > 1 && (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeAdditionalInsured(entity.id)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAdditionalInsured}
        >
          + Add another
        </Button>
      </div>

      <Button type="submit" size="lg" className="w-full font-semibold" disabled={saving}>
        {saving ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  );
}
