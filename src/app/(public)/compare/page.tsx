import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Compare COI Tracking Software — SmartCOI vs Competitors',
  description:
    'Compare SmartCOI with other COI tracking solutions. Honest, side-by-side comparisons to help you choose the right tool for your property management needs.',
  alternates: {
    canonical: '/compare',
  },
  openGraph: {
    title: 'Compare COI Tracking Software — SmartCOI vs Competitors',
    description:
      'Compare SmartCOI with other COI tracking solutions. Honest, side-by-side comparisons to help you choose the right tool for your property management needs.',
    type: 'website',
    url: 'https://smartcoi.io/compare',
  },
};

const comparisons = [
  {
    href: '/compare/smartcoi-vs-jones',
    title: 'SmartCOI vs Jones',
    desc: 'Compare SmartCOI\'s instant AI extraction and self-serve setup with Jones\'s enterprise integrations and managed service approach.',
    badge: 'Enterprise Alternative',
  },
  {
    href: '/compare/smartcoi-vs-bcs',
    title: 'SmartCOI vs BCS',
    desc: 'Compare SmartCOI\'s AI-powered extraction with BCS\'s OCR technology and full-service human review option.',
    badge: 'Full-Service Alternative',
  },
  {
    href: '/compare/smartcoi-vs-spreadsheets',
    title: 'Software vs Spreadsheets',
    desc: 'Why dedicated COI tracking software is worth the switch from manual spreadsheet tracking — with real time and cost analysis.',
    badge: 'Most Popular',
  },
];

export default function ComparePage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            Compare Solutions
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Compare COI Tracking Software
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Choosing the right COI tracking solution matters. We believe in honest comparisons —
            every tool has strengths and trade-offs. Here&apos;s how SmartCOI stacks up.
          </p>
        </section>

        {/* Comparison Cards */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <div className="grid gap-8">
            {comparisons.map((comp) => (
              <Link
                key={comp.href}
                href={comp.href}
                className="group rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-lg hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block rounded-full bg-[#73E2A7]/10 px-3 py-1 text-xs font-semibold text-[#4CC78A]">
                      {comp.badge}
                    </span>
                    <h2 className="mt-3 text-xl font-bold text-slate-950 group-hover:text-[#4CC78A] transition-colors">
                      {comp.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {comp.desc}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-4">
                    <svg className="h-5 w-5 text-slate-400 group-hover:text-[#4CC78A] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12,5 19,12 12,19" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Why Compare */}
        <section className="mx-auto mt-20 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            What to Look for in COI Tracking Software
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              When evaluating COI tracking solutions, consider these factors:
            </p>
            <p>
              <strong className="text-slate-950">Data extraction method.</strong> How does the
              software get data out of certificate PDFs? Manual entry, OCR, or AI? This determines
              both the speed and accuracy of your workflow.
            </p>
            <p>
              <strong className="text-slate-950">Time to value.</strong> Can you sign up and start
              using the software today, or do you need a sales call, implementation period, and
              training? For mid-market firms, self-serve setup is a major advantage.
            </p>
            <p>
              <strong className="text-slate-950">Pricing transparency.</strong> Is pricing published
              on the website, or do you need to &quot;request a demo&quot; to learn what it costs?
              Transparent pricing respects your time.
            </p>
            <p>
              <strong className="text-slate-950">Vendor experience.</strong> Does the software
              include a self-service portal where vendors can upload certificates directly? This
              dramatically reduces administrative overhead.
            </p>
            <p>
              <strong className="text-slate-950">Integration needs.</strong> Do you need deep
              integration with property management software like Yardi, MRI, or AppFolio? Or is
              a standalone solution sufficient?
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              See SmartCOI for Yourself
            </h2>
            <p className="mt-4 text-slate-400">
              The best way to compare is to try it. Start a free 14-day trial —
              no credit card, no sales call required.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center rounded-xl bg-[#73E2A7] px-8 text-sm font-bold text-slate-950 shadow-lg shadow-[#73E2A7]/20 transition-all hover:bg-[#4CC78A]"
            >
              Start Your Free Trial
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
