import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface Vendor {
  id: string;
  user_id: string;
  name: string;
  status: string;
  expiration_date: string;
  contact_email: string | null;
  upload_token: string | null;
  last_contacted_at: string | null;
  issues: Array<{ type: string; message: string }> | null;
  coverage: Record<string, unknown> | null;
}

interface UserSettings {
  user_id: string;
  company_name: string | null;
  auto_follow_up_enabled: boolean;
  follow_up_days: number[];
  follow_up_on_expired: boolean;
  follow_up_on_non_compliant: boolean;
  follow_up_frequency_days: number;
}

interface Subscription {
  user_id: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: string;
}

// Plans that have auto follow-up feature
const PLANS_WITH_AUTO_FOLLOWUP = ['starter', 'professional', 'enterprise'];

interface FollowUpResult {
  vendorId: string;
  vendorName: string;
  email: string;
  success: boolean;
  reason: string;
  emailId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);
  const results: FollowUpResult[] = [];
  let processedUsers = 0;
  let totalVendorsChecked = 0;
  let emailsSent = 0;

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'SmartCOI <noreply@resend.dev>';
    const APP_URL = Deno.env.get('APP_URL') || 'https://smartcoi.io';

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with auto follow-up enabled
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('auto_follow_up_enabled', true);

    if (settingsError) {
      throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    }

    if (!settingsData || settingsData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users with auto follow-up enabled',
          processed: 0,
          emailsSent: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all subscriptions to check plan eligibility
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status');

    if (subError) {
      console.error('Failed to fetch subscriptions:', subError);
    }

    // Create a map for quick lookup
    const subscriptionMap = new Map<string, Subscription>();
    if (subscriptions) {
      for (const sub of subscriptions) {
        subscriptionMap.set(sub.user_id, sub as Subscription);
      }
    }

    // Process each user
    for (const settings of settingsData as UserSettings[]) {
      processedUsers++;

      // Check if user has a plan with auto follow-up feature
      const subscription = subscriptionMap.get(settings.user_id);
      if (!subscription || !PLANS_WITH_AUTO_FOLLOWUP.includes(subscription.plan)) {
        results.push({
          vendorId: '',
          vendorName: 'N/A',
          email: 'N/A',
          success: false,
          reason: `User ${settings.user_id} is on ${subscription?.plan || 'free'} plan (auto follow-up requires paid plan)`,
        });
        continue;
      }

      // Check if subscription is active
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        results.push({
          vendorId: '',
          vendorName: 'N/A',
          email: 'N/A',
          success: false,
          reason: `User ${settings.user_id} subscription is ${subscription.status}`,
        });
        continue;
      }

      // Get vendors for this user
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', settings.user_id)
        .not('contact_email', 'is', null);

      if (vendorsError || !vendors) {
        console.error(`Failed to fetch vendors for user ${settings.user_id}:`, vendorsError);
        continue;
      }

      // Check each vendor
      for (const vendor of vendors as Vendor[]) {
        totalVendorsChecked++;

        // Skip if no email
        if (!vendor.contact_email) {
          continue;
        }

        // Check if recently contacted
        if (vendor.last_contacted_at) {
          const lastContacted = new Date(vendor.last_contacted_at);
          const daysSinceContact = Math.floor((today.getTime() - lastContacted.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceContact < settings.follow_up_frequency_days) {
            results.push({
              vendorId: vendor.id,
              vendorName: vendor.name,
              email: vendor.contact_email,
              success: false,
              reason: `Recently contacted (${daysSinceContact} days ago)`,
            });
            continue;
          }
        }

        // Determine if follow-up is needed
        let shouldFollowUp = false;
        let followUpReason = '';

        const expirationDate = vendor.expiration_date ? new Date(vendor.expiration_date) : null;

        if (expirationDate) {
          expirationDate.setHours(0, 0, 0, 0);
          const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Check if expired
          if (daysUntilExpiration < 0 && settings.follow_up_on_expired) {
            shouldFollowUp = true;
            followUpReason = 'expired';
          }

          // Check if expiring soon
          if (!shouldFollowUp && settings.follow_up_days && settings.follow_up_days.length > 0) {
            for (const days of settings.follow_up_days) {
              if (daysUntilExpiration === days) {
                shouldFollowUp = true;
                followUpReason = `expiring in ${days} days`;
                break;
              }
            }
          }
        }

        // Check if non-compliant
        if (!shouldFollowUp && settings.follow_up_on_non_compliant && vendor.status === 'non-compliant') {
          shouldFollowUp = true;
          followUpReason = 'non-compliant';
        }

        if (!shouldFollowUp) {
          continue;
        }

        // Build issues list
        const issuesList = vendor.issues && vendor.issues.length > 0
          ? vendor.issues.map(i => typeof i === 'string' ? i : i.message)
          : ['COI needs to be updated'];

        // Send email
        try {
          const uploadLink = vendor.upload_token ? `${APP_URL}?upload=${vendor.upload_token}` : null;

          const emailResponse = await sendFollowUpEmail({
            to: vendor.contact_email,
            vendorName: vendor.name,
            vendorStatus: vendor.status,
            issues: issuesList,
            companyName: settings.company_name || 'Your Business Partner',
            uploadLink,
            resendApiKey: RESEND_API_KEY,
            fromEmail: FROM_EMAIL,
            reason: followUpReason,
          });

          if (emailResponse.success) {
            emailsSent++;

            // Update last_contacted_at
            await supabase
              .from('vendors')
              .update({ last_contacted_at: new Date().toISOString() })
              .eq('id', vendor.id);

            // Log activity
            await supabase
              .from('vendor_activity')
              .insert({
                vendor_id: vendor.id,
                user_id: settings.user_id,
                action: 'auto_follow_up_sent',
                details: {
                  reason: followUpReason,
                  email: vendor.contact_email,
                  emailId: emailResponse.emailId,
                },
              });

            results.push({
              vendorId: vendor.id,
              vendorName: vendor.name,
              email: vendor.contact_email,
              success: true,
              reason: followUpReason,
              emailId: emailResponse.emailId,
            });
          } else {
            results.push({
              vendorId: vendor.id,
              vendorName: vendor.name,
              email: vendor.contact_email,
              success: false,
              reason: `Email failed: ${emailResponse.error}`,
            });
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${vendor.contact_email}:`, emailError);
          results.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            email: vendor.contact_email,
            success: false,
            reason: `Email error: ${emailError.message}`,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto follow-up completed',
        processedUsers,
        totalVendorsChecked,
        emailsSent,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Auto follow-up error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Auto follow-up failed',
        processedUsers,
        totalVendorsChecked,
        emailsSent,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

interface SendEmailParams {
  to: string;
  vendorName: string;
  vendorStatus: string;
  issues: string[];
  companyName: string;
  uploadLink: string | null;
  resendApiKey: string;
  fromEmail: string;
  reason: string;
}

async function sendFollowUpEmail(params: SendEmailParams): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { to, vendorName, vendorStatus, issues, companyName, uploadLink, resendApiKey, fromEmail, reason } = params;

  const issuesList = issues.map(i => `• ${i}`).join('\n');

  // Customize subject based on reason
  let subject = `Updated Certificate of Insurance Required - ${vendorName}`;
  if (reason === 'expired') {
    subject = `URGENT: Expired Certificate of Insurance - ${vendorName}`;
  } else if (reason.includes('expiring')) {
    subject = `Reminder: Certificate Expiring Soon - ${vendorName}`;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Certificate of Insurance Update Required</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">Hello,</p>

    <p>This is an automated reminder regarding the Certificate of Insurance (COI) on file for <strong>${vendorName}</strong>.</p>

    <div style="background: ${vendorStatus === 'expired' ? '#fef2f2' : '#fef3c7'}; border: 1px solid ${vendorStatus === 'expired' ? '#ef4444' : '#f59e0b'}; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: ${vendorStatus === 'expired' ? '#dc2626' : '#92400e'};">
        Status: ${vendorStatus.toUpperCase().replace('-', ' ')}
      </p>
    </div>

    <p><strong>Action needed:</strong></p>
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0;">
      <pre style="margin: 0; white-space: pre-wrap; font-family: inherit;">${issuesList}</pre>
    </div>

    <p>Please provide an updated COI that meets our insurance requirements.</p>

    ${uploadLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${uploadLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Upload Your COI Now
      </a>
    </div>
    <p style="text-align: center; font-size: 12px; color: #6b7280;">
      Or copy this link: <a href="${uploadLink}" style="color: #10b981;">${uploadLink}</a>
    </p>
    ` : '<p>Please reply to this email with your updated COI attached, or contact us for upload instructions.</p>'}

    <p>If you have any questions about our requirements or have already submitted an updated certificate, please let us know.</p>

    <p style="margin-bottom: 0;">Thank you for your prompt attention,<br><strong>${companyName}</strong></p>
  </div>

  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">This is an automated reminder from SmartCOI</p>
    <p style="margin: 5px 0 0 0; font-size: 11px;">To stop receiving these reminders, please contact ${companyName}</p>
  </div>
</body>
</html>`;

  const textContent = `Hello,

This is an automated reminder regarding the Certificate of Insurance (COI) on file for ${vendorName}.

Status: ${vendorStatus.toUpperCase().replace('-', ' ')}

Action needed:
${issuesList}

Please provide an updated COI that meets our insurance requirements.

${uploadLink ? `Upload your COI here: ${uploadLink}` : 'Please reply to this email with your updated COI attached, or contact us for upload instructions.'}

If you have any questions about our requirements or have already submitted an updated certificate, please let us know.

Thank you for your prompt attention,
${companyName}

---
This is an automated reminder from SmartCOI
To stop receiving these reminders, please contact ${companyName}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to send email' };
    }

    return { success: true, emailId: result.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
