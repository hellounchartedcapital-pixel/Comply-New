'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { createTenant } from '@/lib/actions/properties';
import { toast } from 'sonner';
import type { RequirementTemplate } from '@/types';

const TENANT_TYPE_SUGGESTIONS = [
  'Retail',
  'Restaurant',
  'Office',
  'Medical',
  'Warehouse',
  'Industrial',
];

interface AddTenantDialogProps {
  propertyId: string;
  templates: RequirementTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTenantDialog({
  propertyId,
  templates,
  open,
  onOpenChange,
}: AddTenantDialogProps) {
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [unitSuite, setUnitSuite] = useState('');
  const [tenantType, setTenantType] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const tenantTemplates = templates.filter((t) => t.category === 'tenant');

  function reset() {
    setCompanyName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setUnitSuite('');
    setTenantType('');
    setTemplateId('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);

    try {
      await createTenant({
        property_id: propertyId,
        company_name: companyName.trim(),
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        unit_suite: unitSuite.trim() || undefined,
        tenant_type: tenantType.trim() || undefined,
        template_id: templateId || undefined,
      });
      toast.success('Tenant added');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add tenant');
    } finally {
      setSaving(false);
    }
  }

  const filteredSuggestions = TENANT_TYPE_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(tenantType.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Tenant</DialogTitle>
          <DialogDescription>
            Add a tenant to this property.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Company name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Unit / Suite</Label>
              <Input
                value={unitSuite}
                onChange={(e) => setUnitSuite(e.target.value)}
                placeholder="Suite 400"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jane@acme.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="relative space-y-2">
              <Label>Tenant type</Label>
              <Input
                value={tenantType}
                onChange={(e) => {
                  setTenantType(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g., Retail, Office"
              />
              {showSuggestions && tenantType.length === 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-white shadow-md">
                  {TENANT_TYPE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                      onMouseDown={() => {
                        setTenantType(s);
                        setShowSuggestions(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {showSuggestions && tenantType.length > 0 && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-white shadow-md">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                      onMouseDown={() => {
                        setTenantType(s);
                        setShowSuggestions(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Requirement template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                {tenantTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !companyName.trim()}>
              {saving ? 'Adding...' : 'Add Tenant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
