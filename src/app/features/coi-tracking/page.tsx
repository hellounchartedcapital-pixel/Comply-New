import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'COI Tracking for Commercial Real Estate | SmartCOI',
  description:
    'Streamline certificate of insurance tracking for your commercial properties. Upload COIs, get instant AI-powered compliance checks, and track status across your portfolio.',
  alternates: {
    canonical: 'https://smartcoi.io/features/coi-tracking',
  },
  openGraph: {
    title: 'COI Tracking Software for Commercial Real Estate | SmartCOI',
    description:
      'Streamline certificate of insurance tracking for your commercial properties. Upload COIs, get instant AI-powered compliance checks, and track status across your portfolio.',
    type: 'website',
    url: 'https://smartcoi.io/features/coi-tracking',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How long does it take to extract data from a COI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "SmartCOI's AI typically extracts all data from a certificate PDF in under 30 seconds. This includes coverage types, policy limits, dates, carriers, and named entities.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I track both vendor and tenant COIs in SmartCOI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. SmartCOI tracks vendors and tenants in a unified system. Each has their own insurance requirements, compliance status, certificate history, and notification settings.',
      },
    },
    {
      '@type': 'Question',
      name: 'What types of insurance certificates does SmartCOI support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "SmartCOI supports ACORD 25 (Certificate of Liability Insurance) and handles all standard coverage types including general liability, automobile liability, workers' compensation, umbrella/excess liability, professional liability, and specialty coverages.",
      },
    },
    {
      '@type': 'Question',
      name: 'Do vendors need an account to upload certificates?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Each vendor receives a unique upload link to a self-service portal. They can see what coverage is required and upload their certificate directly — no account creation needed.',
      },
    },
  ],
};

export default function COITrackingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            COI Tracking
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Certificate of Insurance Tracking That Actually Works
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Stop drowning in spreadsheets and email attachments. SmartCOI gives you a single
            source of truth for every certificate of insurance across your entire portfolio.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-xl bg-slate-950 px-8 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:bg-slate-800"
            >
              Start Free Trial
            </Link>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto mt-20 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            The Problem with Manual COI Tracking
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              If you manage commercial properties, you know the pain. Every vendor, contractor,
              and tenant needs to carry adequate insurance — and proving it falls on you. That means
              collecting certificates of insurance from dozens (or hundreds) of parties, reading each
              one line by line, cross-referencing coverage limits against your requirements, and somehow
              keeping track of when everything expires.
            </p>
            <p>
              Most property management teams do this with spreadsheets, shared drives, and a lot of
              manual effort. Certificates come in as email attachments. Someone has to open each PDF,
              squint at the coverage table, manually type numbers into a spreadsheet, and hope they
              didn&apos;t miss anything. When a certificate expires, it&apos;s often weeks before
              anyone notices — leaving the property exposed.
            </p>
            <p>
              This approach doesn&apos;t scale. As your portfolio grows, the administrative burden
              grows exponentially. And the stakes are high: a single lapse in vendor insurance
              coverage can expose your organization to millions in liability.
            </p>
          </div>
        </section>

        {/* Solution */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            How SmartCOI Solves It
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              SmartCOI replaces the spreadsheet with an intelligent, automated system built
              specifically for commercial real estate. Upload a certificate PDF and our AI reads
              the entire document in seconds — extracting every coverage type, policy limit,
              carrier name, effective date, and expiration date with high accuracy.
            </p>
            <p>
              The extracted data is automatically compared against your property&apos;s insurance
              requirements. You see instantly whether a vendor&apos;s coverage meets your minimum
              limits, whether the right entities are listed as additional insured, and whether
              any policies are about to expire. No more manual comparison. No more missed gaps.
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Benefits for Your Team
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {[
              {
                title: 'Save Hours Every Week',
                desc: 'What used to take your team hours of manual review now takes seconds. Upload a COI and get instant results.',
              },
              {
                title: 'Never Miss a Gap',
                desc: 'AI-powered compliance checking catches every coverage gap, limit shortfall, and missing additional insured — so nothing slips through.',
              },
              {
                title: 'Complete Audit Trail',
                desc: 'Every upload, review, and status change is logged. When auditors come calling, your records are ready.',
              },
              {
                title: 'Portfolio-Wide Visibility',
                desc: 'See compliance health across every property at a glance. Know who\'s compliant, who\'s expiring, and who needs attention.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                q: 'How long does it take to extract data from a COI?',
                a: 'SmartCOI\'s AI typically extracts all data from a certificate PDF in under 30 seconds. This includes coverage types, policy limits, dates, carriers, and named entities.',
              },
              {
                q: 'Can I track both vendor and tenant COIs in SmartCOI?',
                a: 'Yes. SmartCOI tracks vendors and tenants in a unified system. Each has their own insurance requirements, compliance status, certificate history, and notification settings.',
              },
              {
                q: 'What types of insurance certificates does SmartCOI support?',
                a: 'SmartCOI supports ACORD 25 (Certificate of Liability Insurance) and handles all standard coverage types including general liability, automobile liability, workers\' compensation, umbrella/excess liability, professional liability, and specialty coverages.',
              },
              {
                q: 'Do vendors need an account to upload certificates?',
                a: 'No. Each vendor receives a unique upload link to a self-service portal. They can see what coverage is required and upload their certificate directly — no account creation needed.',
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-950">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Content */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-xl font-bold text-slate-950">Related</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/features/compliance-automation" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Automated Compliance Checking
            </Link>
            <Link href="/features/vendor-management" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Vendor Management
            </Link>
            <Link href="/blog/coi-compliance-guide-property-managers" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              The Complete Guide to COI Compliance for Property Managers
            </Link>
            <Link href="/blog/acord-25-certificate-explained" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              ACORD 25 Certificate of Insurance: A Property Manager&apos;s Guide
            </Link>
            <Link href="/coi-tracking-software" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              COI Tracking Software Overview
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Automate Your COI Tracking?
            </h2>
            <p className="mt-4 text-slate-400">
              Join property management teams who&apos;ve eliminated manual certificate tracking with SmartCOI.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center rounded-xl bg-[#73E2A7] px-8 text-sm font-bold text-slate-950 shadow-lg shadow-[#73E2A7]/20 transition-all hover:bg-[#4CC78A]"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
