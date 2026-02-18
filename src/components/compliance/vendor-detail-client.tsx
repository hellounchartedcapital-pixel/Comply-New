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
import { EditVendorDialog } from './edit-vendor-dialog';
import { ConfirmDialog } from '@/components/properties/confirm-dialog';
import {
  softDeleteVendor,
  toggleVendorNotifications,
} from '@/lib/actions/properties';
import { sendManualFollowUp, generatePortalLink } from '@/lib/actions/notifications';
import { toast } from 'sonner';
import type {
  Vendor,
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

interface VendorDetailClientProps {
  vendor: Vendor;
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

export function VendorDetailClient({
  vendor,
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
}: VendorDetailClientProps) {
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
      const result = await sendManualFollowUp('vendor', vendor.id);
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
      const link = await generatePortalLink('vendor', vendor.id);
      await navigator.clipboard.writeText(link);
      toast.success('Portal link copied to clipboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate portal link');
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleDelete() {
    if (!vendor.property_id) return;
    setDeleting(true);
    try {
      await softDeleteVendor(vendor.id, vendor.property_id);
      toast.success('Vendor removed');
      router.push(`/dashboard/properties/${vendor.property_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove vendor');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleToggleNotifications() {
    setTogglingNotif(true);
    try {
      await toggleVendorNotifications(vendor.id, !vendor.notifications_paused);
      toast.success(vendor.notifications_paused ? 'Notifications resumed' : 'Notifications paused');
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
        <span className="text-foreground">Vendors</span>
        <span>/</span>
        <span className="text-foreground font-medium">{vendor.company_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {vendor.company_name}
            </h1>
            <ComplianceBadge status={vendor.compliance_status} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit Vendor
        </Button>
      </div>

      {/* Main content: two-column on desktop */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left column: main content */}
        <div className="space-y-6">
          {/* Contact info */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Contact Name</dt>
                <dd className="mt-0.5 text-sm text-foreground">{vendor.contact_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Email</dt>
                <dd className="mt-0.5 text-sm">
                  {vendor.contact_email ? (
                    <a href={`mailto:${vendor.contact_email}`} className="text-brand-dark hover:underline">
                      {vendor.contact_email}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Phone</dt>
                <dd className="mt-0.5 text-sm text-foreground">{vendor.contact_phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Vendor Type</dt>
                <dd className="mt-0.5 text-sm text-foreground">{vendor.vendor_type ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
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

          {/* Expired alert banner — highest priority */}
          {vendor.compliance_status === 'expired' && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    This vendor&apos;s certificate has expired coverage. An updated certificate is required.
                  </p>
                  {extractedCoverages.filter((c) => c.expiration_date && new Date(c.expiration_date + 'T00:00:00') < new Date()).length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {extractedCoverages
                        .filter((c) => c.expiration_date && new Date(c.expiration_date + 'T00:00:00') < new Date())
                        .map((c) => (
                          <li key={c.id} className="text-sm text-red-700">
                            {c.coverage_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} expired on{' '}
                            <span className="font-medium">{c.expiration_date}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

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
                onClick={() => router.push(`/dashboard/certificates/upload?vendorId=${vendor.id}`)}
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
                  {vendor.notifications_paused ? 'Paused' : 'Active'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!vendor.notifications_paused}
                onClick={handleToggleNotifications}
                disabled={togglingNotif}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 ${
                  !vendor.notifications_paused ? 'bg-brand' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !vendor.notifications_paused ? 'translate-x-5' : 'translate-x-0'
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
              Delete Vendor
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditVendorDialog
        vendor={vendor}
        templates={orgTemplates}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Vendor"
        description="Are you sure you want to remove this vendor? They will be archived and can be restored later."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
