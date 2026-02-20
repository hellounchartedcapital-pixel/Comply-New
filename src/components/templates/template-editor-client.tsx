'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/properties/confirm-dialog';
import {
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplateUsageCount,
} from '@/lib/actions/templates';
import { toast } from 'sonner';
import { useUpgradeModal } from '@/components/dashboard/upgrade-modal';
import { handleActionError } from '@/lib/handle-action-error';
import {
  COVERAGE_LABELS,
  LIMIT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  ALL_COVERAGE_TYPES,
  ALL_LIMIT_TYPES,
  ALL_RISK_LEVELS,
  formatLimit,
} from './template-labels';
import type {
  RequirementTemplate,
  TemplateCoverageRequirement,
  CoverageType,
  LimitType,
  RiskLevel,
} from '@/types';

// ---------------------------------------------------------------------------
// Local row type for the editor
// ---------------------------------------------------------------------------

interface EditorRow {
  _key: string;
  coverage_type: CoverageType;
  is_required: boolean;
  minimum_limit: number | null;
  limit_type: LimitType | null;
  requires_additional_insured: boolean;
  requires_waiver_of_subrogation: boolean;
}

function reqToRow(r: TemplateCoverageRequirement): EditorRow {
  return {
    _key: r.id,
    coverage_type: r.coverage_type,
    is_required: r.is_required,
    minimum_limit: r.minimum_limit,
    limit_type: r.limit_type,
    requires_additional_insured: r.requires_additional_insured,
    requires_waiver_of_subrogation: r.requires_waiver_of_subrogation,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TemplateEditorClientProps {
  template: RequirementTemplate;
  requirements: TemplateCoverageRequirement[];
  usageCount: { vendors: number; tenants: number; totalEntities: number; properties: number };
}

export function TemplateEditorClient({
  template,
  requirements,
  usageCount,
}: TemplateEditorClientProps) {
  const router = useRouter();
  const { showUpgradeModal } = useUpgradeModal();
  const isReadOnly = template.is_system_default;

  // Form state
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? '');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(template.risk_level);
  const [rows, setRows] = useState<EditorRow[]>(requirements.map(reqToRow));
  const [saving, setSaving] = useState(false);
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Row CRUD
  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        coverage_type: 'general_liability',
        is_required: true,
        minimum_limit: null,
        limit_type: 'per_occurrence',
        requires_additional_insured: false,
        requires_waiver_of_subrogation: false,
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  function updateRow(key: string, patch: Partial<EditorRow>) {
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, ...patch } : r))
    );
  }

  // Save handler
  async function handleSave() {
    if (usageCount.totalEntities > 0) {
      // Re-fetch usage count in case it changed
      const fresh = await getTemplateUsageCount(template.id);
      if (fresh.totalEntities > 0) {
        setCascadeOpen(true);
        return;
      }
    }
    await executeSave();
  }

  async function executeSave() {
    setSaving(true);
    setCascadeOpen(false);
    try {
      await updateTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        risk_level: riskLevel,
        requirements: rows.map((r) => ({
          coverage_type: r.coverage_type,
          is_required: r.is_required,
          minimum_limit: r.limit_type === 'statutory' ? null : r.minimum_limit,
          limit_type: r.limit_type,
          requires_additional_insured: r.requires_additional_insured,
          requires_waiver_of_subrogation: r.requires_waiver_of_subrogation,
        })),
      });
      toast.success('Template saved');
      router.refresh();
    } catch (err) {
      handleActionError(err, 'Failed to save', showUpgradeModal);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTemplate(template.id);
      toast.success('Template deleted');
      router.push('/dashboard/templates');
    } catch (err) {
      handleActionError(err, 'Failed to delete', showUpgradeModal);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const result = await duplicateTemplate(template.id);
      toast.success('Template duplicated');
      router.push(`/dashboard/templates/${result.id}`);
    } catch (err) {
      handleActionError(err, 'Failed to duplicate', showUpgradeModal);
    } finally {
      setDuplicating(false);
    }
  }

  // Plain-language preview
  const preview = useMemo(() => {
    if (rows.length === 0) return 'No coverage requirements defined.';

    const parts = rows
      .filter((r) => r.is_required)
      .map((r) => {
        let text = COVERAGE_LABELS[r.coverage_type];
        if (r.limit_type === 'statutory') {
          text += ' (Statutory)';
        } else if (r.minimum_limit != null && r.limit_type) {
          text += ` at ${formatLimit(r.minimum_limit, r.limit_type)} ${LIMIT_TYPE_LABELS[r.limit_type].toLowerCase()}`;
        }
        const extras: string[] = [];
        if (r.requires_additional_insured) extras.push('Additional Insured required');
        if (r.requires_waiver_of_subrogation) extras.push('Waiver of Subrogation required');
        if (extras.length > 0) text += ` (${extras.join(', ')})`;
        return text;
      });

    const optional = rows.filter((r) => !r.is_required);

    let result = 'This template requires: ' + parts.join(', ') + '.';
    if (optional.length > 0) {
      result +=
        ' Optional coverages checked if provided: ' +
        optional.map((r) => COVERAGE_LABELS[r.coverage_type]).join(', ') +
        '.';
    }
    return result;
  }, [rows]);

  // Toggle helper
  function ToggleSwitch({
    checked,
    onChange,
    disabled,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    label: string;
  }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-brand' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/templates" className="hover:text-foreground">
          Templates
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{template.name}</span>
      </div>

      {/* System default banner */}
      {isReadOnly && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            This is a system default template (read-only). Duplicate it to make
            a customizable copy.
          </p>
          <Button
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            {duplicating ? 'Duplicating...' : 'Duplicate & Customize'}
          </Button>
        </div>
      )}

      {/* Header fields */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Template name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isReadOnly}
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isReadOnly}
                placeholder="Brief description..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Badge variant="secondary" className="text-xs capitalize">
              {template.category}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Risk Level</Label>
            {isReadOnly ? (
              <Badge
                variant="outline"
                className={`text-xs ${RISK_LEVEL_COLORS[riskLevel]}`}
              >
                {RISK_LEVEL_LABELS[riskLevel]}
              </Badge>
            ) : (
              <Select
                value={riskLevel}
                onValueChange={(v) => setRiskLevel(v as RiskLevel)}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_RISK_LEVELS.map((rl) => (
                    <SelectItem key={rl} value={rl}>
                      {RISK_LEVEL_LABELS[rl]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {usageCount.totalEntities > 0 && (
            <span className="text-xs text-muted-foreground">
              Assigned to {usageCount.totalEntities}{' '}
              {usageCount.totalEntities === 1 ? 'entity' : 'entities'} across{' '}
              {usageCount.properties}{' '}
              {usageCount.properties === 1 ? 'property' : 'properties'}
            </span>
          )}
        </div>
      </div>

      {/* Coverage Requirements Editor */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Coverage Requirements
        </h3>

        {rows.length === 0 && !isReadOnly && (
          <p className="mt-3 text-sm text-muted-foreground">
            No coverage requirements. Add one to get started.
          </p>
        )}
        {rows.length === 0 && isReadOnly && (
          <p className="mt-3 text-sm text-muted-foreground">
            No coverage requirements defined.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {rows.map((row, idx) => (
            <div
              key={row._key}
              className="rounded-md border border-slate-100 bg-slate-50/50 p-3"
            >
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-medium text-muted-foreground w-5 shrink-0">
                  {idx + 1}.
                </span>

                <div className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Coverage Type */}
                  <div className="space-y-1">
                    <Label className="text-xs">Coverage Type</Label>
                    <Select
                      value={row.coverage_type}
                      onValueChange={(v) =>
                        updateRow(row._key, { coverage_type: v as CoverageType })
                      }
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_COVERAGE_TYPES.map((ct) => (
                          <SelectItem key={ct} value={ct}>
                            {COVERAGE_LABELS[ct]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Limit Type */}
                  <div className="space-y-1">
                    <Label className="text-xs">Limit Type</Label>
                    <Select
                      value={row.limit_type ?? 'per_occurrence'}
                      onValueChange={(v) =>
                        updateRow(row._key, {
                          limit_type: v as LimitType,
                          minimum_limit:
                            v === 'statutory' ? null : row.minimum_limit,
                        })
                      }
                      disabled={isReadOnly}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_LIMIT_TYPES.map((lt) => (
                          <SelectItem key={lt} value={lt}>
                            {LIMIT_TYPE_LABELS[lt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Minimum Limit */}
                  <div className="space-y-1">
                    <Label className="text-xs">Minimum Limit</Label>
                    {row.limit_type === 'statutory' ? (
                      <div className="flex h-8 items-center text-xs text-muted-foreground">
                        Statutory
                      </div>
                    ) : (
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={row.minimum_limit ?? ''}
                        onChange={(e) =>
                          updateRow(row._key, {
                            minimum_limit:
                              e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        disabled={isReadOnly}
                        step={100000}
                        min={0}
                        placeholder="$0"
                      />
                    )}
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Required</Label>
                      <ToggleSwitch
                        checked={row.is_required}
                        onChange={(v) => updateRow(row._key, { is_required: v })}
                        disabled={isReadOnly}
                        label="Required"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Add&apos;l Insured</Label>
                        <ToggleSwitch
                          checked={row.requires_additional_insured}
                          onChange={(v) =>
                            updateRow(row._key, { requires_additional_insured: v })
                          }
                          disabled={isReadOnly}
                          label="Additional Insured"
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        Requires the vendor/tenant&apos;s policy to name your property entities as additional insured. Note: this is often documented on a separate endorsement and may not appear on the standard ACORD certificate.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Waiver of Sub.</Label>
                        <ToggleSwitch
                          checked={row.requires_waiver_of_subrogation}
                          onChange={(v) =>
                            updateRow(row._key, {
                              requires_waiver_of_subrogation: v,
                            })
                          }
                          disabled={isReadOnly}
                          label="Waiver of Subrogation"
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        Requires the vendor/tenant&apos;s insurer to waive the right to subrogate against your organization. Note: this is typically shown on a separate endorsement page.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delete row */}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => removeRow(row._key)}
                    className="mt-2 shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isReadOnly && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={addRow}
          >
            + Add Coverage Requirement
          </Button>
        )}
      </div>

      {/* Plain-language preview */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Requirements Summary
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {preview}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {!isReadOnly && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Template
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/templates')}
          >
            {isReadOnly ? 'Back' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          )}
        </div>
      </div>

      {/* Cascade warning dialog */}
      <ConfirmDialog
        open={cascadeOpen}
        onOpenChange={setCascadeOpen}
        title="Confirm Template Changes"
        description={`This template is assigned to ${usageCount.totalEntities} ${
          usageCount.totalEntities === 1 ? 'entity' : 'entities'
        } across ${usageCount.properties} ${
          usageCount.properties === 1 ? 'property' : 'properties'
        }. Saving these changes will trigger compliance recalculation. Some entities may become non-compliant under the new requirements.`}
        confirmLabel="Save & Recalculate"
        loading={saving}
        onConfirm={executeSave}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Template"
        description={
          usageCount.totalEntities > 0
            ? `This template is assigned to ${usageCount.totalEntities} ${
                usageCount.totalEntities === 1 ? 'entity' : 'entities'
              }. Reassign them to another template before deleting.`
            : 'Are you sure you want to delete this template? This action cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
