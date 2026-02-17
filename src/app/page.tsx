import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { HeroDashboard } from '@/components/landing/hero-dashboard';
import { AnimateIn } from '@/components/landing/animate-in';
import { ScrollLink } from '@/components/landing/scroll-link';

export const metadata: Metadata = {
  title: 'SmartCOI — AI-Powered COI Compliance Tracking for Property Managers',
  description:
    'Automate certificate of insurance tracking for your commercial properties. AI-powered compliance checking, automated follow-ups, and portfolio-wide visibility.',
  openGraph: {
    title: 'SmartCOI — AI-Powered COI Compliance Tracking for Property Managers',
    description:
      'Automate certificate of insurance tracking for your commercial properties. AI-powered compliance checking, automated follow-ups, and portfolio-wide visibility.',
    type: 'website',
    url: 'https://smartcoi.com',
  },
};

/* ────────────────────────────────────────────────────
   Icons — inline SVGs for zero-dependency icons
   ──────────────────────────────────────────────────── */

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,4 12,13 2,4" />
    </svg>
  );
}

function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9,12 11,14 15,10" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function IconBarChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16,16 12,12 8,16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );
}

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main>
        {/* ───────── 1. Hero ───────── */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
          {/* Background accents */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-48 right-0 h-[600px] w-[600px] rounded-full bg-[#73E2A7]/10 blur-3xl" />
            <div className="absolute top-40 -left-32 h-[400px] w-[400px] rounded-full bg-[#73E2A7]/5 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <AnimateIn>
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Certificate of Insurance Compliance on{' '}
                  <span className="text-gradient-primary">Autopilot</span>
                </h1>
              </AnimateIn>

              <AnimateIn delay={100}>
                <p className="mt-6 text-lg leading-relaxed text-slate-500 sm:text-xl">
                  Stop manually checking COIs. SmartCOI uses AI to extract, verify, and
                  track insurance compliance across your entire portfolio — so you can
                  focus on managing properties, not paperwork.
                </p>
              </AnimateIn>

              <AnimateIn delay={200}>
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center rounded-xl bg-slate-950 px-8 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/25"
                  >
                    Start Free
                    <IconArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <ScrollLink
                    href="#how-it-works"
                    className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    See How It Works
                  </ScrollLink>
                </div>
              </AnimateIn>
            </div>

            {/* Hero dashboard visual */}
            <AnimateIn delay={350} className="mt-16 sm:mt-20">
              <HeroDashboard />
            </AnimateIn>
          </div>
        </section>

        {/* ───────── 2. Social Proof ───────── */}
        <section className="border-y border-slate-100 bg-slate-50/50 py-12">
          <div className="mx-auto max-w-7xl px-6">
            <AnimateIn>
              <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-slate-400">
                Trusted by property management teams nationwide
              </p>
            </AnimateIn>
            <AnimateIn delay={100}>
              <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                {['Meridian', 'Apex PM', 'CrestPoint', 'OakBridge', 'PinnacleRE', 'TrueNorth'].map(
                  (name, i) => (
                    <div
                      key={name}
                      className="flex h-8 items-center text-lg font-bold tracking-tight text-slate-300"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {name}
                    </div>
                  )
                )}
              </div>
            </AnimateIn>
          </div>
        </section>

        {/* ───────── 3. Pain Points ───────── */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <AnimateIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  COI Tracking Shouldn&apos;t Be This Painful
                </h2>
              </div>
            </AnimateIn>

            <div className="mt-14 grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: <IconSearch className="h-6 w-6" />,
                  title: 'Manual Verification',
                  desc: 'Reading through every COI line by line, comparing against requirements, hoping you don\u2019t miss a gap.',
                },
                {
                  icon: <IconMail className="h-6 w-6" />,
                  title: 'Endless Follow-Ups',
                  desc: 'Chasing vendors and tenants for updated certificates. Again. And again. And again.',
                },
                {
                  icon: <IconEyeOff className="h-6 w-6" />,
                  title: 'Zero Visibility',
                  desc: 'When leadership asks about compliance across the portfolio, you scramble to pull an answer together.',
                },
              ].map((item, i) => (
                <AnimateIn key={item.title} delay={i * 120}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-lg">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
                      {item.icon}
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-2 leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── 4. Features ───────── */}
        <section id="features" className="scroll-mt-20 bg-slate-950 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <AnimateIn>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#73E2A7]">
                  Features
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Everything You Need to Stay Compliant
                </h2>
              </div>
            </AnimateIn>

            <div className="mt-16 grid gap-12 lg:grid-cols-3">
              {[
                {
                  icon: <IconShield className="h-7 w-7" />,
                  title: 'AI-Powered Compliance Checking',
                  desc: 'Upload a COI and get instant compliance results. Our AI extracts every coverage, compares against your requirements, and flags gaps in plain language — not insurance jargon.',
                  visual: (
                    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        <div className="h-2 w-2 rounded-full bg-[#73E2A7]" />
                        Compliance check complete
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">General Liability</span>
                          <span className="font-semibold text-[#73E2A7]">Met</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">Auto Liability</span>
                          <span className="font-semibold text-[#73E2A7]">Met</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">Workers&apos; Comp</span>
                          <span className="font-semibold text-red-400">Gap — below minimum</span>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  icon: <IconBell className="h-7 w-7" />,
                  title: 'Automated Follow-Ups',
                  desc: 'Set it and forget it. SmartCOI tracks expiration dates and automatically notifies vendors and tenants when certificates need updating. They upload through a self-service portal — no more email chains.',
                  visual: (
                    <div className="mt-6 space-y-3">
                      {['30 days before', '14 days before', '7 days before'].map((label, j) => (
                        <div
                          key={label}
                          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
                        >
                          <div
                            className={`h-2 w-2 rounded-full ${j === 0 ? 'bg-amber-400' : j === 1 ? 'bg-orange-400' : 'bg-red-400'}`}
                          />
                          <span className="text-slate-300">{label} expiry</span>
                          <span className="ml-auto text-xs text-slate-500">Auto-sent</span>
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  icon: <IconBarChart className="h-7 w-7" />,
                  title: 'Portfolio Visibility',
                  desc: 'See compliance health across every property at a glance. Know exactly who\u2019s compliant, who\u2019s expiring, and who needs attention — before your boss asks.',
                  visual: (
                    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-end gap-1">
                        {[70, 85, 60, 92, 78, 95, 88].map((h, j) => (
                          <div key={j} className="flex-1">
                            <div
                              className="rounded-t bg-gradient-to-t from-[#4CC78A] to-[#73E2A7]"
                              style={{ height: `${h * 0.6}px` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-slate-500">
                        <span>Mon</span>
                        <span>Sun</span>
                      </div>
                    </div>
                  ),
                },
              ].map((feat, i) => (
                <AnimateIn key={feat.title} delay={i * 140}>
                  <div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#73E2A7]/10 text-[#73E2A7]">
                      {feat.icon}
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-white">{feat.title}</h3>
                    <p className="mt-2 leading-relaxed text-slate-400">{feat.desc}</p>
                    {feat.visual}
                  </div>
                </AnimateIn>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── 5. How It Works ───────── */}
        <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <AnimateIn>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#73E2A7]">
                  How It Works
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Up and Running in Minutes
                </h2>
              </div>
            </AnimateIn>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: '01',
                  icon: <IconClipboard className="h-6 w-6" />,
                  title: 'Set Your Requirements',
                  desc: 'Choose from industry-standard templates or customize your own coverage requirements.',
                },
                {
                  step: '02',
                  icon: <IconUpload className="h-6 w-6" />,
                  title: 'Upload a COI',
                  desc: 'Drag and drop a certificate PDF. Our AI handles the rest.',
                },
                {
                  step: '03',
                  icon: <IconCheckCircle className="h-6 w-6" />,
                  title: 'Review & Confirm',
                  desc: 'See extracted data side-by-side with requirements. Approve with one click.',
                },
                {
                  step: '04',
                  icon: <IconZap className="h-6 w-6" />,
                  title: 'Automate',
                  desc: 'SmartCOI tracks expirations and follows up automatically. You focus on what matters.',
                },
              ].map((item, i) => (
                <AnimateIn key={item.step} delay={i * 120}>
                  <div className="relative rounded-2xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-lg">
                    <span className="text-5xl font-black text-slate-100">{item.step}</span>
                    <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#73E2A7]/10 text-[#4CC78A]">
                      {item.icon}
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-2 leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── 6. Pricing ───────── */}
        <section id="pricing" className="scroll-mt-20 border-t border-slate-100 bg-slate-50/50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <AnimateIn>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#73E2A7]">
                  Pricing
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Simple, Transparent Pricing
                </h2>
                <p className="mt-4 text-lg text-slate-500">
                  One plan. Everything included. Scale as you grow.
                </p>
              </div>
            </AnimateIn>

            <AnimateIn delay={150}>
              <div className="mx-auto mt-12 max-w-md">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                  {/* Gradient top accent */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#73E2A7] to-[#4CC78A]" />

                  <div className="p-8 sm:p-10">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                      Pro
                    </p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tight text-slate-950">$29</span>
                      <span className="text-lg text-slate-500">/month per property</span>
                    </div>

                    <ul className="mt-8 space-y-4">
                      {[
                        'Unlimited vendors & tenants',
                        'AI compliance checking',
                        'Automated follow-ups & reminders',
                        'Portfolio compliance dashboard',
                        'Self-service upload portal',
                        'Email notifications',
                        'Priority support',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                          <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4CC78A]" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/signup"
                      className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:bg-slate-800"
                    >
                      Get Started
                    </Link>

                    <p className="mt-4 text-center text-xs text-slate-400">
                      Free 14-day trial — no credit card required
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </section>

        {/* ───────── 7. Final CTA ───────── */}
        <section className="relative overflow-hidden bg-slate-950 py-20 sm:py-28">
          {/* Green glow accent */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#73E2A7]/8 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-6">
            <AnimateIn>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Stop Chasing Certificates.
                  <br />
                  <span className="text-[#73E2A7]">Start Managing Compliance.</span>
                </h2>
                <p className="mt-6 text-lg text-slate-400">
                  Join property management teams who&apos;ve automated their COI workflows with SmartCOI.
                </p>
                <Link
                  href="/signup"
                  className="mt-10 inline-flex h-12 items-center rounded-xl bg-[#73E2A7] px-8 text-sm font-bold text-slate-950 shadow-lg shadow-[#73E2A7]/20 transition-all hover:bg-[#4CC78A] hover:shadow-xl hover:shadow-[#73E2A7]/30"
                >
                  Get Started Free
                  <IconArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </AnimateIn>
          </div>
        </section>
      </main>

      {/* ───────── 8. Footer ───────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
            {/* Brand */}
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-icon.svg" alt="" className="h-7 w-7" />
                <span className="text-lg font-bold text-white">SmartCOI</span>
              </div>
              <p className="text-sm text-slate-500">
                AI-powered COI compliance tracking.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
              <a href="#features" className="text-slate-400 transition-colors hover:text-white">
                Features
              </a>
              <a href="#pricing" className="text-slate-400 transition-colors hover:text-white">
                Pricing
              </a>
              <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
                Login
              </Link>
              <Link href="/signup" className="text-slate-400 transition-colors hover:text-white">
                Sign Up
              </Link>
              <a href="#" className="text-slate-400 transition-colors hover:text-white">
                Terms
              </a>
              <a href="#" className="text-slate-400 transition-colors hover:text-white">
                Privacy
              </a>
              <a href="#" className="text-slate-400 transition-colors hover:text-white">
                Contact
              </a>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} SmartCOI. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
