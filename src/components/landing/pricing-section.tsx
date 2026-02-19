'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimateIn } from '@/components/landing/animate-in';

/* ─── Icons (inline to keep the component self-contained) ─── */

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

/* ─── Types ─── */

type BillingInterval = 'monthly' | 'annual';

/* ─── Component ─── */

export function PricingSection() {
  const [interval, setInterval] = useState<BillingInterval>('annual');
  const isAnnual = interval === 'annual';

  const starterPrice = isAnnual ? 79 : 99;
  const proPrice = isAnnual ? 199 : 249;

  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-t border-slate-100 bg-slate-50/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <AnimateIn>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#73E2A7]">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Start small and scale as your portfolio grows. Every plan includes a 14-day
              free trial.
            </p>
          </div>
        </AnimateIn>

        {/* Monthly / Annual toggle */}
        <AnimateIn delay={50}>
          <div className="mt-10 flex items-center justify-center gap-3">
            <span
              className={`text-sm font-medium transition-colors duration-200 ${
                !isAnnual ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              Monthly
            </span>

            <button
              onClick={() =>
                setInterval((i) => (i === 'monthly' ? 'annual' : 'monthly'))
              }
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
              className={`text-sm font-medium transition-colors duration-200 ${
                isAnnual ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              Annual
            </span>

            {isAnnual && (
              <span className="ml-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 animate-in fade-in duration-300">
                Save 20%
              </span>
            )}
          </div>
        </AnimateIn>

        {/* Plan cards */}
        <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-3">
          {/* ── Starter ── */}
          <AnimateIn delay={100}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Starter
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span
                  key={starterPrice}
                  className="text-5xl font-black tracking-tight text-slate-950 transition-all duration-300"
                >
                  ${starterPrice}
                </span>
                <span className="text-lg text-slate-500">/mo</span>
              </div>
              {isAnnual && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500">billed annually</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Save $238/year
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm text-slate-500">
                For firms getting started with compliance automation
              </p>

              <ul className="mt-8 flex-1 space-y-4">
                {[
                  'Unlimited properties',
                  'Up to 50 vendors & tenants',
                  '50 COI extractions per month',
                  'AI-powered compliance checking',
                  'Custom requirement templates',
                  'Automated expiration notifications',
                  'Self-service vendor upload portal',
                  'Compliance dashboard',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-slate-600"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CC78A]" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="mt-8 flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Start Free Trial
              </Link>
            </div>
          </AnimateIn>

          {/* ── Professional — Most Popular ── */}
          <AnimateIn delay={200}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-emerald-400 bg-white p-8 shadow-xl shadow-emerald-500/10 lg:-mt-4 lg:mb-[-1rem]">
              <div className="absolute top-0 right-0 rounded-bl-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white">
                Most Popular
              </div>

              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Professional
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span
                  key={proPrice}
                  className="text-5xl font-black tracking-tight text-slate-950 transition-all duration-300"
                >
                  ${proPrice}
                </span>
                <span className="text-lg text-slate-500">/mo</span>
              </div>
              {isAnnual && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500">billed annually</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Save $598/year
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm text-slate-500">
                For growing portfolios that need more capacity
              </p>

              <ul className="mt-8 flex-1 space-y-4">
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CC78A]" />
                  Everything in Starter, plus:
                </li>
                {[
                  { label: 'Up to 250 vendors & tenants', comingSoon: false },
                  { label: '200 COI extractions per month', comingSoon: false },
                  { label: 'Priority email support', comingSoon: false },
                  { label: 'Compliance reports & exports', comingSoon: true },
                  { label: 'Team members & roles', comingSoon: true },
                ].map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start gap-3 text-sm text-slate-600"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CC78A]" />
                    <span>
                      {item.label}
                      {item.comingSoon && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          Coming Soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30"
              >
                Start Free Trial
              </Link>
            </div>
          </AnimateIn>

          {/* ── Enterprise ── */}
          <AnimateIn delay={300}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Enterprise
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tight text-slate-950">
                  Let&apos;s Talk
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                For large portfolios with complex requirements
              </p>

              <ul className="mt-8 flex-1 space-y-4">
                <li className="flex items-start gap-3 text-sm text-slate-600">
                  <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CC78A]" />
                  Everything in Professional, plus:
                </li>
                {[
                  'Unlimited vendors & tenants',
                  'Unlimited COI extractions',
                  'Dedicated onboarding & training',
                  'Custom integrations (Yardi, MRI, AppFolio)',
                  'SLA & uptime guarantees',
                  'Dedicated account manager',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-slate-600"
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CC78A]" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="mailto:sales@smartcoi.io"
                className="mt-8 flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Contact Sales
              </Link>
            </div>
          </AnimateIn>
        </div>

        {/* Footer notes */}
        <div className="mt-10 space-y-2 text-center">
          <AnimateIn delay={400}>
            <p className="text-sm text-slate-500">
              All plans include a 14-day free trial. No credit card required.
            </p>
          </AnimateIn>
          <AnimateIn delay={450}>
            <p className="text-sm text-slate-400">
              Need help choosing?{' '}
              <a
                href="mailto:sales@smartcoi.io"
                className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
              >
                Email us at sales@smartcoi.io
              </a>
            </p>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
