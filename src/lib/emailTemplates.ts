// ============================================
// SmartCOI — Email Templates
// HTML email templates for automated COI notifications.
// Each function returns a complete HTML string for the email body.
// ============================================

export interface EmailTemplateParams {
  entityName: string;
  propertyName: string;
  uploadUrl: string; // https://smartcoi.io/upload/{token}
  issues?: string[];
  daysUntilExpiration?: number;
  expirationDate?: string;
}

// ============================================
// Shared layout helpers
// ============================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>SmartCOI Notification</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #0D9488 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">SmartCOI</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.85); font-weight: 400;">Automated Certificate of Insurance Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px 28px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                This is an automated notification from <a href="https://smartcoi.io" style="color: #10B981; text-decoration: none;">SmartCOI</a>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #d1d5db; text-align: center; line-height: 1.5;">
                If you believe you received this in error, please contact your property manager.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function uploadButton(uploadUrl: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(uploadUrl)}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #0D9488 100%); color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); letter-spacing: 0.2px;">
                      Upload Your Certificate
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">
                      Or copy this link: <a href="${escapeHtml(uploadUrl)}" style="color: #10B981; word-break: break-all; text-decoration: underline;">${escapeHtml(uploadUrl)}</a>
                    </p>
                  </td>
                </tr>
              </table>`;
}

function issuesList(issues: string[]): string {
  if (!issues || issues.length === 0) return '';
  const items = issues
    .map(
      (issue) =>
        `<li style="margin: 6px 0; font-size: 14px; color: #991b1b; line-height: 1.5;">${escapeHtml(issue)}</li>`
    )
    .join('');
  return `<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 16px 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Issues Found</p>
                <ul style="margin: 0; padding-left: 18px;">
                  ${items}
                </ul>
              </div>`;
}

function propertyBadge(propertyName: string): string {
  return `<p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Property</p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #111827; font-weight: 500;">${escapeHtml(propertyName)}</p>`;
}

// ============================================
// 1. Expiring COI — certificate expires in N days
// ============================================

export function expiringEmail(params: EmailTemplateParams): string {
  const { entityName, propertyName, uploadUrl, daysUntilExpiration, expirationDate } = params;
  const days = daysUntilExpiration ?? 30;
  const urgencyColor = days <= 7 ? '#dc2626' : '#f59e0b';
  const urgencyBg = days <= 7 ? '#fef2f2' : '#fffbeb';
  const urgencyBorder = days <= 7 ? '#fecaca' : '#fde68a';
  const urgencyLabel = days <= 7 ? 'Expiring Soon' : 'Expiration Notice';

  const content = `${propertyBadge(propertyName)}

              <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                Hello,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                The Certificate of Insurance on file for <strong style="color: #111827;">${escapeHtml(entityName)}</strong> is expiring soon. Please upload an updated certificate to remain in compliance.
              </p>

              <!-- Urgency Banner -->
              <div style="background-color: ${urgencyBg}; border: 1px solid ${urgencyBorder}; border-left: 4px solid ${urgencyColor}; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: ${urgencyColor}; text-transform: uppercase; letter-spacing: 0.5px;">${urgencyLabel}</p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${urgencyColor};">
                  ${days} day${days !== 1 ? 's' : ''} remaining
                </p>
                ${expirationDate ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">Expiration date: ${escapeHtml(expirationDate)}</p>` : ''}
              </div>

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                To keep your compliance status active, please upload a renewed certificate before the expiration date.
              </p>

              ${uploadButton(uploadUrl)}`;

  return baseLayout(content);
}

// ============================================
// 2. Expired COI — certificate has expired
// ============================================

export function expiredEmail(params: EmailTemplateParams): string {
  const { entityName, propertyName, uploadUrl, expirationDate } = params;

  const content = `${propertyBadge(propertyName)}

              <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                Hello,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                The Certificate of Insurance on file for <strong style="color: #111827;">${escapeHtml(entityName)}</strong> has <strong style="color: #dc2626;">expired</strong>. Immediate action is required to restore compliance.
              </p>

              <!-- Expired Banner -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Certificate Expired</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #dc2626;">
                  Coverage is no longer active
                </p>
                ${expirationDate ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">Expired on: ${escapeHtml(expirationDate)}</p>` : ''}
              </div>

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #374151; line-height: 1.6;">
                Operating without a valid certificate may put you out of compliance with your contractual obligations. Please upload a current certificate as soon as possible.
              </p>

              ${uploadButton(uploadUrl)}`;

  return baseLayout(content);
}

// ============================================
// 3. Non-Compliant COI — doesn't meet requirements
// ============================================

export function nonCompliantEmail(params: EmailTemplateParams): string {
  const { entityName, propertyName, uploadUrl, issues: issueItems } = params;

  const content = `${propertyBadge(propertyName)}

              <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                Hello,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                The Certificate of Insurance on file for <strong style="color: #111827;">${escapeHtml(entityName)}</strong> has been reviewed and <strong style="color: #dc2626;">does not meet</strong> the current insurance requirements.
              </p>

              <!-- Non-Compliant Banner -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Action Required</p>
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #92400e;">
                  Certificate does not meet requirements
                </p>
              </div>

              ${issuesList(issueItems || [])}

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #374151; line-height: 1.6;">
                Please work with your insurance provider to address the issues listed above and upload an updated certificate that meets all requirements.
              </p>

              ${uploadButton(uploadUrl)}`;

  return baseLayout(content);
}

// ============================================
// 4. Follow-Up — reminder for still non-compliant/expired
// ============================================

export function followUpEmail(params: EmailTemplateParams): string {
  const { entityName, propertyName, uploadUrl, issues: issueItems, expirationDate } = params;

  const content = `${propertyBadge(propertyName)}

              <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                Hello,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                This is a follow-up reminder regarding the Certificate of Insurance for <strong style="color: #111827;">${escapeHtml(entityName)}</strong>. Our records show the certificate is still <strong style="color: #dc2626;">not in compliance</strong>.
              </p>

              <!-- Reminder Banner -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Follow-Up Reminder</p>
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #dc2626;">
                  Certificate update still required
                </p>
                ${expirationDate ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">Expiration date on file: ${escapeHtml(expirationDate)}</p>` : ''}
              </div>

              ${issuesList(issueItems || [])}

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #374151; line-height: 1.6;">
                We previously notified you about compliance issues with this certificate. Please upload an updated certificate at your earliest convenience to avoid any disruption.
              </p>

              <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                If you have already submitted an updated certificate, please disregard this message. It may take a short time for our records to update.
              </p>

              ${uploadButton(uploadUrl)}`;

  return baseLayout(content);
}

// ============================================
// 5. Compliant Confirmed — COI is on file and compliant
// ============================================

export function compliantConfirmedEmail(params: EmailTemplateParams): string {
  const { entityName, propertyName, expirationDate } = params;

  const content = `${propertyBadge(propertyName)}

              <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                Hello,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                Great news! The Certificate of Insurance for <strong style="color: #111827;">${escapeHtml(entityName)}</strong> has been reviewed and is <strong style="color: #059669;">fully compliant</strong> with all requirements.
              </p>

              <!-- Compliant Banner -->
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-left: 4px solid #10B981; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Compliance Verified</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">
                  Certificate is compliant
                </p>
                ${expirationDate ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">Valid through: ${escapeHtml(expirationDate)}</p>` : ''}
              </div>

              <p style="margin: 20px 0 0 0; font-size: 14px; color: #374151; line-height: 1.6;">
                No action is needed at this time. We will notify you before the certificate expires so you can prepare a renewal in advance.
              </p>

              <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Thank you for keeping your insurance documentation up to date.
              </p>`;

  return baseLayout(content);
}
