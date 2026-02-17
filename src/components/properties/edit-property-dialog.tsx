'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PropertyForm, type PropertyFormData } from './property-form';
import { updateProperty } from '@/lib/actions/properties';
import { toast } from 'sonner';
import type { Property, PropertyEntity } from '@/types';

interface EditPropertyDialogProps {
  property: Property;
  entities: PropertyEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPropertyDialog({
  property,
  entities,
  open,
  onOpenChange,
}: EditPropertyDialogProps) {
  const [saving, setSaving] = useState(false);

  const initial: PropertyFormData = {
    name: property.name,
    address: property.address ?? '',
    city: property.city ?? '',
    state: property.state ?? '',
    zip: property.zip ?? '',
    property_type: property.property_type,
    entities: entities.map((e) => ({
      id: e.id,
      entity_name: e.entity_name,
      entity_address: e.entity_address ?? '',
      entity_type: e.entity_type,
    })),
  };

  async function handleSubmit(data: PropertyFormData) {
    setSaving(true);
    try {
      await updateProperty(property.id, {
        name: data.name,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip: data.zip || undefined,
        property_type: data.property_type,
        entities: data.entities.map((e) => ({
          entity_name: e.entity_name,
          entity_address: e.entity_address || undefined,
          entity_type: e.entity_type,
        })),
      });
      toast.success('Property updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update property');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
          <DialogDescription>Update property details and entities.</DialogDescription>
        </DialogHeader>
        <PropertyForm
          initial={initial}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          saving={saving}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
