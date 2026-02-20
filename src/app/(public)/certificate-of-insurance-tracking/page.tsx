import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Certificate of Insurance Tracking — Automated COI Management | SmartCOI',
  description:
    'Automate certificate of insurance tracking with AI-powered extraction and compliance checking. Stop manually reviewing COIs and eliminate missed expirations.',
  alternates: {
    canonical: '/certificate-of-insurance-tracking',
  },
  openGraph: {
    title: 'Certificate of Insurance Tracking — Automated COI Management | SmartCOI',
    description:
      'Automate certificate of insurance tracking with AI-powered extraction and compliance checking. Stop manually reviewing COIs and eliminate missed expirations.',
    type: 'website',
    url: 'https://smartcoi.io/certificate-of-insurance-tracking',
  },
};

export default function CertificateOfInsuranceTrackingPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            Certificate of Insurance Tracking
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Certificate of Insurance Tracking That Runs Itself
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Collecting and verifying certificates of insurance should not consume hours of your
            week. SmartCOI automates the entire COI tracking workflow — from upload to compliance
            check to expiration notification — so nothing falls through the cracks.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-xl bg-slate-950 px-8 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:bg-slate-800"
            >
              Start Your Free Trial
            </Link>
          </div>
        </section>

        {/* What is COI Tracking */}
        <section className="mx-auto mt-20 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            What Is Certificate of Insurance Tracking?
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Certificate of insurance tracking is the process of collecting, reviewing, and monitoring
              COIs from third parties — vendors, contractors, tenants — to ensure they maintain the
              insurance coverage required by their contracts or leases. A COI is typically an ACORD 25
              form that summarizes active insurance policies, including coverage types, policy limits,
              effective dates, expiration dates, and named entities.
            </p>
            <p>
              For commercial property managers, COI tracking is a fundamental risk management
              responsibility. Every vendor performing work on your property and every tenant occupying
              space should carry adequate insurance. The certificate proves it — but only if someone
              actually collects it, reads it, verifies it against requirements, and monitors it for
              expiration.
            </p>
            <p>
              Effective certificate of insurance tracking means knowing, at any given moment, which
              third parties are compliant, which have gaps, and which are approaching expiration. It
              means having documentation ready when auditors, lenders, or attorneys come asking
              questions.
            </p>
          </div>
        </section>

        {/* Risks of Not Tracking */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            The Risks of Not Tracking COIs
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              The consequences of inadequate certificate of insurance tracking are severe and often
              do not become apparent until a claim is filed or an audit occurs.
            </p>
            <p>
              <strong className="text-slate-950">Liability exposure.</strong> If a vendor causes an
              injury or property damage and their insurance has lapsed, your organization may be named
              in the resulting lawsuit. Without a current, compliant certificate on file, you may
              struggle to demonstrate that the vendor was responsible for maintaining their own coverage.
            </p>
            <p>
              <strong className="text-slate-950">Lease violations.</strong> Insurance requirements
              are lease provisions. When a tenant operates without required coverage, they are in
              default — but if you are not tracking certificates, you may not discover the default
              until an incident forces the issue.
            </p>
            <p>
              <strong className="text-slate-950">Financial consequences.</strong> Lenders and investors
              frequently audit COI compliance. Findings of inconsistent tracking can trigger covenant
              violations, increased insurance premiums, remediation requirements, or loss of management
              contracts. The financial exposure from a single uninsured incident can dwarf the cost of
              proper tracking by orders of magnitude.
            </p>
          </div>
        </section>

        {/* How Automated Tracking Works */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            How Automated COI Tracking Works
          </h2>
          <div className="mt-8 space-y-8">
            {[
              {
                step: '1',
                title: 'Upload or Receive a Certificate',
                desc: 'Upload a COI PDF directly, or give vendors a self-service portal link where they can submit their certificates themselves. Either way, the certificate enters your system instantly.',
              },
              {
                step: '2',
                title: 'AI Extracts the Data',
                desc: 'SmartCOI\'s AI reads the entire certificate in seconds, extracting every coverage type, policy limit, carrier name, effective date, expiration date, insured name, and additional insured entity. No manual data entry required.',
              },
              {
                step: '3',
                title: 'Compliance Is Checked Automatically',
                desc: 'Extracted data is compared against your configured requirements. You see instantly which coverages meet your minimums, which fall short, whether the right entities are listed as additional insured, and whether any policies are expired or expiring.',
              },
              {
                step: '4',
                title: 'Notifications Go Out Automatically',
                desc: 'When gaps are found or certificates approach expiration, SmartCOI sends automated notifications to the vendor or tenant with a clear explanation of what needs to be fixed and a link to upload an updated certificate.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#73E2A7]/10 text-sm font-bold text-[#4CC78A]">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spreadsheet Comparison */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Why Spreadsheets Fall Short
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Most property management teams start tracking COIs in spreadsheets. It works when you
              have a handful of vendors. But as your portfolio grows, spreadsheet-based tracking
              creates increasingly dangerous blind spots.
            </p>
            <p>
              Spreadsheets cannot read certificates — someone has to manually open each PDF, find the
              relevant data, and type it in. Spreadsheets cannot check compliance — someone has to
              mentally compare each value against requirements and remember which coverages matter for
              which vendor type. Spreadsheets cannot send notifications — someone has to review
              expiration dates regularly and send follow-up emails one by one.
            </p>
            <p>
              The result is a process that consumes 10 or more hours per week for a moderately sized
              portfolio, with an error rate that increases as volume grows. Dedicated COI tracking
              software like SmartCOI automates every step that spreadsheets cannot, reducing the
              process from hours to minutes while improving accuracy and eliminating missed expirations.
            </p>
            <p>
              <Link
                href="/compare/smartcoi-vs-spreadsheets"
                className="font-medium text-[#4CC78A] hover:text-[#3aae72] underline"
              >
                See the full comparison: software vs spreadsheets &rarr;
              </Link>
            </p>
          </div>
        </section>

        {/* Related Content */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-xl font-bold text-slate-950">Learn More</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/blog/coi-expiration-tracking-best-practices" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              COI Expiration Tracking: Best Practices for Property Managers
            </Link>
            <Link href="/blog/acord-25-certificate-explained" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              ACORD 25 Certificate of Insurance: A Property Manager&apos;s Guide
            </Link>
            <Link href="/ai-coi-extraction" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              How AI-Powered COI Data Extraction Works
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Automate Your Certificate of Insurance Tracking
            </h2>
            <p className="mt-4 text-slate-400">
              Stop spending hours on manual certificate review.
              Start your free trial and see compliance results in seconds.
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
