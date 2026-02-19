import Stripe from 'stripe';

// Re-export price constants so server code can import everything from here
export { PRICE_IDS, planForPriceId } from './stripe-prices';
export type { PriceId } from './stripe-prices';

// ---------------------------------------------------------------------------
// Stripe client — lazily initialized so importing this module doesn't throw
// when STRIPE_SECRET_KEY isn't set yet (e.g. during build or in client code).
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** Proxy so existing `stripe.xxx()` calls work without changing call sites. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
