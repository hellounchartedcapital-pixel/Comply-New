// ============================================================================
// SmartCOI — Email Templates
// Friendly, professional notification emails that maximize vendor/tenant
// response rates. Tone scales with urgency.
// ============================================================================

export interface EmailMergeFields {
  entity_name: string; // vendor or tenant company name
  contact_name?: string; // optional contact person name
  entity_type: 'vendor' | 'tenant';
  property_name: string;
  organization_name: string;
  gaps_summary: string; // HTML list of compliance gaps
  portal_link: string;
  expiration_date: string; // formatted date string
  days_until_expiration: number;
  pm_name: string;
  pm_email: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

// ============================================================================
// Shared layout
// ============================================================================

function emailWrapper(body: string, fields: Pick<EmailMergeFields, 'organization_name'>): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="background:#059669;padding:20px 24px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;">SmartCOI</span>
    <span style="color:#d1fae5;font-size:12px;margin-left:8px;">${fields.organization_name}</span>
  </td></tr>
  <tr><td style="padding:24px;">${body}</td></tr>
  <tr><td style="padding:16px 24px;background:#f1f5f9;font-size:11px;color:#64748b;text-align:center;">
    This is an automated message from SmartCOI. Please do not reply directly to this email.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function portalButton(link: string, label = 'Upload Your Certificate'): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background:#059669;border-radius:6px;padding:12px 24px;">
  <a href="${link}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
</td></tr>
</table>`;
}

function greeting(fields: Pick<EmailMergeFields, 'contact_name' | 'entity_name'>): string {
  const name = fields.contact_name || fields.entity_name;
  return `<p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>`;
}

function contactBlock(fields: Pick<EmailMergeFields, 'pm_name' | 'pm_email'>): string {
  return `<p style="font-size:13px;color:#475569;margin-top:24px;">
  Questions? Reach out to <strong>${fields.pm_name}</strong> at <a href="mailto:${fields.pm_email}" style="color:#059669;">${fields.pm_email}</a>
</p>`;
}

function brokerInstruction(): string {
  return `<p style="font-size:14px;color:#334155;line-height:1.6;margin-top:16px;">
  Please send this email to your insurance broker and ask them to issue an updated certificate with these changes. Then upload the new certificate using the button below.
</p>`;
}

// ============================================================================
// Expiration Warning
// ============================================================================

export function expirationWarning(fields: EmailMergeFields): EmailTemplate {
  const days = fields.days_until_expiration;
  let message: string;

  if (days > 45) {
    // 60+ days: casual and friendly
    message = `Just a heads up that your certificate of insurance for <strong>${fields.property_name}</strong> expires on <strong>${fields.expiration_date}</strong>. No rush, but we wanted to give you plenty of time to get an updated certificate from your broker.`;
  } else if (days > 20) {
    // ~30 days: friendly but clear
    message = `Your certificate of insurance for <strong>${fields.property_name}</strong> expires on <strong>${fields.expiration_date}</strong> — about ${days} days from now. Please start the renewal process with your insurance broker so we can keep your file up to date.`;
  } else {
    // 14 days or less: direct
    message = `Your certificate of insurance for <strong>${fields.property_name}</strong> expires on <strong>${fields.expiration_date}</strong> — that\u2019s just <strong>${days} day${days !== 1 ? 's' : ''} away</strong>. Please upload an updated certificate as soon as possible to avoid a lapse in compliance.`;
  }

  const body = `
${greeting(fields)}
<p style="font-size:14px;color:#334155;line-height:1.6;">${message}</p>
${portalButton(fields.portal_link)}
${contactBlock(fields)}`;

  return {
    subject: `Your Certificate of Insurance for ${fields.property_name} Expires Soon`,
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Gap Notification
// ============================================================================

export function gapNotification(fields: EmailMergeFields): EmailTemplate {
  const body = `
${greeting(fields)}
<p style="font-size:14px;color:#334155;line-height:1.6;">
  We reviewed your certificate of insurance for <strong>${fields.property_name}</strong> and found a few items that need to be updated:
</p>
<div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin:16px 0;">
  ${fields.gaps_summary}
</div>
${brokerInstruction()}
${portalButton(fields.portal_link)}
${contactBlock(fields)}`;

  return {
    subject: `Action Needed: Certificate of Insurance Update for ${fields.property_name}`,
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Follow-Up Reminder
// ============================================================================

export function followUpReminder(fields: EmailMergeFields): EmailTemplate {
  const body = `
${greeting(fields)}
<p style="font-size:14px;color:#334155;line-height:1.6;">
  We wanted to follow up on your certificate of insurance for <strong>${fields.property_name}</strong>. We still need an updated certificate that addresses the following:
</p>
<div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin:16px 0;">
  ${fields.gaps_summary}
</div>
${brokerInstruction()}
${portalButton(fields.portal_link)}
${contactBlock(fields)}`;

  return {
    subject: `Friendly Reminder: Updated Certificate Needed for ${fields.property_name}`,
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Expired Notice
// ============================================================================

export function expiredNotice(fields: EmailMergeFields): EmailTemplate {
  const body = `
${greeting(fields)}
<p style="font-size:14px;color:#334155;line-height:1.6;">
  Your certificate of insurance for <strong>${fields.property_name}</strong> expired on <strong>${fields.expiration_date}</strong>. Please upload a current certificate immediately to maintain compliance.
</p>
<p style="font-size:14px;color:#334155;line-height:1.6;margin-top:12px;">
  If you\u2019ve already renewed your policy, just ask your broker to send over the updated certificate and upload it using the button below.
</p>
${portalButton(fields.portal_link)}
${contactBlock(fields)}`;

  return {
    subject: `Your Certificate of Insurance for ${fields.property_name} Has Expired`,
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Format gap descriptions as a friendly HTML list
// ============================================================================

export function formatGapsAsHtml(gaps: string[]): string {
  if (gaps.length === 0) return '<p style="font-size:13px;color:#475569;">No specific items listed.</p>';
  return `<ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#334155;line-height:2;">
${gaps.map((g) => `  <li>${g}</li>`).join('\n')}
</ul>`;
}
