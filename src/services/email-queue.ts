/**
 * Email service — COI Chase Engine
 * Queues emails and logs all sends. Actual delivery requires a transactional
 * email provider (Resend, SendGrid, etc.). For now, emails are logged to the
 * email_log table and console.
 *
 * Trigger types (Part 6 spec):
 *   1. initial_request        — First email when entity is created / portal link sent
 *   2. expiration_30day       — 30 days before expiration
 *   3. expiration_14day       — 14 days before expiration
 *   4. expiration_day_of      — Day of expiration
 *   5. non_compliance         — COI uploaded but doesn't meet requirements
 *   6. coi_received_confirmation — Confirmation that COI was received
 */
import { supabase } from '@/lib/supabase';

export type EmailTriggerType =
  | 'initial_request'
  | 'expiration_30day'
  | 'expiration_14day'
  | 'expiration_day_of'
  | 'non_compliance'
  | 'coi_received_confirmation';

export interface EmailLogEntry {
  id: string;
  entity_type: 'vendor' | 'tenant';
  entity_id: string;
  trigger_type: EmailTriggerType;
  recipient_email: string;
  subject: string;
  body_preview?: string;
  portal_link?: string;
  status: 'queued' | 'sent' | 'failed' | 'bounced';
  sent_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface SendEmailParams {
  entityType: 'vendor' | 'tenant';
  entityId: string;
  triggerType: EmailTriggerType;
  recipientEmail: string;
  recipientName: string;
  propertyName: string;
  portalLink?: string;
  expirationDate?: string;
  complianceGaps?: string[];
  managementCompany?: string;
}

function buildSubject(params: SendEmailParams): string {
  const { triggerType, propertyName } = params;
  switch (triggerType) {
    case 'initial_request':
      return `Insurance certificate required for ${propertyName}`;
    case 'expiration_30day':
      return `Your COI for ${propertyName} expires in 30 days`;
    case 'expiration_14day':
      return `Reminder: Your COI for ${propertyName} expires in 14 days`;
    case 'expiration_day_of':
      return `Your COI for ${propertyName} has expired`;
    case 'non_compliance':
      return `Your COI for ${propertyName} does not meet coverage requirements`;
    case 'coi_received_confirmation':
      return `Document received — ${propertyName}`;
  }
}

function buildBody(params: SendEmailParams): string {
  const { triggerType, recipientName, propertyName, expirationDate, complianceGaps, portalLink, managementCompany } = params;
  const greeting = `Dear ${recipientName},`;
  const footer = `\n\nThis is an automated message from SmartCOI${managementCompany ? ` on behalf of ${managementCompany}` : ''}.`;
  const portalCta = portalLink ? `\n\nUpload your COI here: ${portalLink}` : '';

  switch (triggerType) {
    case 'initial_request':
      return `${greeting}\n\nYou are required to provide a Certificate of Insurance for ${propertyName}. Please upload your current COI through the link below.${portalCta}${footer}`;

    case 'expiration_30day':
      return `${greeting}\n\nYour Certificate of Insurance for ${propertyName} expires on ${expirationDate ?? 'N/A'}. Please upload an updated certificate at your earliest convenience.${portalCta}${footer}`;

    case 'expiration_14day':
      return `${greeting}\n\nThis is a follow-up reminder that your Certificate of Insurance for ${propertyName} expires on ${expirationDate ?? 'N/A'}. Please upload an updated certificate as soon as possible.${portalCta}${footer}`;

    case 'expiration_day_of':
      return `${greeting}\n\nYour Certificate of Insurance for ${propertyName} has expired${expirationDate ? ` as of ${expirationDate}` : ''}. Please upload an updated certificate immediately to maintain compliance.${portalCta}${footer}`;

    case 'non_compliance': {
      const gaps = complianceGaps?.length
        ? `\n\nThe following items need attention:\n${complianceGaps.map((g) => `  - ${g}`).join('\n')}`
        : '';
      return `${greeting}\n\nYour Certificate of Insurance for ${propertyName} does not meet the required coverage levels.${gaps}\n\nPlease upload a corrected certificate.${portalCta}${footer}`;
    }

    case 'coi_received_confirmation':
      return `${greeting}\n\nThank you! We have received your Certificate of Insurance for ${propertyName}. Our team will review it and update your compliance status shortly.\n\nNo further action is needed from you at this time.${footer}`;
  }
}

/**
 * Queue an email for sending. Logs to email_log table.
 * Falls back to email_queue table if email_log doesn't exist.
 * Falls back to console if neither exists.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const subject = buildSubject(params);
  const body = buildBody(params);

  const { data: { user } } = await supabase.auth.getUser();

  // Try email_log table first (new schema)
  const { error: logError } = await supabase.from('email_log').insert({
    user_id: user?.id,
    entity_type: params.entityType,
    entity_id: params.entityId,
    trigger_type: params.triggerType,
    recipient_email: params.recipientEmail,
    subject,
    body_preview: body.substring(0, 500),
    portal_link: params.portalLink ?? null,
    status: 'queued',
    metadata: {
      recipient_name: params.recipientName,
      property_name: params.propertyName,
      expiration_date: params.expirationDate,
      compliance_gaps: params.complianceGaps,
    },
  });

  if (logError) {
    // Fall back to old email_queue table
    const { error: queueError } = await supabase.from('email_queue').insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      email_type: params.triggerType,
      recipient_email: params.recipientEmail,
      subject,
      body,
      status: 'queued',
    });

    if (queueError) {
      console.log('[Email] Tables not found — logging email:');
      console.log(`  To: ${params.recipientEmail}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Trigger: ${params.triggerType}`);
      return;
    }
  }

  // Update last_email_sent_at on the entity
  const table = params.entityType === 'vendor' ? 'vendors' : 'tenants';
  await supabase
    .from(table)
    .update({ last_email_sent_at: new Date().toISOString() })
    .eq('id', params.entityId);
}

/**
 * Fetch email history for an entity from email_log.
 * Falls back to email_queue for older entries.
 */
export async function fetchEmailHistory(
  entityType: 'vendor' | 'tenant',
  entityId: string
): Promise<EmailLogEntry[]> {
  // Try email_log first
  const { data, error } = await supabase
    .from('email_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!error && data) {
    return data as EmailLogEntry[];
  }

  // Fall back to email_queue
  const { data: queueData, error: queueError } = await supabase
    .from('email_queue')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (queueError) return [];

  // Map old format to new
  return (queueData ?? []).map((row: any) => ({
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    trigger_type: row.email_type as EmailTriggerType,
    recipient_email: row.recipient_email,
    subject: row.subject,
    body_preview: row.body?.substring(0, 500),
    status: row.status,
    sent_at: row.sent_at,
    error_message: row.error,
    created_at: row.created_at,
  }));
}

// Legacy re-exports for backward compatibility
export type EmailType = EmailTriggerType;
export type QueuedEmail = EmailLogEntry;
export const queueEmail = sendEmail;
export const fetchQueuedEmails = fetchEmailHistory;
