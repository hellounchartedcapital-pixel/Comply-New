'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Clock, AlertTriangle } from 'lucide-react';

const DISMISSED_KEY = 'smartcoi-trial-banner-dismissed';

interface TrialBannerProps {
  plan: string;
  trialEndsAt: string | null;
}

export function TrialBanner({ plan, trialEndsAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Hydrate dismissed state from sessionStorage
  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY) === 'true') {
      setDismissed(true);
    }
  }, []);

  // Don't show for non-trial plans
  if (plan !== 'trial') return null;

  const now = new Date();
  const expiresAt = trialEndsAt ? new Date(trialEndsAt) : null;
  const isExpired = expiresAt ? now >= expiresAt : false;

  // Calculate days remaining
  let daysText = '';
  if (expiresAt && !isExpired) {
    const msRemaining = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    if (daysRemaining < 1) {
      daysText = 'less than 1 day remaining';
    } else if (daysRemaining === 1) {
      daysText = '1 day remaining';
    } else {
      daysText = `${daysRemaining} days remaining`;
    }
  }

  // Expired banner — NOT dismissible
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
    <div className="flex items-center justify-center gap-2 bg-indigo-50 border-b border-indigo-200 px-4 py-2 text-sm text-indigo-700">
      <Clock className="h-4 w-4 flex-shrink-0 text-indigo-500" />
      <span>
        You&apos;re on a free trial &mdash; {daysText}
      </span>
      <button
        onClick={handleDismiss}
        className="ml-2 rounded p-0.5 text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
        aria-label="Dismiss trial banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
