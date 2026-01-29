import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price IDs from Stripe Dashboard - you'll need to create these products/prices in Stripe
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

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  starter: 25,
  professional: 100,
  enterprise: 500,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

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
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/dashboard?checkout=success`,
      cancel_url: `${req.headers.get('origin')}/pricing?checkout=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: plan,
        },
      },
      allow_promotion_codes: true,
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
