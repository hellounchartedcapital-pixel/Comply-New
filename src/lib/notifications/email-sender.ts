// ============================================================================
// SmartCOI — Email Sender (Resend integration)
// ============================================================================

import { Resend } from 'resend';

interface SendResult {
  success: boolean;
  error?: string;
}

const FROM_ADDRESS = 'SmartCOI <notifications@smartcoi.com>';

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
    console.log('=== EMAIL (RESEND_API_KEY not set — dev mode) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html.substring(0, 200)}...`);
    console.log('=== END EMAIL ===');
    return { success: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown email send error';
    console.error('Email send failed:', msg);
    return { success: false, error: msg };
  }
}
