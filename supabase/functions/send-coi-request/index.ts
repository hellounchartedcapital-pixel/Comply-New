import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

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

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

interface Requirements {
  generalLiability?: number;
  autoLiability?: number;
  workersComp?: boolean;
  employersLiability?: number;
  additionalInsured?: boolean;
  waiverOfSubrogation?: boolean;
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
  requirements?: Requirements;
  propertyName?: string;
  isTenant?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

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

    const {
      to,
      vendorName,
      vendorStatus,
      issues,
      companyName,
      replyTo,
      uploadToken,
      appUrl,
      requirements,
      propertyName,
      isTenant
    }: EmailRequest = await req.json();

    if (!to || !vendorName) {
      throw new Error('Missing required fields: to, vendorName');
    }

    const entityType = isTenant ? 'tenant' : 'vendor';
    const displayCompanyName = companyName || 'Our Company';

    // Build issues list
    const issuesList = issues && issues.length > 0
      ? issues.map(i => `<li style="margin: 8px 0; color: #dc2626;">${i}</li>`).join('')
      : '<li style="margin: 8px 0; color: #dc2626;">Certificate needs to be updated</li>';

    // Build requirements list
    let requirementsList = '';
    if (requirements) {
      const reqs: string[] = [];
      if (requirements.generalLiability) {
        reqs.push(`General Liability: ${formatCurrency(requirements.generalLiability)} minimum`);
      }
      if (requirements.autoLiability) {
        reqs.push(`Auto Liability: ${formatCurrency(requirements.autoLiability)} minimum`);
      }
      if (requirements.workersComp) {
        reqs.push(`Workers' Compensation: Statutory limits required`);
      }
      if (requirements.employersLiability) {
        reqs.push(`Employers' Liability: ${formatCurrency(requirements.employersLiability)} minimum`);
      }
      if (requirements.additionalInsured) {
        reqs.push(`Additional Insured: ${displayCompanyName} must be listed as additional insured`);
      }
      if (requirements.waiverOfSubrogation) {
        reqs.push(`Waiver of Subrogation: Required in favor of ${displayCompanyName}`);
      }

      if (reqs.length > 0) {
        requirementsList = reqs.map(r => `<li style="margin: 8px 0; color: #059669;">${r}</li>`).join('');
      }
    }

    const subject = `Action Required: Updated Certificate of Insurance Needed - ${vendorName}`;

    // Build upload link if token is provided
    const baseUrl = appUrl || 'https://smartcoi.io';
    const uploadLink = uploadToken ? `${baseUrl}/upload/${uploadToken}` : null;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
  <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

    <!-- Header with Company Name -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0 0 8px 0; font-size: 24px;">Certificate of Insurance Request</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">From <strong>${displayCompanyName}</strong></p>
    </div>

    <div style="padding: 30px;">
      <!-- Greeting -->
      <p style="margin-top: 0; font-size: 16px;">Hello,</p>

      <p style="font-size: 16px;">
        <strong>${displayCompanyName}</strong> is requesting an updated Certificate of Insurance for
        <strong>${vendorName}</strong>${propertyName ? ` at <strong>${propertyName}</strong>` : ''}.
      </p>

      <!-- Current Status -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 600; color: #92400e; font-size: 14px;">
          CURRENT STATUS: <span style="text-transform: uppercase;">${vendorStatus.replace('-', ' ')}</span>
        </p>
      </div>

      <!-- Issues Found -->
      <div style="margin: 25px 0;">
        <h3 style="color: #dc2626; margin: 0 0 12px 0; font-size: 16px; display: flex; align-items: center;">
          <span style="margin-right: 8px;">⚠️</span> Issues Found
        </h3>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px;">
          <ul style="margin: 0; padding-left: 20px;">
            ${issuesList}
          </ul>
        </div>
      </div>

      ${requirementsList ? `
      <!-- Requirements -->
      <div style="margin: 25px 0;">
        <h3 style="color: #059669; margin: 0 0 12px 0; font-size: 16px; display: flex; align-items: center;">
          <span style="margin-right: 8px;">✓</span> Our Requirements
        </h3>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #065f46;">
            To be compliant, your certificate must meet these requirements:
          </p>
          <ul style="margin: 0; padding-left: 20px;">
            ${requirementsList}
          </ul>
        </div>
      </div>
      ` : ''}

      <!-- Upload Button -->
      ${uploadLink ? `
      <div style="text-align: center; margin: 35px 0;">
        <a href="${uploadLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
          Upload Your Certificate
        </a>
      </div>
      <p style="text-align: center; font-size: 13px; color: #6b7280; margin-top: -10px;">
        Or copy this link: <a href="${uploadLink}" style="color: #10b981; word-break: break-all;">${uploadLink}</a>
      </p>
      ` : `
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
        <p style="margin: 0; color: #4b5563;">Please reply to this email with your updated Certificate of Insurance attached.</p>
      </div>
      `}

      <!-- Contact Info -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 25px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">
          If you have any questions about these requirements, please contact us by replying to this email.
        </p>
        <p style="margin: 0; font-size: 16px;">
          Thank you,<br>
          <strong>${displayCompanyName}</strong>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This email was sent via <a href="https://smartcoi.io" style="color: #10b981; text-decoration: none;">SmartCOI</a> - Automated Certificate of Insurance Management
      </p>
    </div>
  </div>
</body>
</html>`;

    // Build plain text requirements
    let textRequirements = '';
    if (requirements) {
      const reqs: string[] = [];
      if (requirements.generalLiability) {
        reqs.push(`• General Liability: ${formatCurrency(requirements.generalLiability)} minimum`);
      }
      if (requirements.autoLiability) {
        reqs.push(`• Auto Liability: ${formatCurrency(requirements.autoLiability)} minimum`);
      }
      if (requirements.workersComp) {
        reqs.push(`• Workers' Compensation: Statutory limits required`);
      }
      if (requirements.employersLiability) {
        reqs.push(`• Employers' Liability: ${formatCurrency(requirements.employersLiability)} minimum`);
      }
      if (requirements.additionalInsured) {
        reqs.push(`• Additional Insured: ${displayCompanyName} must be listed as additional insured`);
      }
      if (requirements.waiverOfSubrogation) {
        reqs.push(`• Waiver of Subrogation: Required in favor of ${displayCompanyName}`);
      }

      if (reqs.length > 0) {
        textRequirements = `\nOUR REQUIREMENTS:\nTo be compliant, your certificate must meet these requirements:\n${reqs.join('\n')}\n`;
      }
    }

    const textIssuesList = issues && issues.length > 0
      ? issues.map(i => `• ${i}`).join('\n')
      : '• Certificate needs to be updated';

    const textContent = `CERTIFICATE OF INSURANCE REQUEST
From ${displayCompanyName}

Hello,

${displayCompanyName} is requesting an updated Certificate of Insurance for ${vendorName}${propertyName ? ` at ${propertyName}` : ''}.

CURRENT STATUS: ${vendorStatus.toUpperCase().replace('-', ' ')}

ISSUES FOUND:
${textIssuesList}
${textRequirements}
${uploadLink ? `UPLOAD YOUR CERTIFICATE:\n${uploadLink}` : 'Please reply to this email with your updated Certificate of Insurance attached.'}

If you have any questions about these requirements, please contact us by replying to this email.

Thank you,
${displayCompanyName}

---
This email was sent via SmartCOI - https://smartcoi.io`;

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
