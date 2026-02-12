import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchRequirementTemplates } from '@/services/requirements';
import { formatCurrency } from '@/lib/utils';
import type { EntityType, RequirementTemplate } from '@/types';

// Default preset templates matching the Requirements page presets
const VENDOR_PRESETS: RequirementTemplate[] = [
  {
    id: 'preset-standard-commercial',
    user_id: '',
    name: 'Standard Commercial',
    entity_type: 'vendor',
    description: 'General office vendors, maintenance, cleaning, landscaping',
    coverages: {
      general_liability_required: true,
      general_liability_occurrence: 1_000_000,
      automobile_liability_required: true,
      automobile_liability_csl: 1_000_000,
      automobile_liability_owned_hired_non_owned: true,
      workers_comp_statutory: true,
      workers_comp_accept_exemption: true,
      employers_liability_required: true,
      workers_comp_employers_liability: 500_000,
    },
    endorsements: {},
    created_at: '',
    updated_at: '',
  },
  {
    id: 'preset-high-risk-contractor',
    user_id: '',
    name: 'High-Risk Contractor',
    entity_type: 'vendor',
    description: 'Roofing, electrical, HVAC, plumbing, elevator, construction',
    coverages: {
      general_liability_required: true,
      general_liability_occurrence: 2_000_000,
      automobile_liability_required: true,
      automobile_liability_csl: 1_000_000,
      automobile_liability_owned_hired_non_owned: true,
      workers_comp_statutory: true,
      employers_liability_required: true,
      workers_comp_employers_liability: 500_000,
      umbrella_required: true,
      umbrella_limit: 5_000_000,
      professional_liability_required: true,
      professional_liability_limit: 1_000_000,
    },
    endorsements: {},
    created_at: '',
    updated_at: '',
  },
  {
    id: 'preset-low-risk-vendor',
    user_id: '',
    name: 'Low-Risk Vendor',
    entity_type: 'vendor',
    description: 'Janitorial, vending, courier, small deliveries',
    coverages: {
      general_liability_required: true,
      general_liability_occurrence: 500_000,
      automobile_liability_required: true,
      automobile_liability_csl: 500_000,
      workers_comp_statutory: true,
      employers_liability_required: true,
      workers_comp_employers_liability: 500_000,
    },
    endorsements: {},
    created_at: '',
    updated_at: '',
  },
];

const TENANT_PRESETS: RequirementTemplate[] = [
  {
    id: 'preset-standard-office',
    user_id: '',
    name: 'Standard Office Tenant',
    entity_type: 'tenant',
    description: 'Professional services, corporate offices, coworking',
    coverages: {
      general_liability_required: true,
      general_liability_occurrence: 1_000_000,
      general_liability_aggregate: 2_000_000,
      property_insurance_limit: 500_000,
      workers_comp_statutory: true,
      employers_liability_required: true,
      workers_comp_employers_liability: 500_000,
    },
    endorsements: {},
    created_at: '',
    updated_at: '',
  },
  {
    id: 'preset-retail-restaurant',
    user_id: '',
    name: 'Retail / Restaurant Tenant',
    entity_type: 'tenant',
    description: 'Restaurants, cafes, retail stores, bars, gyms',
    coverages: {
      general_liability_required: true,
      general_liability_occurrence: 1_000_000,
      general_liability_aggregate: 2_000_000,
      property_insurance_limit: 1_000_000,
      workers_comp_statutory: true,
      employers_liability_required: true,
      workers_comp_employers_liability: 500_000,
      business_interruption_required: true,
      umbrella_required: true,
      umbrella_limit: 1_000_000,
    },
    endorsements: {},
    created_at: '',
    updated_at: '',
  },
  {
    id: 'preset-medical-professional',
    user_id: '',
    name: 'Medical / Professional Tenant',
    entity_type: 'tenant',
    description: 'Medical offices, dental, law firms, financial services',
    coverages: {
      general_liability_required: true,
      general_liability_occurrence: 1_000_000,
      general_liability_aggregate: 2_000_000,
      property_insurance_limit: 1_000_000,
      workers_comp_statutory: true,
      employers_liability_required: true,
      workers_comp_employers_liability: 500_000,
      professional_liability_required: true,
      professional_liability_limit: 1_000_000,
      umbrella_required: true,
      umbrella_limit: 2_000_000,
    },
    endorsements: {},
    created_at: '',
    updated_at: '',
  },
];

interface RequirementTemplateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  entityType: EntityType;
  label?: string;
  required?: boolean;
  error?: string;
  id?: string;
  className?: string;
}

export function RequirementTemplateSelector({
  value,
  onChange,
  entityType,
  label = 'Requirement Template',
  required = false,
  error,
  id = 'requirement-template-select',
  className,
}: RequirementTemplateSelectorProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['requirement-templates'],
    queryFn: fetchRequirementTemplates,
  });

  const savedTemplates = (templates ?? []).filter((t) => t.entity_type === entityType);
  const presets = entityType === 'vendor' ? VENDOR_PRESETS : TENANT_PRESETS;

  const allTemplates = useMemo(() => [...savedTemplates, ...presets], [savedTemplates, presets]);
  const selectedTemplate = allTemplates.find((t) => t.id === value);

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={isLoading ? 'Loading templates...' : 'Select a requirement template'} />
          </SelectTrigger>
          <SelectContent>
            {savedTemplates.length > 0 && (
              <SelectGroup>
                <SelectLabel>Your Templates</SelectLabel>
                {savedTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            <SelectGroup>
              <SelectLabel>Default Templates</SelectLabel>
              {presets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {selectedTemplate && (
          <div className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            {selectedTemplate.description && (
              <p className="font-medium">{selectedTemplate.description}</p>
            )}
            {selectedTemplate.coverages.general_liability_occurrence && (
              <p>GL Occurrence: {formatCurrency(selectedTemplate.coverages.general_liability_occurrence)}</p>
            )}
            {selectedTemplate.coverages.automobile_liability_csl && (
              <p>Auto CSL: {formatCurrency(selectedTemplate.coverages.automobile_liability_csl)}</p>
            )}
            {selectedTemplate.coverages.umbrella_limit && (
              <p>Umbrella: {formatCurrency(selectedTemplate.coverages.umbrella_limit)}</p>
            )}
            {selectedTemplate.coverages.workers_comp_statutory && (
              <p>Workers' Comp: Statutory</p>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

/** Look up a template by ID, including preset templates */
export function findTemplateById(
  id: string,
  dbTemplates: RequirementTemplate[]
): RequirementTemplate | undefined {
  return (
    dbTemplates.find((t) => t.id === id) ??
    VENDOR_PRESETS.find((t) => t.id === id) ??
    TENANT_PRESETS.find((t) => t.id === id)
  );
}
