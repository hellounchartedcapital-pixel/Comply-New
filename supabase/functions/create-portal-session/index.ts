import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

// Helper function to make Stripe API calls using fetch
async function stripeRequest(endpoint: string, method: string, body?: any) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe API error');
  }
  return data;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      throw new Error('No subscription found. Please subscribe to a plan first.');
    }

    const origin = req.headers.get('origin') || 'https://your-app.com';

    // Create portal session using fetch
    const session = await stripeRequest('/billing_portal/sessions', 'POST', {
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Portal session error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create portal session'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
