import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

// Price IDs from Stripe Dashboard
const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  starter: {
    monthly: Deno.env.get('STRIPE_STARTER_MONTHLY_PRICE_ID') || '',
    annual: Deno.env.get('STRIPE_STARTER_ANNUAL_PRICE_ID') || '',
  },
  professional: {
    monthly: Deno.env.get('STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID') || '',
    annual: Deno.env.get('STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID') || '',
  },
  enterprise: {
    monthly: Deno.env.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID') || '',
    annual: Deno.env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID') || '',
  },
};

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

    const { plan, billingPeriod = 'monthly' } = await req.json();

    if (!plan || !PRICE_IDS[plan]) {
      throw new Error('Invalid plan selected');
    }

    const priceId = PRICE_IDS[plan][billingPeriod as 'monthly' | 'annual'];
    if (!priceId) {
      throw new Error(`Price ID not configured for ${plan} ${billingPeriod}`);
    }

    // Check if user already has a Stripe customer ID
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    // Create a new Stripe customer if needed
    if (!customerId) {
      const customer = await stripeRequest('/customers', 'POST', {
        email: user.email,
        'metadata[supabase_user_id]': user.id,
      });
      customerId = customer.id;
    }

    const origin = req.headers.get('origin') || 'https://your-app.com';

    // Create checkout session with 14-day free trial
    const session = await stripeRequest('/checkout/sessions', 'POST', {
      customer: customerId,
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][plan]': plan,
      'subscription_data[trial_period_days]': '14',
      allow_promotion_codes: 'true',
      billing_address_collection: 'required',
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create checkout session'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
