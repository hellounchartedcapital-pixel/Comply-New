import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'COI Tracking Software for Property Managers | SmartCOI',
  description:
    'AI-powered COI tracking software built for commercial property managers. Automate certificate collection, compliance checking, and expiration monitoring across your portfolio.',
  alternates: {
    canonical: '/coi-tracking-software',
  },
  openGraph: {
    title: 'COI Tracking Software for Property Managers | SmartCOI',
    description:
      'AI-powered COI tracking software built for commercial property managers. Automate certificate collection, compliance checking, and expiration monitoring across your portfolio.',
    type: 'website',
    url: 'https://smartcoi.io/coi-tracking-software',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SmartCOI',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'AI-powered COI tracking software for commercial property managers. Automate certificate of insurance collection, compliance verification, and expiration monitoring.',
  offers: {
    '@type': 'Offer',
    price: '99',
    priceCurrency: 'USD',
  },
};

export default function COITrackingSoftwarePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            COI Tracking Software
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            COI Tracking Software That Replaces Spreadsheets and Guesswork
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            SmartCOI is purpose-built COI tracking software for commercial property managers.
            Upload a certificate, get instant AI-powered compliance results, and track
            insurance status across your entire portfolio — all from one dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-xl bg-slate-950 px-8 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:bg-slate-800"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/compare"
              className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Compare Solutions
            </Link>
          </div>
        </section>

        {/* What is COI Tracking Software */}
        <section className="mx-auto mt-20 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            What Is COI Tracking Software?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              COI tracking software is a specialized tool that helps organizations collect, verify,
              and monitor Certificates of Insurance from vendors, contractors, and tenants. Instead
              of managing insurance compliance through spreadsheets, email attachments, and filing
              cabinets, COI tracking software centralizes everything in a single system with
              automated workflows.
            </p>
            <p>
              For commercial property managers, COI tracking software solves a specific and painful
              problem: ensuring that every third party operating on your properties carries the
              insurance coverage required by their contract or lease. This includes verifying coverage
              types, checking that policy limits meet your minimums, confirming that your entities are
              listed as additional insured, and monitoring expiration dates across your entire vendor
              and tenant base.
            </p>
            <p>
              The best COI tracking software goes beyond simple document storage. It extracts data from
              certificate PDFs, compares that data against your requirements automatically, and alerts
              you when certificates expire or fall out of compliance — so you can focus on managing
              properties rather than chasing paperwork.
            </p>
          </div>
        </section>

        {/* Why Property Managers Need It */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Why Property Managers Need Dedicated COI Tracking
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Commercial property management creates unique COI tracking challenges. A single property
              might have 20-50 vendors — landscapers, HVAC contractors, electricians, janitorial
              services, security companies, elevator maintenance crews — each with their own insurance
              policies and expiration dates. Multiply that across a portfolio of properties and you
              are looking at hundreds of certificates to track.
            </p>
            <p>
              Manual tracking breaks down at this scale. Spreadsheets grow unwieldy. Emails get buried.
              Expired certificates go unnoticed for months. And when something goes wrong — a contractor
              injury, property damage, a tenant liability claim — the first question will be whether
              proper insurance was in place. If it was not, your organization bears the exposure.
            </p>
            <p>
              Property managers also face pressure from multiple directions: lenders require evidence
              of third-party insurance compliance, investors expect professional risk management, and
              your own insurance carrier may condition coverage on having a verified COI tracking
              program. Dedicated software makes all of this manageable.
            </p>
          </div>
        </section>

        {/* How SmartCOI Differs */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            How SmartCOI&apos;s AI-Powered Approach Is Different
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Traditional COI tracking software digitizes the process but still requires manual data
              entry. You upload a PDF and then type the coverage information into form fields yourself.
              Some legacy solutions use basic OCR technology that struggles with the varied layouts of
              insurance certificates and frequently produces errors that require manual correction.
            </p>
            <p>
              SmartCOI takes a fundamentally different approach. Our AI reads each certificate PDF the
              way a trained insurance professional would — understanding the structure of ACORD forms,
              identifying coverage types, extracting policy limits, reading effective and expiration
              dates, and recognizing named entities. The entire extraction happens in seconds, not
              minutes. And because the AI understands context rather than just matching text patterns,
              it handles the variations in certificate formatting that trip up traditional OCR.
            </p>
            <p>
              Once data is extracted, SmartCOI automatically compares it against your configured
              requirements. You see a clear compliance breakdown instantly — which requirements are
              met, which have gaps, and what the vendor needs to fix. No manual comparison needed.
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Key Features
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {[
              {
                title: 'AI-Powered Data Extraction',
                desc: 'Upload a COI PDF and get structured data in seconds. Coverage types, policy limits, dates, carriers, and named entities — all extracted automatically with high accuracy.',
              },
              {
                title: 'Automated Compliance Checking',
                desc: 'Extracted data is instantly compared against your property\'s insurance requirements. See pass/fail results for every coverage type, limit, and endorsement requirement.',
              },
              {
                title: 'Expiration Monitoring & Notifications',
                desc: 'SmartCOI tracks every expiration date and sends automated reminders to vendors and tenants at configurable intervals — 60, 30, 14, and 7 days before expiry.',
              },
              {
                title: 'Self-Service Vendor Portal',
                desc: 'Give each vendor a unique upload link where they can see what coverage is required and submit their certificate directly. No vendor accounts needed — just a link.',
              },
              {
                title: 'Customizable Requirement Templates',
                desc: 'Define coverage requirements once and reuse them across vendors and properties. Set minimum limits for each coverage type, mark required endorsements, and specify additional insured entities.',
              },
              {
                title: 'Portfolio-Wide Dashboard',
                desc: 'See compliance status across every property, vendor, and tenant from a single dashboard. Filter by property, compliance status, or upcoming expirations to focus on what needs attention.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Overview */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Simple, Transparent Pricing
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              SmartCOI starts at $79/month (billed annually) for the Starter plan, which includes
              unlimited properties, up to 50 vendors and tenants, 50 AI-powered COI extractions per
              month, and full access to compliance checking, notifications, and the vendor portal.
              The Professional plan at $199/month supports up to 250 vendors and 200 extractions for
              growing portfolios. Enterprise plans with unlimited capacity and custom integrations are
              available for larger organizations.
            </p>
            <p>
              Every plan includes a 14-day free trial with full feature access. No credit card
              required. No sales call needed — you can sign up and start tracking COIs in minutes.
            </p>
          </div>
        </section>

        {/* Related Content */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-xl font-bold text-slate-950">Learn More</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/blog/coi-compliance-guide-property-managers" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              The Complete Guide to COI Compliance for Property Managers
            </Link>
            <Link href="/blog/cost-of-not-tracking-vendor-insurance" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              The Hidden Cost of Not Tracking Vendor Insurance Compliance
            </Link>
            <Link href="/compare/smartcoi-vs-spreadsheets" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              COI Tracking: Software vs Spreadsheets
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Modernize Your COI Tracking?
            </h2>
            <p className="mt-4 text-slate-400">
              Join property management teams who&apos;ve replaced spreadsheets with
              AI-powered compliance tracking.
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
