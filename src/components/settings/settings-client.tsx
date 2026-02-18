'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  updateOrgName,
  updateContactInfo,
  updateDefaultEntities,
  updateNotificationPreferences,
  type DefaultEntityInput,
  type NotificationPreferencesInput,
} from '@/lib/actions/settings';
import type { OrganizationDefaultEntity, OrganizationSettings, EntityType } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface SettingsClientProps {
  orgName: string;
  orgSettings: OrganizationSettings;
  pmName: string;
  pmEmail: string;
  defaultEntities: OrganizationDefaultEntity[];
}

// ============================================================================
// Component
// ============================================================================

export function SettingsClient({
  orgName: initialOrgName,
  orgSettings,
  pmName: initialPmName,
  pmEmail: initialPmEmail,
  defaultEntities: initialEntities,
}: SettingsClientProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization, contact info, default entities, and notification preferences.
        </p>
      </div>

      <OrganizationSection initialName={initialOrgName} />
      <ContactSection initialName={initialPmName} initialEmail={initialPmEmail} />
      <DefaultEntitiesSection initialEntities={initialEntities} />
      <NotificationSection settings={orgSettings} />
    </div>
  );
}

// ============================================================================
// Organization Section
// ============================================================================

function OrganizationSection({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateOrgName(name);
      toast.success('Organization name updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-foreground">Organization</h2>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="orgName" className="text-xs">Organization Name</Label>
          <Input
            id="orgName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Company Name"
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={saving || name === initialName} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Contact Info Section
// ============================================================================

function ContactSection({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    setSaving(true);
    try {
      await updateContactInfo(fullName, email);
      toast.success('Contact info updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  const isDirty = fullName !== initialName || email !== initialEmail;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-foreground">Contact Information</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Used in notification emails and portal pages as the PM contact.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pmName" className="text-xs">PM Name</Label>
          <Input
            id="pmName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pmEmail" className="text-xs">PM Email</Label>
          <Input
            id="pmEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={saving || !isDirty} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Default Entities Section
// ============================================================================

interface EntityEntry {
  id: string;
  entity_name: string;
  entity_address: string;
  entity_type: EntityType;
}

function DefaultEntitiesSection({
  initialEntities,
}: {
  initialEntities: OrganizationDefaultEntity[];
}) {
  const [entities, setEntities] = useState<EntityEntry[]>(() => {
    if (initialEntities.length === 0) {
      return [
        {
          id: crypto.randomUUID(),
          entity_name: '',
          entity_address: '',
          entity_type: 'certificate_holder' as EntityType,
        },
      ];
    }
    return initialEntities.map((e) => ({
      id: e.id,
      entity_name: e.entity_name,
      entity_address: e.entity_address ?? '',
      entity_type: e.entity_type,
    }));
  });
  const [saving, setSaving] = useState(false);

  function addEntity(type: EntityType) {
    setEntities((prev) => [
      ...prev,
      { id: crypto.randomUUID(), entity_name: '', entity_address: '', entity_type: type },
    ]);
  }

  function removeEntity(id: string) {
    setEntities((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEntity(id: string, field: 'entity_name' | 'entity_address', value: string) {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const inputs: DefaultEntityInput[] = entities
        .filter((e) => e.entity_name.trim())
        .map((e) => ({
          entity_name: e.entity_name,
          entity_address: e.entity_address,
          entity_type: e.entity_type,
        }));
      await updateDefaultEntities(inputs);
      toast.success('Default entities updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  const certHolders = entities.filter((e) => e.entity_type === 'certificate_holder');
  const additionalInsured = entities.filter((e) => e.entity_type === 'additional_insured');

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-foreground">Default Entities</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Default certificate holder and additional insured entities for new properties.
      </p>

      {/* Certificate Holder */}
      <div className="mt-4">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Certificate Holder
        </h3>
        <div className="mt-2 space-y-2">
          {certHolders.map((entity) => (
            <div key={entity.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={entity.entity_name}
                onChange={(e) => updateEntity(entity.id, 'entity_name', e.target.value)}
                placeholder="Entity name"
              />
              <Input
                value={entity.entity_address}
                onChange={(e) => updateEntity(entity.id, 'entity_address', e.target.value)}
                placeholder="Address"
              />
              {certHolders.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntity(entity.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insured */}
      <div className="mt-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Additional Insured Entities
        </h3>
        <div className="mt-2 space-y-2">
          {additionalInsured.length === 0 && (
            <p className="text-xs text-muted-foreground">No additional insured entities.</p>
          )}
          {additionalInsured.map((entity) => (
            <div key={entity.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={entity.entity_name}
                onChange={(e) => updateEntity(entity.id, 'entity_name', e.target.value)}
                placeholder="Entity name"
              />
              <Input
                value={entity.entity_address}
                onChange={(e) => updateEntity(entity.id, 'entity_address', e.target.value)}
                placeholder="Address"
              />
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
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addEntity('additional_insured')}
          >
            + Add additional insured
          </Button>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Entities'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Notification Preferences Section
// ============================================================================

function NotificationSection({ settings }: { settings: OrganizationSettings }) {
  const prefs = settings.notification_preferences;
  const [warningDays, setWarningDays] = useState<string>(
    (prefs?.expiration_warning_days ?? [60, 30, 14]).join(', ')
  );
  const [autoFollowUp, setAutoFollowUp] = useState(prefs?.auto_follow_up_enabled ?? false);
  const [followUpFrequency, setFollowUpFrequency] = useState(
    String(prefs?.follow_up_frequency_days ?? 14)
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const days = warningDays
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => b - a);
    if (days.length === 0) {
      toast.error('Enter at least one warning threshold');
      return;
    }
    const freq = parseInt(followUpFrequency, 10);
    if (isNaN(freq) || freq < 1) {
      toast.error('Follow-up frequency must be at least 1 day');
      return;
    }

    setSaving(true);
    try {
      const input: NotificationPreferencesInput = {
        expiration_warning_days: days,
        auto_follow_up_enabled: autoFollowUp,
        follow_up_frequency_days: freq,
      };
      await updateNotificationPreferences(input);
      // Normalize the display
      setWarningDays(days.join(', '));
      toast.success('Notification preferences updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-foreground">Notification Preferences</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Configure when and how compliance notifications are sent.
      </p>
      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="warningDays" className="text-xs">
            Expiration Warning Thresholds (days before expiration)
          </Label>
          <Input
            id="warningDays"
            value={warningDays}
            onChange={(e) => setWarningDays(e.target.value)}
            placeholder="60, 30, 14"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of days. Notifications will be sent at each threshold.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Auto-send Follow-ups</Label>
            <p className="text-xs text-muted-foreground">
              Automatically send follow-up emails for non-compliant entities.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoFollowUp}
            onClick={() => setAutoFollowUp(!autoFollowUp)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              autoFollowUp ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoFollowUp ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="followUpFreq" className="text-xs">
            Follow-up Frequency (days)
          </Label>
          <Input
            id="followUpFreq"
            type="number"
            min="1"
            value={followUpFrequency}
            onChange={(e) => setFollowUpFrequency(e.target.value)}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            How often to re-send follow-ups for unresolved compliance gaps.
          </p>
        </div>

        <div className="flex justify-end">
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}
