'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireActivePlan } from '@/lib/require-active-plan';
import { sendNotificationEmail } from '@/lib/notifications/email-sender';
import {
  gapNotification,
  followUpReminder,
  expirationWarning,
  expiredNotice,
  formatGapsAsHtml,
  type EmailMergeFields,
} from '@/lib/notifications/email-templates';
import { formatDate } from '@/lib/utils';

// ============================================================================
// Helpers
// ============================================================================

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, full_name, email')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) throw new Error('No organization');

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single();

  return {
    supabase,
    userId: user.id,
    orgId: profile.organization_id,
    pmName: profile.full_name ?? profile.email,
    pmEmail: profile.email,
    orgName: org?.name ?? 'Your Organization',
  };
}

// ============================================================================
// Portal Link Generation
// ============================================================================

export async function generatePortalLink(
  entityType: 'vendor' | 'tenant',
  entityId: string
): Promise<string> {
  await requireActivePlan('Subscribe to use the upload portal.');
  const { supabase, orgId } = await getAuthContext();

  // Verify entity belongs to org
  const table = entityType === 'vendor' ? 'vendors' : 'tenants';
  const { data: entity } = await supabase
    .from(table)
    .select('id')
    .eq('id', entityId)
    .eq('organization_id', orgId)
    .single();
  if (!entity) throw new Error(`${entityType} not found`);

  // Check for existing active, non-expired token
  const now = new Date().toISOString();
  const col = entityType === 'vendor' ? 'vendor_id' : 'tenant_id';
  const { data: existing } = await supabase
    .from('upload_portal_tokens')
    .select('token, expires_at')
    .eq(col, entityId)
    .eq('is_active', true)
    .gt('expires_at', now)
    .limit(1)
    .single();

  if (existing) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/portal/${existing.token}`;
  }

  // Create new token with 90-day expiry
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('upload_portal_tokens').insert({
    vendor_id: entityType === 'vendor' ? entityId : null,
    tenant_id: entityType === 'tenant' ? entityId : null,
    token,
    expires_at: expiresAt,
    is_active: true,
  });

  if (error) throw new Error(`Failed to create portal link: ${error.message}`);

  return `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}`;
}

// ============================================================================
// Manual Follow-Up
// ============================================================================

export async function sendManualFollowUp(
  entityType: 'vendor' | 'tenant',
  entityId: string
): Promise<{ devMode?: boolean }> {
  await requireActivePlan('Subscribe to send notifications.');
  const { supabase, userId, orgId, pmName, pmEmail, orgName } = await getAuthContext();

  // Fetch entity
  const table = entityType === 'vendor' ? 'vendors' : 'tenants';
  const { data: entity } = await supabase
    .from(table)
    .select('id, company_name, contact_email, property_id, compliance_status')
    .eq('id', entityId)
    .eq('organization_id', orgId)
    .single();
  if (!entity) throw new Error(`${entityType} not found`);

  if (!entity.contact_email) {
    throw new Error(`No contact email set for this ${entityType}. Add an email address first.`);
  }

  // Get property name
  let propertyName = 'N/A';
  if (entity.property_id) {
    const { data: prop } = await supabase
      .from('properties')
      .select('name')
      .eq('id', entity.property_id)
      .single();
    if (prop) propertyName = prop.name;
  }

  // Get compliance gaps (coverage + entity)
  const gaps: string[] = [];
  const { data: latestCert } = await supabase
    .from('certificates')
    .select('id')
    .eq(entityType === 'vendor' ? 'vendor_id' : 'tenant_id', entityId)
    .eq('processing_status', 'review_confirmed')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (latestCert) {
    // Coverage gaps
    const { data: results } = await supabase
      .from('compliance_results')
      .select('gap_description')
      .eq('certificate_id', latestCert.id)
      .in('status', ['not_met', 'missing'])
      .not('gap_description', 'is', null);
    for (const r of results ?? []) {
      if (r.gap_description) gaps.push(r.gap_description);
    }

    // Entity gaps (missing additional insured / certificate holder)
    const { data: entityGaps } = await supabase
      .from('entity_compliance_results')
      .select('status, property_entity:property_entities(entity_name, entity_address, entity_type)')
      .eq('certificate_id', latestCert.id)
      .in('status', ['missing', 'partial_match']);

    for (const eg of entityGaps ?? []) {
      const pe = (eg.property_entity as unknown as { entity_name: string; entity_address: string | null; entity_type: string }[] | null)?.[0];
      if (!pe) continue;
      if (pe.entity_type === 'additional_insured') {
        gaps.push(`Your certificate needs to list ${pe.entity_name} as an Additional Insured. Please ask your insurance broker to add this endorsement.`);
      } else {
        const addr = pe.entity_address ? `, ${pe.entity_address}` : '';
        gaps.push(`The Certificate Holder on your COI should be listed as: ${pe.entity_name}${addr}`);
      }
    }
  }

  // Get earliest expiration
  let expirationDate = 'N/A';
  if (latestCert) {
    const { data: covs } = await supabase
      .from('extracted_coverages')
      .select('expiration_date')
      .eq('certificate_id', latestCert.id)
      .not('expiration_date', 'is', null)
      .order('expiration_date', { ascending: true })
      .limit(1);
    if (covs && covs.length > 0 && covs[0].expiration_date) {
      expirationDate = formatDate(covs[0].expiration_date);
    }
  }

  // Generate portal link
  const portalLink = await generatePortalLink(entityType, entityId);

  // Build merge fields
  const fields: EmailMergeFields = {
    entity_name: entity.company_name,
    entity_type: entityType,
    property_name: propertyName,
    organization_name: orgName,
    gaps_summary: formatGapsAsHtml(gaps),
    portal_link: portalLink,
    expiration_date: expirationDate,
    days_until_expiration: 0,
    pm_name: pmName,
    pm_email: pmEmail,
  };

  // Choose template based on status
  let template;
  let notifType: 'gap_notification' | 'follow_up_reminder' | 'expiration_warning' | 'escalation';

  if (entity.compliance_status === 'expired') {
    template = expiredNotice(fields);
    notifType = 'escalation';
  } else if (entity.compliance_status === 'expiring_soon') {
    template = expirationWarning(fields);
    notifType = 'expiration_warning';
  } else if (gaps.length > 0) {
    template = followUpReminder(fields);
    notifType = 'follow_up_reminder';
  } else {
    template = gapNotification(fields);
    notifType = 'gap_notification';
  }

  // Send email
  const result = await sendNotificationEmail(
    entity.contact_email,
    template.subject,
    template.html
  );

  // Create notification record
  await supabase.from('notifications').insert({
    vendor_id: entityType === 'vendor' ? entityId : null,
    tenant_id: entityType === 'tenant' ? entityId : null,
    organization_id: orgId,
    type: notifType,
    scheduled_date: new Date().toISOString(),
    sent_date: result.success ? new Date().toISOString() : null,
    status: result.success ? 'sent' : 'failed',
    email_subject: template.subject,
    email_body: template.html,
    portal_link: portalLink,
  });

  // Log activity
  await supabase.from('activity_log').insert({
    organization_id: orgId,
    vendor_id: entityType === 'vendor' ? entityId : null,
    tenant_id: entityType === 'tenant' ? entityId : null,
    action: 'notification_sent',
    description: `Manual follow-up ${result.success ? 'sent' : 'failed'} to ${entity.contact_email}`,
    performed_by: userId,
  });

  if (!result.success) {
    throw new Error(`Email failed to send: ${result.error}`);
  }

  revalidatePath(`/dashboard/${entityType}s/${entityId}`);
  revalidatePath('/dashboard/notifications');
  return { devMode: result.devMode };
}

// ============================================================================
// Cancel notification
// ============================================================================

export async function cancelNotification(notificationId: string): Promise<void> {
  const { supabase, userId, orgId } = await getAuthContext();

  // Fetch notification details for logging
  const { data: notif } = await supabase
    .from('notifications')
    .select('vendor_id, tenant_id, type, email_subject')
    .eq('id', notificationId)
    .eq('organization_id', orgId)
    .single();

  const { error } = await supabase
    .from('notifications')
    .update({ status: 'cancelled' })
    .eq('id', notificationId)
    .eq('organization_id', orgId)
    .eq('status', 'scheduled');

  if (error) throw new Error(`Failed to cancel notification: ${error.message}`);

  await supabase.from('activity_log').insert({
    organization_id: orgId,
    vendor_id: notif?.vendor_id ?? null,
    tenant_id: notif?.tenant_id ?? null,
    action: 'notification_sent',
    description: `Scheduled notification cancelled: ${notif?.email_subject ?? notif?.type ?? 'unknown'}`,
    performed_by: userId,
  });

  revalidatePath('/dashboard/notifications');
}
