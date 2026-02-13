/**
 * Follow-up scheduler — scans all vendors and tenants for expiring or
 * non-compliant COIs and queues the appropriate notification emails.
 *
 * This runs client-side (e.g. triggered from the dashboard) and inserts
 * emails into the `email_queue` table via the existing queueEmail() helper.
 * A separate process (edge function / cron) handles actual sending.
 */
import { supabase } from '@/lib/supabase';
import { queueEmail, fetchQueuedEmails } from './email-queue';

interface SchedulerResult {
  vendorsChecked: number;
  tenantsChecked: number;
  emailsQueued: number;
  skipped: number;
}

/** Thresholds (in days) at which we send reminders. */
const FOLLOW_UP_THRESHOLDS = [30, 14, 0] as const;

type ThresholdEmailType = 'expiration_30day' | 'expiration_14day' | 'expiration_day_of';

function thresholdToEmailType(days: number): ThresholdEmailType {
  if (days === 30) return 'expiration_30day';
  if (days === 14) return 'expiration_14day';
  return 'expiration_day_of';
}

/**
 * Returns the number of whole days between today and the given date string.
 * Negative values mean the date is in the past (expired).
 */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check whether an email of the given type was already queued for the entity
 * in the last 7 days to avoid duplicate sends.
 */
async function wasRecentlyQueued(
  entityType: 'vendor' | 'tenant',
  entityId: string,
  emailType: string
): Promise<boolean> {
  const existing = await fetchQueuedEmails(entityType, entityId);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return existing.some(
    (e) =>
      e.trigger_type === emailType &&
      new Date(e.created_at) > sevenDaysAgo
  );
}

/**
 * Run the follow-up scheduler for the current user's vendors and tenants.
 * Returns a summary of what was processed and queued.
 */
export async function runFollowUpScheduler(): Promise<SchedulerResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch org settings for management company name
  let managementCompany: string | undefined;
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('company_name')
      .eq('user_id', user.id)
      .maybeSingle();
    managementCompany = settings?.company_name ?? undefined;
  } catch {
    // Settings table may not exist
  }

  const result: SchedulerResult = {
    vendorsChecked: 0,
    tenantsChecked: 0,
    emailsQueued: 0,
    skipped: 0,
  };

  // ---- Process Vendors ----
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, status, expiration_date, contact_email, property:properties(name)')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (vendors) {
    for (const vendor of vendors) {
      result.vendorsChecked++;
      const email = vendor.contact_email;
      if (!email) continue;

      const propertyName = (vendor.property as { name?: string } | null)?.name ?? 'your property';

      // Check expiration thresholds
      if (vendor.expiration_date) {
        const days = daysUntil(vendor.expiration_date);

        for (const threshold of FOLLOW_UP_THRESHOLDS) {
          if (days <= threshold) {
            const emailType = thresholdToEmailType(threshold);
            const alreadySent = await wasRecentlyQueued('vendor', vendor.id, emailType);
            if (alreadySent) {
              result.skipped++;
              break; // Don't send less-urgent thresholds if we already sent a more-urgent one
            }

            await queueEmail({
              entityType: 'vendor',
              entityId: vendor.id,
              triggerType: emailType,
              recipientEmail: email,
              recipientName: vendor.name,
              propertyName,
              expirationDate: vendor.expiration_date,
              managementCompany,
            });
            result.emailsQueued++;
            break; // Only queue the most relevant threshold
          }
        }
      }

      // Non-compliance follow-up (independent of expiration)
      if (vendor.status === 'non-compliant') {
        const alreadySent = await wasRecentlyQueued('vendor', vendor.id, 'non_compliance');
        if (!alreadySent) {
          await queueEmail({
            entityType: 'vendor',
            entityId: vendor.id,
            triggerType: 'non_compliance',
            recipientEmail: email,
            recipientName: vendor.name,
            propertyName,
            managementCompany,
          });
          result.emailsQueued++;
        } else {
          result.skipped++;
        }
      }
    }
  }

  // ---- Process Tenants ----
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, insurance_status, lease_end, email, property:properties(name)')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (tenants) {
    for (const tenant of tenants) {
      result.tenantsChecked++;
      const email = tenant.email;
      if (!email) continue;

      const propertyName = (tenant.property as { name?: string } | null)?.name ?? 'your property';

      // For tenants, use lease_end as the expiration trigger
      const expirationDate = tenant.lease_end;

      if (expirationDate) {
        const days = daysUntil(expirationDate);

        for (const threshold of FOLLOW_UP_THRESHOLDS) {
          if (days <= threshold) {
            const emailType = thresholdToEmailType(threshold);
            const alreadySent = await wasRecentlyQueued('tenant', tenant.id, emailType);
            if (alreadySent) {
              result.skipped++;
              break;
            }

            await queueEmail({
              entityType: 'tenant',
              entityId: tenant.id,
              triggerType: emailType,
              recipientEmail: email,
              recipientName: tenant.name,
              propertyName,
              expirationDate,
              managementCompany,
            });
            result.emailsQueued++;
            break;
          }
        }
      }

      // Non-compliance follow-up
      if (tenant.insurance_status === 'non-compliant') {
        const alreadySent = await wasRecentlyQueued('tenant', tenant.id, 'non_compliance');
        if (!alreadySent) {
          await queueEmail({
            entityType: 'tenant',
            entityId: tenant.id,
            triggerType: 'non_compliance',
            recipientEmail: email,
            recipientName: tenant.name,
            propertyName,
            managementCompany,
          });
          result.emailsQueued++;
        } else {
          result.skipped++;
        }
      }
    }
  }

  return result;
}
