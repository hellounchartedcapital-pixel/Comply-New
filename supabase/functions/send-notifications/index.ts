import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface Vendor {
  id: string;
  name: string;
  expiration_date: string;
  status: string;
  coverage: any;
  user_id: string;
  additional_coverages: any[];
}

interface NotificationSettings {
  user_id: string;
  email_notifications: boolean;
  notify_expiring: boolean;
  notify_expired: boolean;
  notify_non_compliant: boolean;
  days_before_expiration: number;
  notification_email: string;
  notification_frequency: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get all active notification settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('notification_settings')
      .select('*')
      .eq('email_notifications', true);

    if (settingsError) {
      throw settingsError;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each user's notifications
    for (const userSettings of (settings as NotificationSettings[])) {
      try {
        // Get user's vendors
        const { data: vendors, error: vendorsError } = await supabaseClient
          .from('vendors')
          .select('*')
          .eq('user_id', userSettings.user_id);

        if (vendorsError) {
          console.error(`Error fetching vendors for user ${userSettings.user_id}:`, vendorsError);
          continue;
        }

        const expiringVendors: Vendor[] = [];
        const expiredVendors: Vendor[] = [];
        const nonCompliantVendors: Vendor[] = [];

        for (const vendor of (vendors as Vendor[])) {
          const expirationDate = new Date(vendor.expiration_date);
          const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Check for expiring
          if (userSettings.notify_expiring && daysUntilExpiration > 0 && daysUntilExpiration <= userSettings.days_before_expiration) {
            expiringVendors.push(vendor);
          }

          // Check for expired
          if (userSettings.notify_expired && daysUntilExpiration < 0) {
            expiredVendors.push(vendor);
          }

          // Check for non-compliant
          if (userSettings.notify_non_compliant && vendor.status === 'non-compliant') {
            nonCompliantVendors.push(vendor);
          }
        }

        // If there are any issues, send email
        if (expiringVendors.length > 0 || expiredVendors.length > 0 || nonCompliantVendors.length > 0) {
          await sendNotificationEmail(
            userSettings.notification_email,
            expiringVendors,
            expiredVendors,
            nonCompliantVendors,
            userSettings.days_before_expiration
          );
        }
      } catch (userError) {
        console.error(`Error processing notifications for user ${userSettings.user_id}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function sendNotificationEmail(
  to: string,
  expiringVendors: Vendor[],
  expiredVendors: Vendor[],
  nonCompliantVendors: Vendor[],
  daysThreshold: number
) {
  // Using Resend API (you can also use SendGrid, Mailgun, etc.)
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return;
  }

  const emailBody = generateEmailBody(expiringVendors, expiredVendors, nonCompliantVendors, daysThreshold);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'SmartCOI <notifications@smartcoi.io>',
      to: [to],
      subject: `SmartCOI Alert: ${expiredVendors.length + expiringVendors.length + nonCompliantVendors.length} Vendor Issues Require Attention`,
      html: emailBody,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Error sending email:', data);
  } else {
    console.log('Email sent successfully to', to);
  }
}

function generateEmailBody(
  expiringVendors: Vendor[],
  expiredVendors: Vendor[],
  nonCompliantVendors: Vendor[],
  daysThreshold: number
): string {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #10b981; }
        .critical { border-left-color: #ef4444; }
        .warning { border-left-color: #f59e0b; }
        .vendor { padding: 12px; margin: 8px 0; background: #f9fafb; border-radius: 4px; }
        .vendor-name { font-weight: bold; color: #111827; }
        .vendor-detail { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 SmartCOI Compliance Alert</h1>
          <p>Your vendor insurance compliance report</p>
        </div>
        <div class="content">
  `;

  if (expiredVendors.length > 0) {
    html += `
      <div class="section critical">
        <h2 style="color: #ef4444; margin-top: 0;">🚨 Expired Policies (${expiredVendors.length})</h2>
        <p>The following vendors have expired insurance policies:</p>
    `;
    for (const vendor of expiredVendors) {
      const expDate = new Date(vendor.expiration_date);
      const daysOverdue = Math.floor((new Date().getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
      html += `
        <div class="vendor">
          <div class="vendor-name">${vendor.name}</div>
          <div class="vendor-detail">Expired: ${expDate.toLocaleDateString()} (${daysOverdue} days overdue)</div>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (expiringVendors.length > 0) {
    html += `
      <div class="section warning">
        <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Expiring Soon (${expiringVendors.length})</h2>
        <p>The following vendors have policies expiring within ${daysThreshold} days:</p>
    `;
    for (const vendor of expiringVendors) {
      const expDate = new Date(vendor.expiration_date);
      const daysUntil = Math.floor((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      html += `
        <div class="vendor">
          <div class="vendor-name">${vendor.name}</div>
          <div class="vendor-detail">Expires: ${expDate.toLocaleDateString()} (in ${daysUntil} days)</div>
        </div>
      `;
    }
    html += `</div>`;
  }

  if (nonCompliantVendors.length > 0) {
    html += `
      <div class="section warning">
        <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Non-Compliant Coverage (${nonCompliantVendors.length})</h2>
        <p>The following vendors do not meet your insurance requirements:</p>
    `;
    for (const vendor of nonCompliantVendors) {
      html += `
        <div class="vendor">
          <div class="vendor-name">${vendor.name}</div>
          <div class="vendor-detail">Coverage limits below requirements</div>
        </div>
      `;
    }
    html += `</div>`;
  }

  html += `
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://smartcoi.io/app" class="button">View Full Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from SmartCOI</p>
          <p>Manage your notification settings in the SmartCOI dashboard</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}
