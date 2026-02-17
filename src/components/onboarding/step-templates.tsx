'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type {
  RequirementTemplate,
  TemplateCoverageRequirement,
  CoverageType,
  LimitType,
} from '@/types';

// Human-readable labels
const COVERAGE_LABELS: Record<CoverageType, string> = {
  general_liability: 'General Liability',
  automobile_liability: 'Auto Liability',
  workers_compensation: "Workers' Comp",
  employers_liability: "Employers' Liability",
  umbrella_excess_liability: 'Umbrella / Excess',
  professional_liability_eo: 'Professional Liability (E&O)',
  property_inland_marine: 'Property / Inland Marine',
  pollution_liability: 'Pollution Liability',
  liquor_liability: 'Liquor Liability',
  cyber_liability: 'Cyber Liability',
};

const LIMIT_LABELS: Record<LimitType, string> = {
  per_occurrence: '/ Occ',
  aggregate: '/ Agg',
  combined_single_limit: '/ CSL',
  statutory: 'Statutory',
  per_person: '/ Person',
  per_accident: '/ Accident',
};

const RISK_COLORS: Record<string, string> = {
  standard: 'bg-emerald-100 text-emerald-800',
  high_risk: 'bg-red-100 text-red-800',
  professional_services: 'bg-blue-100 text-blue-800',
  restaurant: 'bg-amber-100 text-amber-800',
  industrial: 'bg-orange-100 text-orange-800',
};

function formatLimit(amount: number | null, limitType: LimitType | null): string {
  if (limitType === 'statutory') return 'Statutory';
  if (amount == null) return 'N/A';
  if (amount >= 1_000_000) return `$${amount / 1_000_000}M`;
  if (amount >= 1_000) return `$${amount / 1_000}K`;
  return `$${amount}`;
}

function summarizeCoverages(reqs: TemplateCoverageRequirement[]): string {
  const parts: string[] = [];
  // Group GL limits
  const glReqs = reqs.filter((r) => r.coverage_type === 'general_liability');
  if (glReqs.length > 0) {
    const occ = glReqs.find((r) => r.limit_type === 'per_occurrence');
    const agg = glReqs.find((r) => r.limit_type === 'aggregate');
    if (occ && agg) {
      parts.push(`GL: ${formatLimit(occ.minimum_limit, occ.limit_type)} / ${formatLimit(agg.minimum_limit, agg.limit_type)}`);
    } else if (occ) {
      parts.push(`GL: ${formatLimit(occ.minimum_limit, occ.limit_type)}`);
    }
  }
  // Auto
  const auto = reqs.find((r) => r.coverage_type === 'automobile_liability');
  if (auto) parts.push(`Auto: ${formatLimit(auto.minimum_limit, auto.limit_type)}`);
  // WC
  const wc = reqs.find((r) => r.coverage_type === 'workers_compensation');
  if (wc) parts.push('WC: Statutory');
  // Umbrella
  const umb = reqs.find((r) => r.coverage_type === 'umbrella_excess_liability');
  if (umb) parts.push(`Umbrella: ${formatLimit(umb.minimum_limit, umb.limit_type)}`);

  return parts.join(', ') || 'No coverages defined';
}

export interface SelectedTemplate {
  template: RequirementTemplate;
  adjustedRequirements: TemplateCoverageRequirement[];
}

interface StepTemplatesProps {
  onNext: (selected: SelectedTemplate[]) => void;
  onSkip: () => void;
  saving: boolean;
}

export function StepTemplates({ onNext, onSkip, saving }: StepTemplatesProps) {
  const [templates, setTemplates] = useState<RequirementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Store user-edited requirements per template
  const [editedReqs, setEditedReqs] = useState<
    Record<string, TemplateCoverageRequirement[]>
  >({});

  const fetchTemplates = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('requirement_templates')
      .select('*, coverage_requirements:template_coverage_requirements(*)')
      .eq('is_system_default', true)
      .order('category')
      .order('name');

    if (data) {
      setTemplates(data as RequirementTemplate[]);
      // Initialize edited reqs with original values
      const initial: Record<string, TemplateCoverageRequirement[]> = {};
      for (const t of data as RequirementTemplate[]) {
        initial[t.id] = t.coverage_requirements ? [...t.coverage_requirements] : [];
      }
      setEditedReqs(initial);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function toggleTemplate(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateReqLimit(templateId: string, reqId: string, value: string) {
    setEditedReqs((prev) => ({
      ...prev,
      [templateId]: prev[templateId].map((r) =>
        r.id === reqId
          ? { ...r, minimum_limit: value === '' ? null : Number(value) }
          : r
      ),
    }));
  }

  function handleSubmit() {
    const selected: SelectedTemplate[] = [];
    for (const id of selectedIds) {
      const template = templates.find((t) => t.id === id);
      if (template) {
        selected.push({
          template,
          adjustedRequirements: editedReqs[id] || template.coverage_requirements || [],
        });
      }
    }
    onNext(selected);
  }

  const vendorTemplates = templates.filter((t) => t.category === 'vendor');
  const tenantTemplates = templates.filter((t) => t.category === 'tenant');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Set your compliance requirements
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Set your compliance requirements
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with industry-standard templates and customize to fit your
          needs.
        </p>
      </div>

      {/* Vendor Templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vendor Templates
        </h3>
        <div className="space-y-3">
          {vendorTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              selected={selectedIds.has(t.id)}
              onToggle={() => toggleTemplate(t.id)}
              editedReqs={editedReqs[t.id] || []}
              onUpdateLimit={(reqId, val) => updateReqLimit(t.id, reqId, val)}
            />
          ))}
        </div>
      </div>

      {/* Tenant Templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tenant Templates
        </h3>
        <div className="space-y-3">
          {tenantTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              selected={selectedIds.has(t.id)}
              onToggle={() => toggleTemplate(t.id)}
              editedReqs={editedReqs[t.id] || []}
              onUpdateLimit={(reqId, val) => updateReqLimit(t.id, reqId, val)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full font-semibold"
          disabled={saving || selectedIds.size === 0}
          onClick={handleSubmit}
        >
          {saving
            ? 'Saving...'
            : `Continue with ${selectedIds.size} template${selectedIds.size !== 1 ? 's' : ''}`}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-center text-sm text-muted-foreground hover:text-foreground"
          disabled={saving}
        >
          Skip — I&apos;ll set these up later
        </button>
      </div>
    </div>
  );
}

// --- Template Card Sub-component ---

function TemplateCard({
  template,
  selected,
  onToggle,
  editedReqs,
  onUpdateLimit,
}: {
  template: RequirementTemplate;
  selected: boolean;
  onToggle: () => void;
  editedReqs: TemplateCoverageRequirement[];
  onUpdateLimit: (reqId: string, value: string) => void;
}) {
  const reqs = editedReqs.length > 0 ? editedReqs : template.coverage_requirements || [];
  const summary = summarizeCoverages(reqs);

  return (
    <div
      className={`cursor-pointer rounded-lg border-2 bg-white p-4 transition-all ${
        selected
          ? 'border-brand shadow-sm'
          : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              {template.name}
            </h4>
            <Badge
              className={`text-[10px] ${RISK_COLORS[template.risk_level] || 'bg-slate-100 text-slate-700'}`}
            >
              {template.risk_level.replace('_', ' ')}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
        </div>
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? 'border-brand bg-brand text-white' : 'border-slate-300'
          }`}
        >
          {selected && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Expanded edit section */}
      {selected && (
        <div
          className="mt-4 space-y-2 border-t border-slate-100 pt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium text-muted-foreground">
            Adjust coverage limits:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {reqs.map((req) => (
              <div key={req.id} className="flex items-center gap-2">
                <Label className="w-28 shrink-0 text-xs text-slate-600">
                  {COVERAGE_LABELS[req.coverage_type] || req.coverage_type}
                  {req.limit_type && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      {LIMIT_LABELS[req.limit_type]}
                    </span>
                  )}
                </Label>
                {req.limit_type === 'statutory' ? (
                  <span className="text-xs text-slate-500">Statutory</span>
                ) : (
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={req.minimum_limit ?? ''}
                    onChange={(e) => onUpdateLimit(req.id, e.target.value)}
                    step={100000}
                    min={0}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
