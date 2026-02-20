import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Vendor COI Management | SmartCOI',
  description:
    'Manage vendor COIs effortlessly. Track compliance, automate follow-ups, and give vendors a self-service portal to upload certificates.',
  alternates: {
    canonical: 'https://smartcoi.io/features/vendor-management',
  },
  openGraph: {
    title: 'Vendor Certificate of Insurance Management | SmartCOI',
    description:
      'Manage vendor COIs effortlessly. Track compliance, automate follow-ups, and give vendors a self-service portal to upload certificates.',
    type: 'website',
    url: 'https://smartcoi.io/features/vendor-management',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does the vendor upload portal work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Each vendor receives a unique link to their portal page. There, they see your insurance requirements and can upload their certificate PDF directly. No account or login needed — just a link. The AI extracts and checks the certificate automatically.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I pause notifications for specific vendors?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can pause and resume notifications for any individual vendor. This is useful during contract negotiations, seasonal breaks, or when a vendor is being offboarded.',
      },
    },
    {
      '@type': 'Question',
      name: "What happens when a vendor's certificate expires?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SmartCOI sends automated reminder notifications at configurable intervals before expiration (typically 60, 30, 14, and 7 days). Each reminder explains what needs to be renewed and includes a link to upload the new certificate.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can different vendors have different insurance requirements?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Create requirement templates by vendor type (landscaping, electrical, janitorial, etc.) and assign the appropriate template to each vendor. Different risk levels get different coverage requirements.',
      },
    },
  ],
};

export default function VendorManagementPage() {
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
            Vendor Management
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Vendor COI Management Without the Chaos
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Track insurance compliance for every vendor across your portfolio. Automated
            follow-ups, a self-service upload portal, and real-time status visibility
            eliminate the back-and-forth.
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
            The Vendor Insurance Challenge
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Managing vendor insurance is one of the most time-consuming aspects of property
              management. Every landscaper, HVAC contractor, cleaning service, and construction
              crew needs to carry adequate insurance before stepping foot on your property. That
              means collecting certificates, verifying coverage, and — the biggest headache of
              all — chasing vendors for updated documents when things expire.
            </p>
            <p>
              The typical workflow is brutal: you email the vendor requesting a certificate,
              they forward your email to their insurance broker, the broker generates a
              certificate (maybe with your requirements, maybe not), the vendor emails it
              back to you, and then you manually review it. If something&apos;s wrong — a
              limit is too low, your entity isn&apos;t listed as additional insured — the
              whole cycle starts over.
            </p>
            <p>
              Across a portfolio of properties with dozens of vendors each, this creates an
              avalanche of administrative work. Certificates slip through the cracks. Expired
              policies go unnoticed. And your risk exposure grows silently.
            </p>
          </div>
        </section>

        {/* Solution */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            A Better Way to Manage Vendor Insurance
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              SmartCOI transforms vendor insurance management from a reactive scramble into a
              proactive, automated system. Each vendor is tracked with their assigned insurance
              requirements, current compliance status, and full certificate history.
            </p>
            <p>
              When a vendor&apos;s certificate needs updating — whether due to compliance gaps
              or approaching expiration — SmartCOI sends automated notifications with a clear
              explanation of what&apos;s needed. The vendor receives a link to a self-service
              upload portal where they can submit their new certificate directly. No email
              chains, no phone tag, no confusion about requirements.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Key Capabilities
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {[
              {
                title: 'Self-Service Upload Portal',
                desc: 'Give each vendor a unique upload link. They see exactly what coverage is required, upload their certificate, and your team gets notified instantly. No accounts needed.',
              },
              {
                title: 'Automated Expiration Reminders',
                desc: 'SmartCOI tracks every expiration date and sends tiered reminders at 60, 30, 14, and 7 days before expiry. Vendors are prompted to renew before it becomes urgent.',
              },
              {
                title: 'Per-Property Requirements',
                desc: 'Different properties have different insurance requirements. Assign requirement templates per vendor based on their risk level and the property they serve.',
              },
              {
                title: 'Real-Time Compliance Dashboard',
                desc: 'See which vendors are compliant, expiring, or non-compliant at a glance. Drill into any vendor to see their full compliance breakdown and certificate history.',
              },
              {
                title: 'Gap Notifications',
                desc: 'When a vendor\'s certificate doesn\'t meet requirements, they receive a detailed notification explaining exactly what needs to be fixed — in plain language, not insurance jargon.',
              },
              {
                title: 'Notification Controls',
                desc: 'Pause notifications for individual vendors when needed. Resume when ready. Full control over who gets contacted and when.',
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
                q: 'How does the vendor upload portal work?',
                a: 'Each vendor receives a unique link to their portal page. There, they see your insurance requirements and can upload their certificate PDF directly. No account or login needed — just a link. The AI extracts and checks the certificate automatically.',
              },
              {
                q: 'Can I pause notifications for specific vendors?',
                a: 'Yes. You can pause and resume notifications for any individual vendor. This is useful during contract negotiations, seasonal breaks, or when a vendor is being offboarded.',
              },
              {
                q: 'What happens when a vendor\'s certificate expires?',
                a: 'SmartCOI sends automated reminder notifications at configurable intervals before expiration (typically 60, 30, 14, and 7 days). Each reminder explains what needs to be renewed and includes a link to upload the new certificate.',
              },
              {
                q: 'Can different vendors have different insurance requirements?',
                a: 'Yes. Create requirement templates by vendor type (landscaping, electrical, janitorial, etc.) and assign the appropriate template to each vendor. Different risk levels get different coverage requirements.',
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
            <Link href="/features/coi-tracking" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              COI Tracking
            </Link>
            <Link href="/features/compliance-automation" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Compliance Automation
            </Link>
            <Link href="/blog/cost-of-not-tracking-vendor-insurance" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              The Hidden Cost of Not Tracking Vendor Insurance Compliance
            </Link>
            <Link href="/blog/what-is-additional-insured-commercial-real-estate" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              What Does &quot;Additional Insured&quot; Mean in CRE?
            </Link>
            <Link href="/vendor-insurance-compliance" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Vendor Insurance Compliance Overview
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Take Control of Vendor Compliance
            </h2>
            <p className="mt-4 text-slate-400">
              Stop chasing vendors for certificates. Let SmartCOI handle the follow-ups while you
              manage your properties.
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
