'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PropertyForm, type PropertyFormData } from './property-form';
import { createProperty } from '@/lib/actions/properties';
import { toast } from 'sonner';
import { useUpgradeModal } from '@/components/dashboard/upgrade-modal';
import { handleActionError } from '@/lib/handle-action-error';
import type { EntityType } from '@/types';

interface AddPropertyButtonProps {
  defaultEntities: {
    entity_name: string;
    entity_address: string | null;
    entity_type: EntityType;
  }[];
  orgId: string;
  variant?: 'default' | 'outline';
}

export function AddPropertyButton({
  defaultEntities,
  variant = 'default',
}: AddPropertyButtonProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showUpgradeModal } = useUpgradeModal();

  async function handleSubmit(data: PropertyFormData) {
    setSaving(true);
    try {
      await createProperty({
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
      toast.success('Property created');
      setOpen(false);
    } catch (err) {
      handleActionError(err, 'Failed to create property', showUpgradeModal);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        + Add Property
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
            <DialogDescription>
              Add a new property to your portfolio.
            </DialogDescription>
          </DialogHeader>
          <PropertyForm
            defaultEntities={defaultEntities}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            saving={saving}
            submitLabel="Create Property"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
