'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  CreditCard,
  AlertTriangle,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { createCheckoutSession, createPortalSession, resetTrial } from '@/lib/actions/billing';
import { PRICE_IDS } from '@/lib/stripe-prices';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BillingClientProps {
  plan: string;
  trialEndsAt: string | null;
  hasSubscription: boolean;
  paymentFailed: boolean;
}

type BillingInterval = 'monthly' | 'annual';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BillingClient({
  plan,
  trialEndsAt,
  hasSubscription,
  paymentFailed,
}: BillingClientProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('annual');

  // Show toasts for success/canceled query params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated!');
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout canceled — no charges were made.');
    }
  }, [searchParams]);

  const isTrialOrCanceled = plan === 'trial' || plan === 'canceled';
  const showPlanCards = isTrialOrCanceled || !hasSubscription;

  const planDisplayName =
    plan === 'trial'
      ? 'Free Trial'
      : plan === 'canceled'
        ? 'Canceled'
        : plan.charAt(0).toUpperCase() + plan.slice(1);

  const trialEndsDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const isTrialExpired = trialEndsAt ? new Date() >= new Date(trialEndsAt) : false;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // ---- Handlers ----

  async function handleSubscribe(priceId: string) {
    setLoading(priceId);
    try {
      const { url } = await createCheckoutSession(priceId);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(null);
    }
  }

  async function handleResetTrial() {
    setLoading('reset');
    try {
      const { trialEndsAt: newTrialEnd } = await resetTrial();
      toast.success(`Trial reset! New end date: ${new Date(newTrialEnd).toLocaleDateString()}`);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset trial');
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setLoading('portal');
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
      setLoading(null);
    }
  }

  // ---- Price map ----

  const starterPriceId =
    interval === 'monthly' ? PRICE_IDS.STARTER_MONTHLY : PRICE_IDS.STARTER_ANNUAL;
  const proPriceId =
    interval === 'monthly'
      ? PRICE_IDS.PROFESSIONAL_MONTHLY
      : PRICE_IDS.PROFESSIONAL_ANNUAL;

  const isAnnual = interval === 'annual';
  const starterPrice = isAnnual ? '$79' : '$99';
  const starterPer = '/mo';
  const starterSavings = isAnnual ? 'Save $238/year' : null;
  const starterBilledLabel = isAnnual ? 'billed annually' : null;
  const proPrice = isAnnual ? '$199' : '$249';
  const proPer = '/mo';
  const proSavings = isAnnual ? 'Save $598/year' : null;
  const proBilledLabel = isAnnual ? 'billed annually' : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Payment failed warning */}
      {paymentFailed && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Your last payment failed. Please update your payment method to avoid service
              interruption.
            </p>
          </div>
          <button
            onClick={handleManageSubscription}
            disabled={loading === 'portal'}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Update Payment Method
          </button>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Current Plan</h2>
            <p className="mt-1 text-lg font-bold text-foreground">{planDisplayName}</p>
            {plan === 'trial' && trialEndsDate && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isTrialExpired ? 'Expired on' : `${trialDaysRemaining} days remaining — ends`}{' '}
                <span className="font-medium text-foreground">{trialEndsDate}</span>
              </p>
            )}
            {plan === 'canceled' && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Your subscription has been canceled. Your data is safe — resubscribe anytime.
              </p>
            )}
          </div>
          {hasSubscription && plan !== 'canceled' && (
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'portal'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {loading === 'portal' ? 'Opening...' : 'Manage Subscription'}
            </button>
          )}
        </div>
      </div>

      {/* Plan cards — shown on trial, canceled, or no subscription */}
      {showPlanCards && (
        <>
          {/* Interval toggle */}
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-sm font-medium transition-colors duration-200 ${!isAnnual ? 'text-slate-900' : 'text-slate-400'}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setInterval((i) => (i === 'monthly' ? 'annual' : 'monthly'))}
              className={`relative inline-flex h-7 w-[52px] flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                isAnnual ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={isAnnual}
              aria-label="Toggle annual billing"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ${
                  isAnnual ? 'translate-x-[27px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors duration-200 ${isAnnual ? 'text-slate-900' : 'text-slate-400'}`}
            >
              Annual
            </span>
            {isAnnual && (
              <span className="ml-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                Save 20%
              </span>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Starter */}
            <PlanCard
              name="Starter"
              price={starterPrice}
              per={starterPer}
              billedLabel={starterBilledLabel}
              savings={starterSavings}
              features={[
                'Unlimited properties',
                'Up to 50 vendors & tenants',
                '50 COI extractions / month',
                'AI compliance checking',
                'Custom requirement templates',
                'Expiration notifications',
                'Vendor upload portal',
                'Compliance dashboard',
              ]}
              isCurrent={plan === 'starter'}
              loading={loading === starterPriceId}
              onSubscribe={() => handleSubscribe(starterPriceId)}
            />

            {/* Professional */}
            <PlanCard
              name="Professional"
              price={proPrice}
              per={proPer}
              billedLabel={proBilledLabel}
              savings={proSavings}
              popular
              features={[
                'Everything in Starter, plus:',
                'Up to 250 vendors & tenants',
                '200 COI extractions / month',
                'Priority email support',
                'Compliance reports (coming soon)',
                'Team members & roles (coming soon)',
              ]}
              isCurrent={plan === 'professional'}
              loading={loading === proPriceId}
              onSubscribe={() => handleSubscribe(proPriceId)}
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Need enterprise? Unlimited everything, custom integrations, dedicated support.{' '}
            <a
              href="mailto:sales@smartcoi.io"
              className="font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
            >
              Contact sales@smartcoi.io
            </a>
          </p>
        </>
      )}

      {/* Debug: Reset Trial (dev only) */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Debug
          </p>
          <p className="mt-1 text-xs text-slate-500">
            plan: <code className="font-mono text-slate-700">{plan}</code>{' '}
            &middot; trial_ends_at:{' '}
            <code className="font-mono text-slate-700">{trialEndsAt ?? 'null'}</code>
          </p>
          <button
            onClick={handleResetTrial}
            disabled={loading === 'reset'}
            className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            {loading === 'reset' ? 'Resetting...' : 'Reset Trial (14 days)'}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

function PlanCard({
  name,
  price,
  per,
  billedLabel,
  savings,
  features,
  popular,
  isCurrent,
  loading,
  onSubscribe,
}: {
  name: string;
  price: string;
  per: string;
  billedLabel?: string | null;
  savings?: string | null;
  features: string[];
  popular?: boolean;
  isCurrent: boolean;
  loading: boolean;
  onSubscribe: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border p-6 ${
        popular
          ? 'border-emerald-400 shadow-lg shadow-emerald-500/10'
          : 'border-slate-200'
      } bg-white`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-white">
          Most Popular
        </span>
      )}

      <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">{name}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tight text-slate-950 transition-all duration-300">{price}</span>
        <span className="text-sm text-slate-500">{per}</span>
      </div>
      {(billedLabel || savings) && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {billedLabel && (
            <span className="text-xs text-slate-500">{billedLabel}</span>
          )}
          {savings && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {savings}
            </span>
          )}
        </div>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-600">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            {feat}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="mt-6 flex h-10 w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700">
          Current Plan
        </div>
      ) : (
        <button
          onClick={onSubscribe}
          disabled={loading}
          className={`mt-6 flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            popular
              ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {loading ? (
            <Sparkles className="h-4 w-4 animate-pulse" />
          ) : (
            'Subscribe'
          )}
        </button>
      )}
    </div>
  );
}
