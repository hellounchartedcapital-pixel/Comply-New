import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Plus,
  Edit,
  Trash2,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { IconContainer } from '@/components/shared/IconContainer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchRequirementTemplates,
  createRequirementTemplate,
  updateRequirementTemplate,
  deleteRequirementTemplate,
} from '@/services/requirements';
import type { RequirementTemplate } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface TemplateFormData {
  name: string;
  entity_type: 'vendor' | 'tenant';
  description: string;
  coverages: RequirementTemplate['coverages'];
  endorsements: RequirementTemplate['endorsements'];
}

const EMPTY_FORM: TemplateFormData = {
  name: '',
  entity_type: 'vendor',
  description: '',
  coverages: {},
  endorsements: {},
};

function TemplateFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: TemplateFormData;
  onSubmit: (data: TemplateFormData) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<TemplateFormData>(initialData);

  const updateCoverage = (key: string, value: number | boolean) => {
    setForm((p) => ({
      ...p,
      coverages: { ...p.coverages, [key]: value },
    }));
  };

  const updateEndorsement = (key: string, value: number | boolean | string) => {
    setForm((p) => ({
      ...p,
      endorsements: { ...p.endorsements, [key]: value },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData.name ? 'Edit Template' : 'New Requirement Template'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Standard Vendor Requirements"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label>Entity Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.entity_type === 'vendor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm((p) => ({ ...p, entity_type: 'vendor' }))}
              >
                Vendor
              </Button>
              <Button
                type="button"
                variant={form.entity_type === 'tenant' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm((p) => ({ ...p, entity_type: 'tenant' }))}
              >
                Tenant
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-semibold">Coverage Limits</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">GL Occurrence</Label>
                <Input
                  type="number"
                  value={form.coverages.general_liability_occurrence ?? ''}
                  onChange={(e) => updateCoverage('general_liability_occurrence', Number(e.target.value))}
                  placeholder="1,000,000"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GL Aggregate</Label>
                <Input
                  type="number"
                  value={form.coverages.general_liability_aggregate ?? ''}
                  onChange={(e) => updateCoverage('general_liability_aggregate', Number(e.target.value))}
                  placeholder="2,000,000"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Auto Liability CSL</Label>
                <Input
                  type="number"
                  value={form.coverages.automobile_liability_csl ?? ''}
                  onChange={(e) => updateCoverage('automobile_liability_csl', Number(e.target.value))}
                  placeholder="1,000,000"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Umbrella Limit</Label>
                <Input
                  type="number"
                  value={form.coverages.umbrella_limit ?? ''}
                  onChange={(e) => updateCoverage('umbrella_limit', Number(e.target.value))}
                  placeholder="5,000,000"
                  className="h-8 text-xs"
                />
              </div>
              {form.entity_type === 'vendor' && (
                <div className="space-y-1">
                  <Label className="text-xs">Professional Liability</Label>
                  <Input
                    type="number"
                    value={form.coverages.professional_liability_limit ?? ''}
                    onChange={(e) => updateCoverage('professional_liability_limit', Number(e.target.value))}
                    placeholder="1,000,000"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              {form.entity_type === 'tenant' && (
                <div className="space-y-1">
                  <Label className="text-xs">Property Insurance</Label>
                  <Input
                    type="number"
                    value={form.coverages.property_insurance_limit ?? ''}
                    onChange={(e) => updateCoverage('property_insurance_limit', Number(e.target.value))}
                    placeholder="500,000"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.coverages.workers_comp_statutory ?? false}
                onCheckedChange={(v) => updateCoverage('workers_comp_statutory', v)}
              />
              <Label className="text-xs">Workers&apos; Comp (Statutory)</Label>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-semibold">Endorsements</p>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.endorsements.require_additional_insured ?? false}
                onCheckedChange={(v) => updateEndorsement('require_additional_insured', v)}
              />
              <Label className="text-xs">Require Additional Insured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.endorsements.require_waiver_of_subrogation ?? false}
                onCheckedChange={(v) => updateEndorsement('require_waiver_of_subrogation', v)}
              />
              <Label className="text-xs">Require Waiver of Subrogation</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cancellation Notice Days</Label>
              <Input
                type="number"
                value={form.endorsements.cancellation_notice_days ?? ''}
                onChange={(e) => updateEndorsement('cancellation_notice_days', Number(e.target.value))}
                placeholder="30"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: RequirementTemplate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const coverageItems: Array<{ label: string; value: string }> = [];

  if (template.coverages.general_liability_occurrence) {
    coverageItems.push({
      label: 'General Liability',
      value: `${formatCurrency(template.coverages.general_liability_occurrence)} / ${
        template.coverages.general_liability_aggregate
          ? formatCurrency(template.coverages.general_liability_aggregate)
          : 'N/A'
      }`,
    });
  }
  if (template.coverages.automobile_liability_csl) {
    coverageItems.push({
      label: 'Automobile Liability',
      value: `${formatCurrency(template.coverages.automobile_liability_csl)} CSL`,
    });
  }
  if (template.coverages.workers_comp_statutory) {
    coverageItems.push({ label: "Workers' Compensation", value: 'Statutory' });
  }
  if (template.coverages.umbrella_limit) {
    coverageItems.push({ label: 'Umbrella / Excess', value: formatCurrency(template.coverages.umbrella_limit) });
  }
  if (template.coverages.professional_liability_limit) {
    coverageItems.push({ label: 'Professional Liability', value: formatCurrency(template.coverages.professional_liability_limit) });
  }
  if (template.coverages.property_insurance_limit) {
    coverageItems.push({ label: 'Property Insurance', value: formatCurrency(template.coverages.property_insurance_limit) });
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconContainer icon={Shield} />
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.description && (
                <CardDescription className="mt-0.5">{template.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit template">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (window.confirm(`Delete template "${template.name}"?`)) {
                  onDelete();
                }
              }}
              aria-label="Delete template"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {coverageItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coverages configured</p>
        ) : (
          coverageItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
              <span className="text-sm">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.value}</span>
                <Badge variant="success" className="text-[10px]">Required</Badge>
              </div>
            </div>
          ))
        )}
        {template.endorsements.require_additional_insured && (
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
            <span className="text-sm">Additional Insured</span>
            <Badge variant="success" className="text-[10px]">Required</Badge>
          </div>
        )}
        {template.endorsements.require_waiver_of_subrogation && (
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
            <span className="text-sm">Waiver of Subrogation</span>
            <Badge variant="success" className="text-[10px]">Required</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Requirements() {
  const queryClient = useQueryClient();
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RequirementTemplate | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['requirement-templates'],
    queryFn: fetchRequirementTemplates,
  });

  const createMutation = useMutation({
    mutationFn: createRequirementTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirement-templates'] });
      setShowFormDialog(false);
      toast.success('Template created successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RequirementTemplate> }) =>
      updateRequirementTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirement-templates'] });
      setEditingTemplate(null);
      setShowFormDialog(false);
      toast.success('Template updated successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update template'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRequirementTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirement-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete template'),
  });

  const vendorTemplates = (templates ?? []).filter((t) => t.entity_type === 'vendor');
  const tenantTemplates = (templates ?? []).filter((t) => t.entity_type === 'tenant');

  const handleFormSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Requirements" subtitle="Manage insurance requirement templates" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements"
        subtitle="Manage insurance requirement templates"
        actions={
          <Button onClick={() => { setEditingTemplate(null); setShowFormDialog(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        }
      />

      <Tabs defaultValue="vendor">
        <TabsList>
          <TabsTrigger value="vendor">Vendor Templates ({vendorTemplates.length})</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Templates ({tenantTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="vendor">
          {vendorTemplates.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No vendor templates"
              description="Create a requirement template to define the insurance coverage limits vendors must meet."
              actionLabel="Create Template"
              onAction={() => { setEditingTemplate(null); setShowFormDialog(true); }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {vendorTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => { setEditingTemplate(t); setShowFormDialog(true); }}
                  onDelete={() => deleteMutation.mutate(t.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tenant">
          {tenantTemplates.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No tenant templates"
              description="Create a requirement template to define the insurance coverage limits tenants must meet."
              actionLabel="Create Template"
              onAction={() => { setEditingTemplate(null); setShowFormDialog(true); }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tenantTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => { setEditingTemplate(t); setShowFormDialog(true); }}
                  onDelete={() => deleteMutation.mutate(t.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TemplateFormDialog
        open={showFormDialog}
        onOpenChange={(open) => {
          setShowFormDialog(open);
          if (!open) setEditingTemplate(null);
        }}
        initialData={
          editingTemplate
            ? {
                name: editingTemplate.name,
                entity_type: editingTemplate.entity_type,
                description: editingTemplate.description ?? '',
                coverages: editingTemplate.coverages,
                endorsements: editingTemplate.endorsements,
              }
            : EMPTY_FORM
        }
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
