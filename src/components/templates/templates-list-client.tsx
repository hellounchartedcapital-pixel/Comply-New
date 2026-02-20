'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CreateTemplateDialog } from './create-template-dialog';
import { duplicateTemplate } from '@/lib/actions/templates';
import { toast } from 'sonner';
import { useUpgradeModal } from '@/components/dashboard/upgrade-modal';
import { handleActionError } from '@/lib/handle-action-error';
import {
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  COVERAGE_SHORT_LABELS,
} from './template-labels';
import type {
  RequirementTemplate,
  TemplateCoverageRequirement,
  CoverageType,
} from '@/types';

interface TemplateWithUsage extends RequirementTemplate {
  coverage_requirements: TemplateCoverageRequirement[];
  vendor_count: number;
  tenant_count: number;
}

interface TemplatesListClientProps {
  vendorTemplates: TemplateWithUsage[];
  tenantTemplates: TemplateWithUsage[];
  hasCustomTemplates: boolean;
}

export function TemplatesListClient({
  vendorTemplates,
  tenantTemplates,
  hasCustomTemplates,
}: TemplatesListClientProps) {
  const router = useRouter();
  const { showUpgradeModal } = useUpgradeModal();
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  async function handleDuplicate(templateId: string) {
    setDuplicating(templateId);
    try {
      const result = await duplicateTemplate(templateId);
      toast.success('Template duplicated');
      router.push(`/dashboard/templates/${result.id}`);
    } catch (err) {
      handleActionError(err, 'Failed to duplicate', showUpgradeModal);
    } finally {
      setDuplicating(null);
    }
  }

  function coverageSummary(reqs: TemplateCoverageRequirement[]): string {
    const required = reqs.filter((r) => r.is_required);
    const shortNames = required.map(
      (r) => COVERAGE_SHORT_LABELS[r.coverage_type as CoverageType]
    );
    // Deduplicate (GL might appear twice for per_occurrence + aggregate)
    const unique = [...new Set(shortNames)];
    return `${unique.length} coverage${unique.length !== 1 ? 's' : ''}: ${unique.join(', ')}`;
  }

  function TemplateCard({ template }: { template: TemplateWithUsage }) {
    const isSystem = template.is_system_default;
    const reqs = template.coverage_requirements ?? [];
    const usageCount =
      template.category === 'vendor' ? template.vendor_count : template.tenant_count;
    const usageLabel =
      template.category === 'vendor'
        ? `Used by ${usageCount} vendor${usageCount !== 1 ? 's' : ''}`
        : `Used by ${usageCount} tenant${usageCount !== 1 ? 's' : ''}`;

    const inner = (
      <Card
        className={`h-full transition-shadow ${
          !isSystem ? 'hover:shadow-md cursor-pointer' : ''
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  {template.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${RISK_LEVEL_COLORS[template.risk_level]}`}
                >
                  {RISK_LEVEL_LABELS[template.risk_level]}
                </Badge>
                {isSystem && (
                  <Badge variant="secondary" className="text-[10px]">
                    System Default
                  </Badge>
                )}
              </div>
              {template.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {reqs.length > 0 ? coverageSummary(reqs) : 'No coverages defined'}
            </p>
            <p className="text-xs text-muted-foreground">
              {usageCount > 0 ? usageLabel : `No ${template.category}s assigned`}
            </p>
          </div>

          {isSystem && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                disabled={duplicating === template.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDuplicate(template.id);
                }}
              >
                {duplicating === template.id
                  ? 'Duplicating...'
                  : 'Duplicate & Customize'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );

    if (isSystem) {
      return inner;
    }

    return (
      <Link href={`/dashboard/templates/${template.id}`}>
        {inner}
      </Link>
    );
  }

  function TemplateGroup({
    title,
    templates,
  }: {
    title: string;
    templates: TemplateWithUsage[];
  }) {
    const systemTemplates = templates.filter((t) => t.is_system_default);
    const orgTemplates = templates.filter((t) => !t.is_system_default);

    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systemTemplates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
          {orgTemplates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      </div>
    );
  }

  const noTemplates = vendorTemplates.length === 0 && tenantTemplates.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Requirement Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage insurance requirement templates for vendors and tenants.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Create Template</Button>
      </div>

      {/* Helpful note if no custom templates */}
      {!hasCustomTemplates && !noTemplates && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            These are industry-standard templates. Duplicate one to customize it
            for your organization.
          </p>
        </div>
      )}

      {noTemplates ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-foreground">
              No templates available
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a template to define insurance requirements.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              + Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {vendorTemplates.length > 0 && (
            <TemplateGroup title="Vendor Templates" templates={vendorTemplates} />
          )}
          {tenantTemplates.length > 0 && (
            <TemplateGroup title="Tenant Templates" templates={tenantTemplates} />
          )}
        </div>
      )}

      <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
