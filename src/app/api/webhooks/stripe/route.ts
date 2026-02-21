import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, planForPriceId } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';

// Stripe sends the raw body — Next.js needs to NOT parse it as JSON.
// We read it as text and verify the signature manually.

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      // ------------------------------------------------------------------
      // Checkout completed — new subscription created
      // ------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Look up the org by stripe_customer_id (include fields for idempotency check)
        const { data: org } = await supabase
          .from('organizations')
          .select('id, plan, stripe_subscription_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!org) {
          console.error('[Stripe Webhook] No org found for customer:', customerId);
          break;
        }

        // Fetch the subscription to get the price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? planForPriceId(priceId) : null;

        // Idempotency: skip if already applied
        if (org.stripe_subscription_id === subscriptionId && org.plan === (plan ?? 'starter')) {
          console.log(`[Stripe Webhook] checkout.session.completed — org ${org.id} already up to date, skipping`);
          break;
        }

        await supabase
          .from('organizations')
          .update({
            plan: plan ?? 'starter',
            stripe_subscription_id: subscriptionId,
            trial_ends_at: null,
            payment_failed: false,
          })
          .eq('id', org.id);

        console.log(`[Stripe Webhook] checkout.session.completed — org ${org.id} → plan ${plan}`);
        break;
      }

      // ------------------------------------------------------------------
      // Subscription updated — plan change (upgrade/downgrade)
      // ------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? planForPriceId(priceId) : null;

        if (!plan) break;

        const { data: org } = await supabase
          .from('organizations')
          .select('id, plan, stripe_subscription_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!org) break;

        // Idempotency: skip if already applied
        if (org.plan === plan && org.stripe_subscription_id === subscription.id) {
          console.log(`[Stripe Webhook] subscription.updated — org ${org.id} already on plan ${plan}, skipping`);
          break;
        }

        await supabase
          .from('organizations')
          .update({
            plan,
            stripe_subscription_id: subscription.id,
          })
          .eq('id', org.id);

        console.log(`[Stripe Webhook] subscription.updated — org ${org.id} → plan ${plan}`);
        break;
      }

      // ------------------------------------------------------------------
      // Subscription deleted — canceled
      // ------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id, plan')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!org) break;

        // Idempotency: skip if already canceled
        if (org.plan === 'canceled') {
          console.log(`[Stripe Webhook] subscription.deleted — org ${org.id} already canceled, skipping`);
          break;
        }

        await supabase
          .from('organizations')
          .update({
            plan: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('id', org.id);

        console.log(`[Stripe Webhook] subscription.deleted — org ${org.id} → canceled`);
        break;
      }

      // ------------------------------------------------------------------
      // Invoice payment failed
      // ------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id, payment_failed')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!org) break;

        // Idempotency: skip if already flagged
        if (org.payment_failed) {
          console.log(`[Stripe Webhook] invoice.payment_failed — org ${org.id} already flagged, skipping`);
          break;
        }

        await supabase
          .from('organizations')
          .update({ payment_failed: true })
          .eq('id', org.id);

        console.log(`[Stripe Webhook] invoice.payment_failed — org ${org.id}`);
        break;
      }

      // ------------------------------------------------------------------
      // Invoice payment succeeded — clear payment_failed flag
      // ------------------------------------------------------------------
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: org } = await supabase
          .from('organizations')
          .select('id, payment_failed')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!org) break;

        if (org.payment_failed) {
          await supabase
            .from('organizations')
            .update({ payment_failed: false })
            .eq('id', org.id);
          console.log(`[Stripe Webhook] invoice.payment_succeeded — cleared payment_failed for org ${org.id}`);
        }
        break;
      }

      default:
        // Unhandled event — that's fine, just acknowledge it
        break;
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    // Still return 200 so Stripe doesn't retry
  }

  return NextResponse.json({ received: true });
}
