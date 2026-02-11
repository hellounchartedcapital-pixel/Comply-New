import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchRequirementTemplates } from '@/services/requirements';
import { formatCurrency } from '@/lib/utils';
import type { EntityType } from '@/types';

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

  const filtered = (templates ?? []).filter((t) => t.entity_type === entityType);

  const selectedTemplate = filtered.find((t) => t.id === value);

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
            {filtered.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
            {filtered.length === 0 && !isLoading && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No {entityType} templates found. Create one on the Requirements page first.
              </div>
            )}
          </SelectContent>
        </Select>
        {selectedTemplate && (
          <div className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
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
