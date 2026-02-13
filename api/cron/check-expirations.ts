// Vercel Cron Job: Check COI expirations and send notification emails
// Schedule: 0 8 * * * (daily at 8 AM UTC)
// Configured in vercel.json

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resendApiKey = process.env.RESEND_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CertificateRow {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  property_id: string;
  earliest_expiration: string;
  overall_status: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey) {
    console.log(`[DRY RUN] Would send email to ${to}: ${subject}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SmartCOI <noreply@smartcoi.io>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to send email to ${to}: ${text}`);
  }
}

async function alreadySent(
  entityType: string,
  entityId: string,
  emailType: string
): Promise<boolean> {
  const { data } = await supabase
    .from('email_log')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('email_type', emailType)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

async function logEmail(
  userId: string,
  entityType: string,
  entityId: string,
  propertyId: string,
  emailType: string,
  recipientEmail: string,
  followUpCount: number
) {
  await supabase.from('email_log').insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    property_id: propertyId,
    email_type: emailType,
    recipient_email: recipientEmail,
    follow_up_count: followUpCount,
  });
}

function makeUploadUrl(token: string): string {
  return `https://smartcoi.io/upload/${token}`;
}

function makeEmailHtml(
  heading: string,
  body: string,
  ctaUrl: string | null,
  ctaText: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#f9fafb;">
<div style="max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:linear-gradient(135deg,#10B981,#0D9488);padding:24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">SmartCOI</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">${heading}</h2>
    <div style="color:#374151;font-size:14px;line-height:1.6;">${body}</div>
    ${
      ctaUrl
        ? `<div style="text-align:center;margin:24px 0;">
        <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#10B981,#0D9488);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">${ctaText}</a>
      </div>`
        : ''
    }
  </div>
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by SmartCOI</p>
  </div>
</div>
</body>
</html>`;
}

export default async function handler(
  req: { method: string; headers: Record<string, string | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  // Verify Vercel cron authorization
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const results = { expiring30: 0, expiring7: 0, expired: 0, followUp: 0, errors: 0 };

  try {
    // Get all certificates with earliest_expiration within 30 days or expired
    const { data: certs } = await supabase
      .from('certificates')
      .select('id, user_id, entity_type, entity_id, property_id, earliest_expiration, overall_status')
      .not('earliest_expiration', 'is', null)
      .lte('earliest_expiration', thirtyDays.toISOString().split('T')[0])
      .order('earliest_expiration');

    for (const cert of (certs ?? []) as CertificateRow[]) {
      const expDate = new Date(cert.earliest_expiration);
      const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Look up entity email and upload token
      const table = cert.entity_type === 'vendor' ? 'vendors' : 'tenants';
      const { data: entity } = await supabase
        .from(table)
        .select('name, email, contact_email, upload_token, property_id')
        .eq('id', cert.entity_id)
        .single();

      if (!entity) continue;
      const email = entity.email || entity.contact_email;
      if (!email) continue;

      const { data: property } = await supabase
        .from('properties')
        .select('name')
        .eq('id', cert.property_id)
        .single();

      const propertyName = property?.name ?? 'your property';
      const uploadUrl = entity.upload_token ? makeUploadUrl(entity.upload_token) : null;

      try {
        if (daysUntil < 0) {
          // Expired
          if (!(await alreadySent(cert.entity_type, cert.entity_id, 'expired'))) {
            const html = makeEmailHtml(
              'Your COI has expired',
              `<p>The Certificate of Insurance for <strong>${entity.name}</strong> at <strong>${propertyName}</strong> expired on ${cert.earliest_expiration}.</p>
              <p>Please upload an updated certificate as soon as possible to maintain compliance.</p>`,
              uploadUrl,
              'Upload Your Certificate'
            );
            await sendEmail(email, `Your COI has expired \u2014 ${propertyName}`, html);
            await logEmail(cert.user_id, cert.entity_type, cert.entity_id, cert.property_id, 'expired', email, 0);
            results.expired++;
          }
        } else if (daysUntil <= 7) {
          // Expiring within 7 days
          if (!(await alreadySent(cert.entity_type, cert.entity_id, 'expiring_7'))) {
            const html = makeEmailHtml(
              `URGENT: Your COI expires in ${daysUntil} days`,
              `<p>The Certificate of Insurance for <strong>${entity.name}</strong> at <strong>${propertyName}</strong> expires on ${cert.earliest_expiration}.</p>
              <p>Please upload a renewed certificate before it expires.</p>`,
              uploadUrl,
              'Upload Your Certificate'
            );
            await sendEmail(email, `URGENT: Your COI expires in ${daysUntil} days \u2014 ${propertyName}`, html);
            await logEmail(cert.user_id, cert.entity_type, cert.entity_id, cert.property_id, 'expiring_7', email, 0);
            results.expiring7++;
          }
        } else if (daysUntil <= 30) {
          // Expiring within 30 days
          if (!(await alreadySent(cert.entity_type, cert.entity_id, 'expiring_30'))) {
            const html = makeEmailHtml(
              `Your COI expires in ${daysUntil} days`,
              `<p>The Certificate of Insurance for <strong>${entity.name}</strong> at <strong>${propertyName}</strong> expires on ${cert.earliest_expiration}.</p>
              <p>Please upload a renewed certificate before it expires to maintain compliance.</p>`,
              uploadUrl,
              'Upload Your Certificate'
            );
            await sendEmail(email, `Your COI expires in ${daysUntil} days \u2014 ${propertyName}`, html);
            await logEmail(cert.user_id, cert.entity_type, cert.entity_id, cert.property_id, 'expiring_30', email, 0);
            results.expiring30++;
          }
        }
      } catch (err) {
        console.error(`Error processing cert ${cert.id}:`, err);
        results.errors++;
      }
    }

    // Follow-up for non-compliant/expired entities
    const { data: pendingFollowups } = await supabase
      .from('email_log')
      .select('entity_type, entity_id, property_id, user_id, recipient_email, follow_up_count, sent_at')
      .in('email_type', ['non_compliant', 'expired', 'follow_up'])
      .lt('follow_up_count', 4)
      .lt('sent_at', sevenDaysAgo.toISOString())
      .order('sent_at', { ascending: false });

    // Group by entity, take latest
    const entityMap = new Map<string, (typeof pendingFollowups extends Array<infer T> ? T : never)>();
    for (const entry of pendingFollowups ?? []) {
      const key = `${entry.entity_type}:${entry.entity_id}`;
      if (!entityMap.has(key)) entityMap.set(key, entry);
    }

    for (const [, entry] of entityMap) {
      try {
        // Check entity is still non-compliant
        const table = entry.entity_type === 'vendor' ? 'vendors' : 'tenants';
        const { data: entity } = await supabase
          .from(table)
          .select('name, email, contact_email, upload_token, status, insurance_status')
          .eq('id', entry.entity_id)
          .single();

        if (!entity) continue;
        const status = entity.status || entity.insurance_status;
        if (status === 'compliant') continue;

        const email = entity.email || entity.contact_email;
        if (!email) continue;

        const { data: property } = await supabase
          .from('properties')
          .select('name')
          .eq('id', entry.property_id)
          .single();

        const propertyName = property?.name ?? 'your property';
        const uploadUrl = entity.upload_token ? makeUploadUrl(entity.upload_token) : null;
        const newCount = (entry.follow_up_count ?? 0) + 1;

        const html = makeEmailHtml(
          'Reminder: Updated COI needed',
          `<p>This is a reminder that the Certificate of Insurance for <strong>${entity.name}</strong> at <strong>${propertyName}</strong> still needs to be updated.</p>
          <p>Please upload a compliant certificate as soon as possible.</p>
          <p style="color:#6b7280;font-size:12px;">This is follow-up #${newCount} of 4.</p>`,
          uploadUrl,
          'Upload Your Certificate'
        );

        await sendEmail(email, `Reminder: Updated COI needed \u2014 ${propertyName}`, html);
        await logEmail(entry.user_id, entry.entity_type, entry.entity_id, entry.property_id, 'follow_up', email, newCount);
        results.followUp++;

        // If 4th follow-up, notify PM
        if (newCount >= 4) {
          const { data: pmUser } = await supabase.auth.admin.getUserById(entry.user_id);
          if (pmUser?.user?.email) {
            const pmHtml = makeEmailHtml(
              'Manual intervention needed',
              `<p><strong>${entity.name}</strong> has not responded after 4 follow-up emails regarding their COI for <strong>${propertyName}</strong>.</p>
              <p>Manual intervention may be required to resolve this compliance issue.</p>`,
              null,
              ''
            );
            await sendEmail(pmUser.user.email, `[Action Required] ${entity.name} — COI follow-ups exhausted`, pmHtml);
          }
        }
      } catch (err) {
        console.error(`Error processing follow-up for ${entry.entity_id}:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error('Cron job error:', err);
    return res.status(500).json({ error: 'Internal error', details: String(err) });
  }

  return res.status(200).json({ success: true, results });
}
