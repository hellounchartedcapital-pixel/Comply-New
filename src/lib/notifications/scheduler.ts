// ============================================================================
// SmartCOI — Notification Scheduler
// Runs daily via cron to check expirations and schedule/send notifications.
// ============================================================================

import { createServiceClient } from '@/lib/supabase/service';
import { sendNotificationEmail } from './email-sender';
import {
  expirationWarning,
  expiredNotice,
  gapNotification,
  followUpReminder,
  formatGapsAsHtml,
  type EmailMergeFields,
} from './email-templates';
import { formatDate } from '@/lib/utils';

// Threshold days at which expiration warnings are sent
const EXPIRATION_THRESHOLDS = [60, 30, 14, 0, -7];

// ============================================================================
// Check and Schedule Notifications
// ============================================================================

export async function checkAndScheduleNotifications(): Promise<number> {
  const supabase = createServiceClient();
  let scheduled = 0;

  // Fetch all active vendors and tenants with their org, property, and template info
  const [vendorsRes, tenantsRes] = await Promise.all([
    supabase
      .from('vendors')
      .select('id, company_name, contact_email, property_id, organization_id, compliance_status, notifications_paused, properties(name), organizations(name)')
      .is('deleted_at', null)
      .or('notifications_paused.eq.false,notifications_paused.is.null')
      .neq('compliance_status', 'compliant'),
    supabase
      .from('tenants')
      .select('id, company_name, contact_email, property_id, organization_id, compliance_status, notifications_paused, properties(name), organizations(name)')
      .is('deleted_at', null)
      .or('notifications_paused.eq.false,notifications_paused.is.null')
      .neq('compliance_status', 'compliant'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEntities: any[] = [
    ...(vendorsRes.data ?? []).map((v) => ({ ...v, _type: 'vendor' as const })),
    ...(tenantsRes.data ?? []).map((t) => ({ ...t, _type: 'tenant' as const })),
  ];

  // Batch-fetch the latest confirmed certificate for each entity
  const entityIds = allEntities.map((e) => e.id);
  if (entityIds.length === 0) return 0;

  // Get expiration dates from extracted coverages for latest confirmed certs
  const vendorIds = allEntities.filter((e) => e._type === 'vendor').map((e) => e.id);
  const tenantIds = allEntities.filter((e) => e._type === 'tenant').map((e) => e.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const certFetches: Promise<any>[] = [];
  if (vendorIds.length > 0) {
    certFetches.push(
      Promise.resolve(
        supabase
          .from('certificates')
          .select('id, vendor_id, tenant_id, uploaded_at')
          .in('vendor_id', vendorIds)
          .eq('processing_status', 'review_confirmed')
          .order('uploaded_at', { ascending: false })
      )
    );
  }
  if (tenantIds.length > 0) {
    certFetches.push(
      Promise.resolve(
        supabase
          .from('certificates')
          .select('id, vendor_id, tenant_id, uploaded_at')
          .in('tenant_id', tenantIds)
          .eq('processing_status', 'review_confirmed')
          .order('uploaded_at', { ascending: false })
      )
    );
  }

  const certResults = await Promise.all(certFetches);
  const allCerts = certResults.flatMap((r) => r.data ?? []);

  // Map entity -> latest confirmed cert
  const entityCertMap = new Map<string, string>();
  for (const cert of allCerts) {
    const eid = cert.vendor_id ?? cert.tenant_id;
    if (eid && !entityCertMap.has(eid)) {
      entityCertMap.set(eid, cert.id);
    }
  }

  // Fetch earliest expirations for confirmed certs
  const certIds = [...new Set(entityCertMap.values())];
  const expirationMap = new Map<string, string>();

  if (certIds.length > 0) {
    const { data: covs } = await supabase
      .from('extracted_coverages')
      .select('certificate_id, expiration_date')
      .in('certificate_id', certIds)
      .not('expiration_date', 'is', null)
      .order('expiration_date', { ascending: true });

    for (const c of covs ?? []) {
      if (c.expiration_date && !expirationMap.has(c.certificate_id)) {
        expirationMap.set(c.certificate_id, c.expiration_date);
      }
    }
  }

  // Fetch existing scheduled/sent notifications to avoid duplicates
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('vendor_id, tenant_id, type, scheduled_date, status')
    .in('status', ['scheduled', 'sent']);

  const notifSet = new Set(
    (existingNotifs ?? []).map((n) => {
      const eid = n.vendor_id ?? n.tenant_id;
      const month = n.scheduled_date.substring(0, 7); // YYYY-MM
      return `${eid}:${n.type}:${month}`;
    })
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Schedule for next day at 8 AM UTC so notifications appear in the
  // "Scheduled" tab before being processed by the next cron run.
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + 1);
  scheduledFor.setUTCHours(8, 0, 0, 0);

  // Get PM info per org for email templates
  const orgPmMap = new Map<string, { name: string; email: string }>();
  const orgIds = [...new Set(allEntities.map((e) => e.organization_id))];
  if (orgIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('organization_id, full_name, email')
      .in('organization_id', orgIds)
      .eq('role', 'manager')
      .limit(100);
    for (const u of users ?? []) {
      if (!orgPmMap.has(u.organization_id)) {
        orgPmMap.set(u.organization_id, { name: u.full_name ?? u.email, email: u.email });
      }
    }
  }

  for (const entity of allEntities) {
    if (!entity.contact_email) continue;

    const certId = entityCertMap.get(entity.id);
    const earliestExp = certId ? expirationMap.get(certId) : null;
    const pm = orgPmMap.get(entity.organization_id) ?? { name: 'Property Manager', email: '' };
    const orgName = entity.organizations?.name ?? 'Your Organization';
    const propName = entity.properties?.name ?? 'N/A';

    // ---- Expiration-based notifications ----
    if (earliestExp) {
      const expDate = new Date(earliestExp + 'T00:00:00');
      const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      for (const threshold of EXPIRATION_THRESHOLDS) {
        if (daysUntil <= threshold) {
          const notifType = threshold >= 0 ? 'expiration_warning' : 'escalation';
          const month = now.toISOString().substring(0, 7);
          const key = `${entity.id}:${notifType}:${month}`;

          if (notifSet.has(key)) continue;
          notifSet.add(key);

          const fields: EmailMergeFields = {
            entity_name: entity.company_name,
            entity_type: entity._type,
            property_name: propName,
            organization_name: orgName,
            gaps_summary: '',
            portal_link: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/certificates/upload?${entity._type}Id=${entity.id}`,
            expiration_date: formatDate(earliestExp),
            days_until_expiration: Math.max(daysUntil, 0),
            pm_name: pm.name,
            pm_email: pm.email,
          };

          const template = daysUntil < 0 ? expiredNotice(fields) : expirationWarning(fields);

          await supabase.from('notifications').insert({
            vendor_id: entity._type === 'vendor' ? entity.id : null,
            tenant_id: entity._type === 'tenant' ? entity.id : null,
            organization_id: entity.organization_id,
            type: notifType,
            scheduled_date: scheduledFor.toISOString(),
            status: 'scheduled',
            email_subject: template.subject,
            email_body: template.html,
          });
          scheduled++;
          break; // Only schedule one notification per entity per run
        }
      }
    }

    // ---- Gap / expired follow-up (14 days after last gap notification) ----
    if ((entity.compliance_status === 'non_compliant' || entity.compliance_status === 'expired') && certId) {
      const { data: lastGapNotif } = await supabase
        .from('notifications')
        .select('sent_date')
        .eq(entity._type === 'vendor' ? 'vendor_id' : 'tenant_id', entity.id)
        .in('type', ['gap_notification', 'follow_up_reminder'])
        .eq('status', 'sent')
        .order('sent_date', { ascending: false })
        .limit(1)
        .single();

      const shouldFollowUp = lastGapNotif
        ? new Date(lastGapNotif.sent_date).getTime() < now.getTime() - 14 * 24 * 60 * 60 * 1000
        : true;

      if (shouldFollowUp) {
        const month = now.toISOString().substring(0, 7);
        const key = `${entity.id}:follow_up_reminder:${month}`;
        if (!notifSet.has(key)) {
          notifSet.add(key);

          // Determine if the certificate is expired
          const isExpired = entity.compliance_status === 'expired';

          // Fetch coverage gaps
          const { data: gapResults } = await supabase
            .from('compliance_results')
            .select('gap_description')
            .eq('certificate_id', certId)
            .in('status', ['not_met', 'missing'])
            .not('gap_description', 'is', null);

          const gaps = (gapResults ?? []).map((r) => r.gap_description!);

          // Fetch entity gaps (missing additional insured / certificate holder)
          const { data: entityGapResults } = await supabase
            .from('entity_compliance_results')
            .select('status, property_entity:property_entities(entity_name, entity_address, entity_type)')
            .eq('certificate_id', certId)
            .in('status', ['missing', 'partial_match']);

          for (const eg of entityGapResults ?? []) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pe = (eg.property_entity as any)?.[0];
            if (!pe) continue;
            if (pe.entity_type === 'additional_insured') {
              gaps.push(`Your certificate needs to list ${pe.entity_name} as an Additional Insured. Please ask your insurance broker to add this endorsement.`);
            } else {
              const addr = pe.entity_address ? `, ${pe.entity_address}` : '';
              gaps.push(`The Certificate Holder on your COI should be listed as: ${pe.entity_name}${addr}`);
            }
          }

          // When expired, prepend "Certificate expired on [date]" as the first gap item
          if (isExpired && earliestExp) {
            gaps.unshift(`Certificate expired on ${formatDate(earliestExp)}`);
          }

          const fields: EmailMergeFields = {
            entity_name: entity.company_name,
            entity_type: entity._type,
            property_name: propName,
            organization_name: orgName,
            gaps_summary: formatGapsAsHtml(gaps),
            portal_link: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/certificates/upload?${entity._type}Id=${entity.id}`,
            expiration_date: earliestExp ? formatDate(earliestExp) : 'N/A',
            days_until_expiration: 0,
            is_expired: isExpired,
            pm_name: pm.name,
            pm_email: pm.email,
          };

          const template = lastGapNotif ? followUpReminder(fields) : gapNotification(fields);

          await supabase.from('notifications').insert({
            vendor_id: entity._type === 'vendor' ? entity.id : null,
            tenant_id: entity._type === 'tenant' ? entity.id : null,
            organization_id: entity.organization_id,
            type: lastGapNotif ? 'follow_up_reminder' : 'gap_notification',
            scheduled_date: scheduledFor.toISOString(),
            status: 'scheduled',
            email_subject: template.subject,
            email_body: template.html,
          });
          scheduled++;
        }
      }
    }
  }

  return scheduled;
}

// ============================================================================
// Process Scheduled Notifications
// ============================================================================

export async function processScheduledNotifications(): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceClient();
  let sent = 0;
  let failed = 0;

  const { data: pending } = await supabase
    .from('notifications')
    .select('id, vendor_id, tenant_id, organization_id, email_subject, email_body, type')
    .eq('status', 'scheduled')
    .lte('scheduled_date', new Date().toISOString())
    .limit(50);

  if (!pending || pending.length === 0) return { sent: 0, failed: 0 };

  for (const notif of pending) {
    // Get recipient email
    let recipientEmail: string | null = null;
    if (notif.vendor_id) {
      const { data } = await supabase
        .from('vendors')
        .select('contact_email')
        .eq('id', notif.vendor_id)
        .single();
      recipientEmail = data?.contact_email ?? null;
    } else if (notif.tenant_id) {
      const { data } = await supabase
        .from('tenants')
        .select('contact_email')
        .eq('id', notif.tenant_id)
        .single();
      recipientEmail = data?.contact_email ?? null;
    }

    if (!recipientEmail) {
      await supabase
        .from('notifications')
        .update({ status: 'failed' })
        .eq('id', notif.id);
      failed++;
      continue;
    }

    const result = await sendNotificationEmail(
      recipientEmail,
      notif.email_subject,
      notif.email_body
    );

    if (result.success) {
      await supabase
        .from('notifications')
        .update({ status: 'sent', sent_date: new Date().toISOString() })
        .eq('id', notif.id);

      await supabase.from('activity_log').insert({
        organization_id: notif.organization_id,
        vendor_id: notif.vendor_id,
        tenant_id: notif.tenant_id,
        action: 'notification_sent',
        description: `${notif.type} notification sent to ${recipientEmail}`,
      });
      sent++;
    } else {
      await supabase
        .from('notifications')
        .update({ status: 'failed' })
        .eq('id', notif.id);
      failed++;
    }
  }

  return { sent, failed };
}
