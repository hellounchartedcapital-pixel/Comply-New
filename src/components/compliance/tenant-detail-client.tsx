'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ComplianceBadge } from '@/components/properties/compliance-badge';
import { ComplianceBreakdown } from './compliance-breakdown';
import { EntityRequirements } from './entity-requirements';
import { COIHistory } from './coi-history';
import { NotificationHistory } from './notification-history';
import { EditTenantDialog } from './edit-tenant-dialog';
import { ConfirmDialog } from '@/components/properties/confirm-dialog';
import {
  softDeleteTenant,
  toggleTenantNotifications,
} from '@/lib/actions/properties';
import { sendManualFollowUp, generatePortalLink } from '@/lib/actions/notifications';
import { summarizeExpiredCoverages } from '@/lib/compliance/calculate';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type {
  Tenant,
  Property,
  RequirementTemplate,
  TemplateCoverageRequirement,
  ExtractedCoverage,
  ComplianceResult,
  EntityComplianceResult,
  PropertyEntity,
  Certificate,
  Notification,
} from '@/types';

interface TenantDetailClientProps {
  tenant: Tenant;
  property: Property | null;
  template: RequirementTemplate | null;
  templateRequirements: TemplateCoverageRequirement[];
  extractedCoverages: ExtractedCoverage[];
  complianceResults: ComplianceResult[];
  entityResults: EntityComplianceResult[];
  propertyEntities: PropertyEntity[];
  certificates: (Certificate & { compliance_results?: ComplianceResult[] })[];
  notifications: Notification[];
  orgTemplates: RequirementTemplate[];
  hasCertificate: boolean;
}

export function TenantDetailClient({
  tenant,
  property,
  template,
  templateRequirements,
  extractedCoverages,
  complianceResults,
  entityResults,
  propertyEntities,
  certificates,
  notifications,
  orgTemplates,
  hasCertificate,
}: TenantDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingNotif, setTogglingNotif] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  async function handleSendFollowUp() {
    setSendingFollowUp(true);
    try {
      const result = await sendManualFollowUp('tenant', tenant.id);
      if (result.devMode) {
        toast.info('Email logged to console (Resend not configured)');
      } else {
        toast.success('Follow-up email sent');
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send follow-up');
    } finally {
      setSendingFollowUp(false);
    }
  }

  async function handleGeneratePortalLink() {
    setGeneratingLink(true);
    try {
      const link = await generatePortalLink('tenant', tenant.id);
      await navigator.clipboard.writeText(link);
      toast.success('Portal link copied to clipboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate portal link');
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleDelete() {
    if (!tenant.property_id) return;
    setDeleting(true);
    try {
      await softDeleteTenant(tenant.id, tenant.property_id);
      toast.success('Tenant removed');
      router.push(`/dashboard/properties/${tenant.property_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove tenant');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleToggleNotifications() {
    setTogglingNotif(true);
    try {
      await toggleTenantNotifications(tenant.id, !tenant.notifications_paused);
      toast.success(tenant.notifications_paused ? 'Notifications resumed' : 'Notifications paused');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update notifications');
    } finally {
      setTogglingNotif(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard/properties" className="hover:text-foreground">
          Properties
        </Link>
        <span>/</span>
        {property && (
          <>
            <Link
              href={`/dashboard/properties/${property.id}`}
              className="hover:text-foreground"
            >
              {property.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground">Tenants</span>
        <span>/</span>
        <span className="text-foreground font-medium">{tenant.company_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {tenant.company_name}
            </h1>
            <ComplianceBadge status={tenant.compliance_status} />
          </div>
          {tenant.unit_suite && (
            <p className="mt-1 text-sm text-muted-foreground">
              Unit/Suite: {tenant.unit_suite}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit Tenant
        </Button>
      </div>

      {/* Main content: two-column on desktop */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Contact info */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Contact Name</dt>
                <dd className="mt-0.5 text-sm text-foreground">{tenant.contact_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Email</dt>
                <dd className="mt-0.5 text-sm">
                  {tenant.contact_email ? (
                    <a href={`mailto:${tenant.contact_email}`} className="text-brand-dark hover:underline">
                      {tenant.contact_email}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Phone</dt>
                <dd className="mt-0.5 text-sm text-foreground">{tenant.contact_phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Tenant Type</dt>
                <dd className="mt-0.5 text-sm text-foreground">{tenant.tenant_type ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Unit / Suite</dt>
                <dd className="mt-0.5 text-sm text-foreground">{tenant.unit_suite ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Requirement Template</dt>
                <dd className="mt-0.5 text-sm">
                  {template ? (
                    <Link href={`/dashboard/templates/${template.id}`} className="text-brand-dark hover:underline">
                      {template.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">None assigned</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Expired alert banner — compact, consolidated */}
          {tenant.compliance_status === 'expired' && (() => {
            const summary = summarizeExpiredCoverages(extractedCoverages, formatDate);
            if (summary.expiredCount === 0) return null;
            return (
              <div className="flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
                <svg className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {summary.singleLine
                      ? `This tenant\u2019s certificate has expired. ${summary.singleLine}.`
                      : `This tenant\u2019s certificate has expired coverage (${summary.expiredCount} of ${summary.totalCount}). An updated certificate is required.`}
                  </p>
                  {!summary.allSameDate && summary.groupedLines.length > 0 && (
                    <p className="mt-1 text-sm text-red-700">
                      {summary.groupedLines.map((g, i) => (
                        <span key={i}>
                          {i > 0 && ' · '}
                          {g.types} — expired {g.date}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Compliance Breakdown */}
          <ComplianceBreakdown
            requirements={templateRequirements}
            extractedCoverages={extractedCoverages}
            complianceResults={complianceResults}
            hasCertificate={hasCertificate}
          />

          {/* Entity Requirements */}
          <EntityRequirements
            entities={propertyEntities}
            entityResults={entityResults}
            hasCertificate={hasCertificate}
          />

          {/* COI History */}
          <COIHistory certificates={certificates} />

          {/* Notification History */}
          <NotificationHistory notifications={notifications} />
        </div>

        {/* Right column: actions panel */}
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-foreground">Actions</h3>
            <div className="mt-3 space-y-2">
              <Button
                className="w-full"
                onClick={() => router.push(`/dashboard/certificates/upload?tenantId=${tenant.id}`)}
              >
                Upload COI
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendFollowUp}
                disabled={sendingFollowUp}
              >
                {sendingFollowUp ? 'Sending...' : 'Send Follow-Up'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGeneratePortalLink}
                disabled={generatingLink}
              >
                {generatingLink ? 'Generating...' : 'Generate Portal Link'}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Notifications</h4>
                <p className="text-xs text-muted-foreground">
                  {tenant.notifications_paused ? 'Paused' : 'Active'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!tenant.notifications_paused}
                onClick={handleToggleNotifications}
                disabled={togglingNotif}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 ${
                  !tenant.notifications_paused ? 'bg-brand' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !tenant.notifications_paused ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-red-100 bg-white p-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Tenant
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditTenantDialog
        tenant={tenant}
        templates={orgTemplates}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Tenant"
        description="Are you sure you want to remove this tenant? They will be archived and can be restored later."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
