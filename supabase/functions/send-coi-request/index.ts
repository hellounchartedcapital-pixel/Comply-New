import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 emails per minute

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const authHeader = req.headers.get('authorization') || '';
  return `${clientIp}:${authHeader.slice(-20)}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn: record.resetTime - now };
}

interface EmailRequest {
  to: string;
  vendorName: string;
  vendorStatus: string;
  issues: string[];
  companyName: string;
  fromEmail?: string;
  replyTo?: string;
  uploadToken?: string;
  appUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check rate limit
  const rateLimitKey = getRateLimitKey(req);
  const rateLimit = checkRateLimit(rateLimitKey);

  const rateLimitHeaders = {
    'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please wait before sending more emails.',
        retryAfter: Math.ceil(rateLimit.resetIn / 1000),
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        status: 429,
      }
    );
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'SmartCOI <noreply@resend.dev>';

    const { to, vendorName, vendorStatus, issues, companyName, replyTo, uploadToken, appUrl }: EmailRequest = await req.json();

    if (!to || !vendorName) {
      throw new Error('Missing required fields: to, vendorName');
    }

    // Build email content
    const issuesList = issues && issues.length > 0
      ? issues.map(i => `• ${i}`).join('\n')
      : '• COI needs to be updated';

    const subject = `Updated Certificate of Insurance Required - ${vendorName}`;

    // Build upload link if token is provided
    const baseUrl = appUrl || 'https://smartcoi.io';
    const uploadLink = uploadToken ? `${baseUrl}?upload=${uploadToken}` : null;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Certificate of Insurance Request</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Hello,</p>

    <p>We are reaching out regarding the Certificate of Insurance (COI) on file for <strong>${vendorName}</strong>.</p>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">Current Status: ${vendorStatus.toUpperCase().replace('-', ' ')}</p>
    </div>

    <p><strong>Issues identified:</strong></p>
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0;">
      <pre style="margin: 0; white-space: pre-wrap; font-family: inherit;">${issuesList}</pre>
    </div>

    <p>Please provide an updated COI that meets our insurance requirements at your earliest convenience.</p>

    ${uploadLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${uploadLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Upload Your COI Now
      </a>
    </div>
    <p style="text-align: center; font-size: 12px; color: #6b7280;">
      Or copy this link: <a href="${uploadLink}" style="color: #10b981;">${uploadLink}</a>
    </p>
    ` : '<p>Please reply to this email with your updated COI attached.</p>'}

    <p>If you have any questions about our requirements, please don't hesitate to reach out.</p>

    <p style="margin-bottom: 0;">Thank you,<br><strong>${companyName || 'The Team'}</strong></p>
  </div>

  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">This email was sent via SmartCOI</p>
  </div>
</body>
</html>`;

    const textContent = `Hello,

We are reaching out regarding the Certificate of Insurance (COI) on file for ${vendorName}.

Current Status: ${vendorStatus.toUpperCase().replace('-', ' ')}

Issues identified:
${issuesList}

Please provide an updated COI that meets our insurance requirements at your earliest convenience.

${uploadLink ? `Upload your COI here: ${uploadLink}` : 'Please reply to this email with your updated COI attached.'}

If you have any questions about our requirements, please don't hesitate to reach out.

Thank you,
${companyName || 'The Team'}

---
This email was sent via SmartCOI`;

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        reply_to: replyTo,
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      throw new Error(resendResult.message || 'Failed to send email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        emailId: resendResult.id,
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
