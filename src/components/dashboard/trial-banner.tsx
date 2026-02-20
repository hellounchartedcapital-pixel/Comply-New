'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Clock, AlertTriangle, CreditCard } from 'lucide-react';

const DISMISSED_KEY = 'smartcoi-trial-banner-dismissed';

interface TrialBannerProps {
  plan: string;
  trialEndsAt: string | null;
  paymentFailed?: boolean;
}

export function TrialBanner({ plan, trialEndsAt, paymentFailed }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Hydrate dismissed state from sessionStorage
  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY) === 'true') {
      setDismissed(true);
    }
  }, []);

  // Payment failed banner — NOT dismissible, takes priority
  if (paymentFailed) {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
        <CreditCard className="h-4 w-4 flex-shrink-0 text-red-600" />
        <span className="font-medium">
          Your last payment failed. Please update your payment method to avoid service interruption.
        </span>
        <Link
          href="/dashboard/settings/billing"
          className="ml-2 inline-flex items-center rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          Update Payment Method
        </Link>
      </div>
    );
  }

  // Don't show for non-trial plans
  if (plan !== 'trial') return null;

  // Debug: log the raw values so we can verify in the browser console
  // eslint-disable-next-line no-console
  console.log('[TrialBanner] plan:', plan, 'trialEndsAt:', trialEndsAt);

  const now = new Date();
  const expiresAt = trialEndsAt ? new Date(trialEndsAt) : null;
  // Treat null trial_ends_at as expired — legacy accounts without an end date
  const isExpired = expiresAt ? now >= expiresAt : true;

  // Calculate days remaining
  let daysRemaining: number | null = null;
  let daysText = '';
  if (expiresAt && !isExpired) {
    const msRemaining = expiresAt.getTime() - now.getTime();
    daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    if (daysRemaining < 1) {
      daysText = 'less than 1 day remaining';
    } else if (daysRemaining === 1) {
      daysText = '1 day remaining';
    } else {
      daysText = `${daysRemaining} days remaining`;
    }
  }

  const isUrgent = daysRemaining !== null && daysRemaining <= 3;

  // Expired or null trial_ends_at banner — NOT dismissible
  if (isExpired) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
        <span className="font-medium">
          Your free trial has expired. Upgrade to continue using SmartCOI.
        </span>
        <Link
          href="/dashboard/settings/billing"
          className="ml-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  // Active trial — dismissible
  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, 'true');
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 border-b px-4 py-2 text-sm ${
        isUrgent
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-indigo-200 bg-indigo-50 text-indigo-700'
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
      ) : (
        <Clock className="h-4 w-4 flex-shrink-0 text-indigo-500" />
      )}
      <span>
        You&apos;re on a free trial
        {daysText ? <> &mdash; <span className="font-semibold">{daysText}</span></> : null}
      </span>
      <Link
        href="/dashboard/settings/billing"
        className={`ml-2 inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold text-white transition-colors ${
          isUrgent
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        Upgrade
      </Link>
      <button
        onClick={handleDismiss}
        className={`ml-1 rounded p-0.5 transition-colors ${
          isUrgent
            ? 'text-amber-400 hover:bg-amber-100 hover:text-amber-600'
            : 'text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600'
        }`}
        aria-label="Dismiss trial banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
