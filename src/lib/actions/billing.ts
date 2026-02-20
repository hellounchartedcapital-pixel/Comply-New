'use server';

import { stripe, PRICE_IDS } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// createCheckoutSession — starts a new Stripe Checkout for subscriptions
// ---------------------------------------------------------------------------

export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  // Validate price ID
  const validPriceIds = Object.values(PRICE_IDS) as string[];
  if (!validPriceIds.includes(priceId)) {
    throw new Error('Invalid price ID');
  }

  // Get the current user from the session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get org details via service client (bypasses RLS)
  const service = createServiceClient();
  const { data: profile } = await service
    .from('users')
    .select('organization_id, email, full_name')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) throw new Error('No organization found');

  const { data: org } = await service
    .from('organizations')
    .select('id, name, stripe_customer_id, stripe_subscription_id')
    .eq('id', profile.organization_id)
    .single();
  if (!org) throw new Error('Organization not found');

  // If the org already has an active subscription, redirect to the customer portal
  // so they can change plans there instead of creating a new checkout
  if (org.stripe_subscription_id) {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    });
    return { url: portalSession.url };
  }

  // Ensure we have a Stripe customer
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: profile.email,
      metadata: { org_id: org.id },
    });
    customerId = customer.id;

    await service
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id);
  }

  // Create a Checkout Session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_update: { address: 'auto' },
    billing_address_collection: 'required',
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings/billing?success=true`,
    cancel_url: `${appUrl}/dashboard/settings/billing?canceled=true`,
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    metadata: { org_id: org.id },
    subscription_data: {
      metadata: { org_id: org.id },
    },
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { url: session.url };
}

// ---------------------------------------------------------------------------
// createPortalSession — opens Stripe's customer portal for subscription mgmt
// ---------------------------------------------------------------------------

export async function createPortalSession(): Promise<{ url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = createServiceClient();
  const { data: profile } = await service
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) throw new Error('No organization found');

  const { data: org } = await service
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', profile.organization_id)
    .single();
  if (!org?.stripe_customer_id) throw new Error('No billing account found. Please subscribe to a plan first.');

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  });

  return { url: session.url };
}
