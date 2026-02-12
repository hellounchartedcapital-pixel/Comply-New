/**
 * Email queue service — builds the infrastructure for automated email notifications.
 * Actual sending requires connecting a transactional email provider (Resend, SendGrid).
 * For now, emails are queued in the database and logged to console.
 */
import { supabase } from '@/lib/supabase';

export type EmailType =
  | 'expiration_30day'
  | 'expiration_14day'
  | 'expiration_day_of'
  | 'non_compliance';

export interface QueuedEmail {
  id: string;
  entity_type: 'vendor' | 'tenant';
  entity_id: string;
  email_type: EmailType;
  recipient_email: string;
  subject: string;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  sent_at?: string;
  error?: string;
  created_at: string;
}

interface QueueEmailParams {
  entityType: 'vendor' | 'tenant';
  entityId: string;
  emailType: EmailType;
  recipientEmail: string;
  recipientName: string;
  propertyName: string;
  expirationDate?: string;
  complianceGaps?: string[];
  managementCompany?: string;
}

function buildSubject(params: QueueEmailParams): string {
  switch (params.emailType) {
    case 'expiration_30day':
      return `Your COI for ${params.propertyName} expires in 30 days`;
    case 'expiration_14day':
      return `Reminder: Your COI for ${params.propertyName} expires in 14 days`;
    case 'expiration_day_of':
      return `Your COI for ${params.propertyName} has expired`;
    case 'non_compliance':
      return `Your COI for ${params.propertyName} does not meet coverage requirements`;
  }
}

function buildBody(params: QueueEmailParams): string {
  const greeting = `Dear ${params.recipientName},`;
  const footer = `\n\nThis is an automated message from SmartCOI${params.managementCompany ? ` on behalf of ${params.managementCompany}` : ''}.`;

  switch (params.emailType) {
    case 'expiration_30day':
      return `${greeting}\n\nYour Certificate of Insurance for ${params.propertyName} expires on ${params.expirationDate ?? 'N/A'}. Please upload an updated certificate at your earliest convenience.\n\nYou can upload your updated COI through your vendor portal link.${footer}`;

    case 'expiration_14day':
      return `${greeting}\n\nThis is a follow-up reminder that your Certificate of Insurance for ${params.propertyName} expires on ${params.expirationDate ?? 'N/A'}. Please upload an updated certificate as soon as possible.${footer}`;

    case 'expiration_day_of':
      return `${greeting}\n\nYour Certificate of Insurance for ${params.propertyName} has expired${params.expirationDate ? ` as of ${params.expirationDate}` : ''}. Please upload an updated certificate immediately.${footer}`;

    case 'non_compliance': {
      const gaps = params.complianceGaps?.length
        ? `\n\nThe following items need attention:\n${params.complianceGaps.map((g) => `  - ${g}`).join('\n')}`
        : '';
      return `${greeting}\n\nYour Certificate of Insurance for ${params.propertyName} does not meet the required coverage levels.${gaps}\n\nPlease upload a corrected certificate.${footer}`;
    }
  }
}

export async function queueEmail(params: QueueEmailParams): Promise<void> {
  const subject = buildSubject(params);
  const body = buildBody(params);

  // Try to insert into the email queue table
  const { error } = await supabase.from('email_queue').insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    email_type: params.emailType,
    recipient_email: params.recipientEmail,
    subject,
    body,
    status: 'queued',
  });

  if (error) {
    // Table may not exist — log to console as fallback
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('[Email Queue] Table not found — logging email instead:');
      console.log(`  To: ${params.recipientEmail}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Body: ${body.substring(0, 200)}...`);
      return;
    }
    console.warn('[Email Queue] Failed to queue email:', error.message);
  }
}

export async function fetchQueuedEmails(
  entityType: 'vendor' | 'tenant',
  entityId: string
): Promise<QueuedEmail[]> {
  const { data, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return (data as QueuedEmail[]) ?? [];
}
