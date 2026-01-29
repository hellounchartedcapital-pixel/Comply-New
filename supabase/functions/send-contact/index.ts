// send-contact/index.ts
// Edge function to handle contact form submissions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const CONTACT_EMAIL = 'contact@smartcoi.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name, email, and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SmartCOI Contact <noreply@smartcoi.io>',
        to: CONTACT_EMAIL,
        reply_to: email,
        subject: `Contact Form: ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">From</p>
                <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">${name}</p>
              </div>
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Email</p>
                <p style="margin: 0; font-size: 16px; color: #111827;">
                  <a href="mailto:${email}" style="color: #059669; text-decoration: none;">${email}</a>
                </p>
              </div>
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Message</p>
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <p style="margin: 0; font-size: 14px; color: #374151; white-space: pre-wrap;">${message}</p>
                </div>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                This message was sent via the SmartCOI contact form
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      throw new Error(errorData.message || 'Failed to send email');
    }

    const result = await response.json();
    console.log('Contact email sent:', result.id);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send contact error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
