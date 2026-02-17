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
import { updateVendor } from '@/lib/actions/properties';
import { toast } from 'sonner';
import type { Vendor, RequirementTemplate } from '@/types';

const VENDOR_TYPE_SUGGESTIONS = [
  'Janitorial', 'HVAC', 'Electrical', 'Plumbing', 'Roofing',
  'Landscaping', 'Security', 'Elevator', 'Fire Protection', 'General Contractor',
];

interface EditVendorDialogProps {
  vendor: Vendor;
  templates: RequirementTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVendorDialog({
  vendor,
  templates,
  open,
  onOpenChange,
}: EditVendorDialogProps) {
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState(vendor.company_name);
  const [contactName, setContactName] = useState(vendor.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(vendor.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(vendor.contact_phone ?? '');
  const [vendorType, setVendorType] = useState(vendor.vendor_type ?? '');
  const [templateId, setTemplateId] = useState(vendor.template_id ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const vendorTemplates = templates.filter((t) => t.category === 'vendor');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      await updateVendor(vendor.id, {
        company_name: companyName.trim(),
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        vendor_type: vendorType.trim() || undefined,
        template_id: templateId || undefined,
      });
      toast.success('Vendor updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setSaving(false);
    }
  }

  const filtered = VENDOR_TYPE_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(vendorType.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Vendor</DialogTitle>
          <DialogDescription>Update vendor details and template assignment.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Company name *</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
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
              <Label>Vendor type</Label>
              <Input
                value={vendorType}
                onChange={(e) => { setVendorType(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g., HVAC"
              />
              {showSuggestions && filtered.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-white shadow-md">
                  {filtered.map((s) => (
                    <button key={s} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                      onMouseDown={() => { setVendorType(s); setShowSuggestions(false); }}
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
                {vendorTemplates.map((t) => (
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
