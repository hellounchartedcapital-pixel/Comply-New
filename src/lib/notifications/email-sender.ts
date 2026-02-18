// ============================================================================
// SmartCOI — Email Sender (Resend integration)
// ============================================================================

import { Resend } from 'resend';

interface SendResult {
  success: boolean;
  error?: string;
  devMode?: boolean;
}

const DEFAULT_FROM_ADDRESS = 'SmartCOI <noreply@smartcoi.io>';

function getFromAddress(): string {
  return process.env.EMAIL_FROM_ADDRESS || DEFAULT_FROM_ADDRESS;
}

/**
 * Send an email via Resend. Falls back to console logging in development
 * when RESEND_API_KEY is not configured.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log('RESEND_API_KEY is missing — email will be logged to console only');
    console.log('=== EMAIL (dev mode) ===');
    console.log(`To: ${to}`);
    console.log(`From: ${getFromAddress()}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html.substring(0, 200)}...`);
    console.log('=== END EMAIL ===');
    return { success: true, devMode: true };
  }

  const fromAddress = getFromAddress();
  console.log(`Sending email via Resend — to: ${to}, from: ${fromAddress}`);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend API error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully, id:', data?.id);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown email send error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Email send failed:', msg);
    if (stack) console.error('Stack trace:', stack);
    return { success: false, error: msg };
  }
}
