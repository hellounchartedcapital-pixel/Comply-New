// ============================================================================
// SmartCOI — Email Templates
// Professional notification emails with merge-field substitution.
// ============================================================================

export interface EmailMergeFields {
  entity_name: string; // vendor or tenant company name
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

function portalButton(link: string, label = 'Upload Updated Certificate'): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background:#059669;border-radius:6px;padding:12px 24px;">
  <a href="${link}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
</td></tr>
</table>`;
}

function contactBlock(fields: Pick<EmailMergeFields, 'pm_name' | 'pm_email'>): string {
  return `<p style="font-size:13px;color:#475569;margin-top:24px;">
  If you have questions, please contact:<br/>
  <strong>${fields.pm_name}</strong> — <a href="mailto:${fields.pm_email}" style="color:#059669;">${fields.pm_email}</a>
</p>`;
}

// ============================================================================
// Expiration Warning
// ============================================================================

export function expirationWarning(fields: EmailMergeFields): EmailTemplate {
  const days = fields.days_until_expiration;
  let urgency: string;
  let tone: string;

  if (days > 45) {
    urgency = 'Friendly Reminder';
    tone = `This is a friendly reminder that the certificate of insurance for <strong>${fields.entity_name}</strong> will expire on <strong>${fields.expiration_date}</strong> (${days} days from now).`;
  } else if (days > 20) {
    urgency = 'Please Address Soon';
    tone = `The certificate of insurance for <strong>${fields.entity_name}</strong> is expiring on <strong>${fields.expiration_date}</strong> — just ${days} days away. Please arrange for an updated certificate at your earliest convenience.`;
  } else {
    urgency = 'Urgent Action Needed';
    tone = `The certificate of insurance for <strong>${fields.entity_name}</strong> expires on <strong>${fields.expiration_date}</strong> — only <strong>${days} day${days !== 1 ? 's' : ''}</strong> remain. Immediate action is required to maintain compliance.`;
  }

  const body = `
<p style="font-size:14px;color:#1e293b;margin:0 0 16px;">
  <strong style="color:#059669;">${urgency}</strong>
</p>
<p style="font-size:14px;color:#334155;line-height:1.6;">${tone}</p>
<p style="font-size:13px;color:#475569;margin-top:12px;">
  <strong>Property:</strong> ${fields.property_name}<br/>
  <strong>${fields.entity_type === 'vendor' ? 'Vendor' : 'Tenant'}:</strong> ${fields.entity_name}<br/>
  <strong>Expiration Date:</strong> ${fields.expiration_date}
</p>
<p style="font-size:14px;color:#334155;margin-top:16px;">
  Please upload an updated certificate of insurance using the link below:
</p>
${portalButton(fields.portal_link)}
${contactBlock(fields)}`;

  return {
    subject: 'Certificate of Insurance Expiring Soon — Action Required',
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Gap Notification
// ============================================================================

export function gapNotification(fields: EmailMergeFields): EmailTemplate {
  const body = `
<p style="font-size:14px;color:#1e293b;margin:0 0 16px;">
  <strong>Coverage Gaps Identified</strong>
</p>
<p style="font-size:14px;color:#334155;line-height:1.6;">
  We have reviewed the certificate of insurance on file for <strong>${fields.entity_name}</strong>
  at <strong>${fields.property_name}</strong> and identified the following compliance gaps:
</p>
<div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:12px 16px;margin:16px 0;">
  ${fields.gaps_summary}
</div>
<p style="font-size:14px;color:#334155;margin-top:16px;">
  To become fully compliant, please have your insurance provider issue an updated certificate
  addressing the items above and upload it using the link below:
</p>
${portalButton(fields.portal_link)}
${contactBlock(fields)}`;

  return {
    subject: 'Certificate of Insurance — Coverage Gaps Identified',
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Follow-Up Reminder
// ============================================================================

export function followUpReminder(fields: EmailMergeFields): EmailTemplate {
  const body = `
<p style="font-size:14px;color:#1e293b;margin:0 0 16px;">
  <strong>Reminder: Updated Certificate Needed</strong>
</p>
<p style="font-size:14px;color:#334155;line-height:1.6;">
  This is a follow-up regarding the certificate of insurance for <strong>${fields.entity_name}</strong>
  at <strong>${fields.property_name}</strong>. We previously notified you of compliance gaps,
  and we have not yet received an updated certificate.
</p>
<div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:12px 16px;margin:16px 0;">
  ${fields.gaps_summary}
</div>
<p style="font-size:14px;color:#334155;margin-top:16px;">
  It is important that these items are addressed promptly. Please upload an updated certificate:
</p>
${portalButton(fields.portal_link)}
${contactBlock(fields)}`;

  return {
    subject: 'Reminder: Updated Certificate of Insurance Needed',
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Expired Notice
// ============================================================================

export function expiredNotice(fields: EmailMergeFields): EmailTemplate {
  const body = `
<p style="font-size:14px;color:#1e293b;margin:0 0 16px;">
  <strong style="color:#dc2626;">Immediate Action Required</strong>
</p>
<p style="font-size:14px;color:#334155;line-height:1.6;">
  The certificate of insurance for <strong>${fields.entity_name}</strong>
  at <strong>${fields.property_name}</strong> expired on <strong>${fields.expiration_date}</strong>.
  Without a current certificate, ${fields.entity_type === 'vendor' ? 'work performed' : 'occupancy'}
  may not be covered by insurance.
</p>
<p style="font-size:14px;color:#334155;margin-top:12px;">
  Please have your insurance provider issue a new certificate of insurance immediately
  and upload it using the link below:
</p>
${portalButton(fields.portal_link, 'Upload New Certificate Now')}
${contactBlock(fields)}`;

  return {
    subject: 'Certificate of Insurance Expired — Immediate Action Required',
    html: emailWrapper(body, fields),
  };
}

// ============================================================================
// Format gap descriptions as HTML list
// ============================================================================

export function formatGapsAsHtml(gaps: string[]): string {
  if (gaps.length === 0) return '<p style="font-size:13px;color:#991b1b;">No specific gaps listed.</p>';
  return `<ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#991b1b;line-height:1.8;">
${gaps.map((g) => `  <li>${g}</li>`).join('\n')}
</ul>`;
}
