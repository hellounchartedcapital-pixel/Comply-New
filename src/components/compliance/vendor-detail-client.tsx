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
                onClick={() => toast.info('Follow-up system coming soon')}
              >
                Send Follow-Up
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info('Portal links coming soon')}
              >
                Generate Portal Link
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
