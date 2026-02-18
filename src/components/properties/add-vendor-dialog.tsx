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
import { createVendor } from '@/lib/actions/properties';
import { toast } from 'sonner';
import type { RequirementTemplate } from '@/types';

const VENDOR_TYPE_SUGGESTIONS = [
  'Janitorial',
  'HVAC',
  'Electrical',
  'Plumbing',
  'Roofing',
  'Landscaping',
  'Security',
  'Elevator',
  'Fire Protection',
  'General Contractor',
];

interface AddVendorDialogProps {
  propertyId: string;
  templates: RequirementTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string, name: string) => void;
}

export function AddVendorDialog({
  propertyId,
  templates,
  open,
  onOpenChange,
  onCreated,
}: AddVendorDialogProps) {
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const vendorTemplates = templates.filter((t) => t.category === 'vendor');

  function reset() {
    setCompanyName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setVendorType('');
    setTemplateId('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);

    try {
      const result = await createVendor({
        property_id: propertyId,
        company_name: companyName.trim(),
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        vendor_type: vendorType.trim() || undefined,
        template_id: templateId || undefined,
      });
      toast.success('Vendor added');
      const name = companyName.trim();
      reset();
      onOpenChange(false);
      onCreated?.(result.id, name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add vendor');
    } finally {
      setSaving(false);
    }
  }

  const filteredSuggestions = VENDOR_TYPE_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(vendorType.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
          <DialogDescription>
            Add a vendor to this property.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Company name *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ABC Contractors"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact name</Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="john@example.com"
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
              <Label>Vendor type</Label>
              <Input
                value={vendorType}
                onChange={(e) => {
                  setVendorType(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g., HVAC, Janitorial"
              />
              {showSuggestions && vendorType.length === 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-white shadow-md">
                  {VENDOR_TYPE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                      onMouseDown={() => {
                        setVendorType(s);
                        setShowSuggestions(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {showSuggestions && vendorType.length > 0 && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border bg-white shadow-md">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                      onMouseDown={() => {
                        setVendorType(s);
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
                {vendorTemplates.map((t) => (
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
              {saving ? 'Adding...' : 'Add Vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
