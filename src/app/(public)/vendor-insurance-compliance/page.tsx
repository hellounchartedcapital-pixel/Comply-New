import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Vendor Insurance Compliance Software for Commercial Real Estate | SmartCOI',
  description:
    'Automate vendor insurance compliance for commercial properties. Track COIs, verify coverage limits, monitor expirations, and give vendors a self-service upload portal.',
  alternates: {
    canonical: '/vendor-insurance-compliance',
  },
  openGraph: {
    title: 'Vendor Insurance Compliance Software for Commercial Real Estate | SmartCOI',
    description:
      'Automate vendor insurance compliance for commercial properties. Track COIs, verify coverage limits, monitor expirations, and give vendors a self-service upload portal.',
    type: 'website',
    url: 'https://smartcoi.io/vendor-insurance-compliance',
  },
};

export default function VendorInsuranceCompliancePage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            Vendor Insurance Compliance
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Vendor Insurance Compliance for Commercial Real Estate
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Every vendor on your property needs to carry adequate insurance. SmartCOI automates
            the collection, verification, and monitoring of vendor COIs — so compliance gaps
            never go unnoticed and your properties stay protected.
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

        {/* Why It Matters */}
        <section className="mx-auto mt-20 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Why Vendor Insurance Compliance Matters in CRE
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Commercial properties rely on a network of vendors and contractors — landscapers,
              HVAC technicians, electricians, plumbers, janitorial services, security firms,
              construction crews, elevator maintenance companies, and more. Each of these vendors
              brings unique risks onto your property. A contractor could cause property damage.
              A maintenance worker could be injured on-site. A service provider could create a
              liability situation that exposes your organization.
            </p>
            <p>
              Vendor insurance compliance is the practice of ensuring that every vendor carries
              the insurance coverage specified in their contract before they perform work on your
              property. This typically includes general liability, workers&apos; compensation,
              automobile liability (for vendors using vehicles on-site), and sometimes specialty
              coverages like pollution liability or professional liability depending on the work
              being performed.
            </p>
            <p>
              When vendor insurance compliance is properly managed, your organization is protected.
              If an incident occurs, the vendor&apos;s insurance responds first. When compliance
              lapses — an expired policy, insufficient limits, a missing additional insured
              endorsement — your organization may bear liability that should have been the
              vendor&apos;s responsibility.
            </p>
          </div>
        </section>

        {/* Common Compliance Gaps */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Common Vendor Compliance Gaps
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: 'Expired Policies',
                desc: 'The most common gap. A vendor provides a certificate when they start work, but the policy expires months later and nobody follows up. The vendor keeps working without verified coverage.',
              },
              {
                title: 'Insufficient Limits',
                desc: 'Your contract requires $1M per occurrence in general liability, but the vendor\'s policy only carries $500K. Limit shortfalls are easy to miss during manual reviews.',
              },
              {
                title: 'Missing Additional Insured',
                desc: 'Being listed as additional insured gives your organization direct rights under the vendor\'s policy. This endorsement is frequently missing or lists the wrong entity name.',
              },
              {
                title: 'Missing Coverage Types',
                desc: 'A roofing contractor with general liability but no workers\' comp. A technology vendor without cyber liability. Each vendor type has different risk profiles and coverage needs.',
              },
              {
                title: 'Wrong Entity Names',
                desc: '"ABC Property LLC" vs "ABC Property Management, Inc." — entity name mismatches on certificates can create problems during claims and may void additional insured coverage.',
              },
              {
                title: 'No Waiver of Subrogation',
                desc: 'A waiver of subrogation prevents the vendor\'s insurer from suing your organization to recover claim payments. Many contracts require it, but it\'s frequently missing from certificates.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How SmartCOI Automates It */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            How SmartCOI Automates Vendor Compliance
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              SmartCOI replaces the manual vendor compliance workflow with an automated system.
              Define your insurance requirements using customizable templates — set minimum limits
              for each coverage type, mark required endorsements, and specify the entities that
              must be listed as additional insured. Assign templates to vendors based on the type
              of work they perform.
            </p>
            <p>
              When a vendor&apos;s certificate is uploaded — either by your team or by the vendor
              through the self-service portal — SmartCOI&apos;s AI extracts all data from the
              certificate PDF in seconds and checks it against the assigned requirements. You see
              instantly whether the vendor is compliant, what gaps exist, and what needs to be fixed.
            </p>
            <p>
              SmartCOI monitors every expiration date and sends automated reminders to vendors at
              configurable intervals before their certificates expire. When a certificate falls out
              of compliance, the vendor receives a clear notification explaining exactly what needs to
              be updated, with a link to upload a new certificate through the self-service portal.
            </p>
          </div>
        </section>

        {/* Self-Service Portal */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            The Vendor Experience: Self-Service Portal
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              SmartCOI includes a self-service upload portal that transforms the vendor experience.
              Instead of back-and-forth emails and confusion about what coverage is needed, each
              vendor receives a unique link to their portal page. There, they can see exactly what
              insurance requirements apply to them and upload their certificate directly.
            </p>
            <p>
              No vendor account is needed — just a link. The vendor uploads their certificate PDF,
              SmartCOI&apos;s AI extracts and checks the data automatically, and your team is
              notified only when human review is needed. This reduces the administrative burden on
              both sides and dramatically speeds up the compliance process.
            </p>
            <p>
              Vendors appreciate the transparency. Instead of wondering why their certificate was
              rejected, they can see the specific requirements and understand exactly what their
              broker needs to provide.
            </p>
          </div>
        </section>

        {/* Related Content */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-xl font-bold text-slate-950">Learn More</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/blog/what-is-additional-insured-commercial-real-estate" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              What Does &quot;Additional Insured&quot; Mean in Commercial Real Estate?
            </Link>
            <Link href="/blog/cost-of-not-tracking-vendor-insurance" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              The Hidden Cost of Not Tracking Vendor Insurance Compliance
            </Link>
            <Link href="/features/vendor-management" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Vendor COI Management Features &rarr;
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Take Control of Vendor Insurance Compliance
            </h2>
            <p className="mt-4 text-slate-400">
              Stop chasing vendors for certificates. Let SmartCOI automate
              collection, verification, and follow-ups.
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
