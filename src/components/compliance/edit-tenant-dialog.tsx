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
import { updateTenant } from '@/lib/actions/properties';
import { toast } from 'sonner';
import type { Tenant, RequirementTemplate } from '@/types';

const TENANT_TYPE_SUGGESTIONS = [
  'Retail', 'Restaurant', 'Office', 'Medical', 'Warehouse', 'Industrial',
];

interface EditTenantDialogProps {
  tenant: Tenant;
  templates: RequirementTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTenantDialog({
  tenant,
  templates,
  open,
  onOpenChange,
}: EditTenantDialogProps) {
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState(tenant.company_name);
  const [contactName, setContactName] = useState(tenant.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(tenant.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(tenant.contact_phone ?? '');
  const [unitSuite, setUnitSuite] = useState(tenant.unit_suite ?? '');
  const [tenantType, setTenantType] = useState(tenant.tenant_type ?? '');
  const [templateId, setTemplateId] = useState(tenant.template_id ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const tenantTemplates = templates.filter((t) => t.category === 'tenant');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      await updateTenant(tenant.id, {
        company_name: companyName.trim(),
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        unit_suite: unitSuite.trim() || undefined,
        tenant_type: tenantType.trim() || undefined,
        template_id: templateId || undefined,
      });
      toast.success('Tenant updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setSaving(false);
    }
  }

  const filtered = TENANT_TYPE_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(tenantType.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <DialogDescription>Update tenant details and template assignment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Company name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Unit / Suite</Label>
              <Input value={unitSuite} onChange={(e) => setUnitSuite(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="relative space-y-2">
              <Label>Tenant type</Label>
              <Input
                value={tenantType}
                onChange={(e) => { setTenantType(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g., Retail"
              />
              {showSuggestions && filtered.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-white shadow-md">
                  {filtered.map((s) => (
                    <button key={s} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                      onMouseDown={() => { setTenantType(s); setShowSuggestions(false); }}
                    >{s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Requirement template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
              <SelectContent>
                {tenantTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !companyName.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
