import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Tenant Insurance Tracking for Property Managers | SmartCOI',
  description:
    'Track tenant insurance compliance across your commercial properties. Automate COI collection, verify coverage against lease requirements, and monitor expirations.',
  alternates: {
    canonical: '/tenant-insurance-tracking',
  },
  openGraph: {
    title: 'Tenant Insurance Tracking for Property Managers | SmartCOI',
    description:
      'Track tenant insurance compliance across your commercial properties. Automate COI collection, verify coverage against lease requirements, and monitor expirations.',
    type: 'website',
    url: 'https://smartcoi.io/tenant-insurance-tracking',
  },
};

export default function TenantInsuranceTrackingPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            Tenant Insurance Tracking
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Tenant Insurance Tracking for Property Managers
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Commercial leases require tenants to maintain insurance — but verifying and tracking
            tenant COIs across a portfolio is a constant challenge. SmartCOI automates the process
            so every tenant stays compliant and every property stays protected.
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
            Why Tenant Insurance Tracking Is Critical
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Nearly every commercial lease contains insurance requirements. Tenants are typically
              required to carry general liability insurance, property insurance for their contents
              and improvements, and sometimes specialty coverages depending on their business type —
              liquor liability for restaurants and bars, professional liability for medical or legal
              tenants, pollution liability for dry cleaners or auto shops.
            </p>
            <p>
              These requirements exist for good reason. When a tenant causes damage to the building,
              injures a visitor, or creates a liability situation, their insurance should respond
              first. Without it, the property owner bears the exposure. A fire in a tenant space
              without adequate property insurance, a slip-and-fall with no general liability coverage,
              a lease default with no loss of income protection — these are scenarios that can cost
              property owners hundreds of thousands of dollars.
            </p>
            <p>
              The challenge is not just collecting certificates at lease signing. It is maintaining
              compliance throughout the lease term. Tenant insurance policies expire and are renewed
              annually. Coverage changes happen. Tenants switch carriers. Without ongoing monitoring,
              a tenant who was compliant on day one may have lapsed coverage by month eight — and
              nobody knows until something goes wrong.
            </p>
          </div>
        </section>

        {/* Typical Requirements */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Typical Tenant COI Requirements
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: 'Commercial General Liability',
                desc: 'Most leases require $1M per occurrence / $2M aggregate. Covers third-party bodily injury, property damage, and personal injury arising from the tenant\'s operations.',
              },
              {
                title: 'Property / Business Personal Property',
                desc: 'Covers the tenant\'s contents, improvements, and betterments. Typically required at replacement cost value. Protects both the tenant and the landlord\'s interest in tenant improvements.',
              },
              {
                title: 'Workers\' Compensation',
                desc: 'Required by law in most states for tenants with employees. Covers workplace injuries. The certificate should show statutory limits for the state where the property is located.',
              },
              {
                title: 'Additional Insured Endorsement',
                desc: 'The property owner, management company, and sometimes the lender must be listed as additional insured on the tenant\'s general liability policy. This gives your entities direct rights under the policy.',
              },
              {
                title: 'Waiver of Subrogation',
                desc: 'Prevents the tenant\'s insurer from suing the property owner after paying a claim. Most commercial leases require mutual waivers of subrogation.',
              },
              {
                title: 'Specialty Coverages',
                desc: 'Liquor liability for restaurants/bars. Professional liability for medical/legal tenants. Pollution liability for dry cleaners, gas stations, or auto repair shops.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How SmartCOI Handles Tenants */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            How SmartCOI Handles Tenant Insurance
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              SmartCOI treats tenant insurance tracking with the same rigor as vendor compliance.
              Tenants are managed alongside vendors in a unified system — each with their own
              insurance requirements, compliance status, certificate history, and notification
              settings.
            </p>
            <p>
              Create requirement templates tailored to tenant types: a standard office tenant
              template, a restaurant tenant template with liquor liability, a medical tenant
              template with professional liability. Assign the appropriate template when adding
              a tenant, and SmartCOI handles the rest.
            </p>
            <p>
              When a tenant&apos;s certificate is uploaded, the AI extracts all data and checks
              compliance against the assigned requirements. The system tracks expiration dates and
              sends automated renewal reminders to tenants before their policies lapse. Tenants can
              upload updated certificates through the same self-service portal used by vendors — no
              special accounts, just a link.
            </p>
            <p>
              For property managers who handle both vendor and tenant insurance, having both in one
              system eliminates the need for separate tracking processes. One dashboard shows
              compliance status for every third party across every property in your portfolio.
            </p>
          </div>
        </section>

        {/* Notification Workflows */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Automated Notification Workflows
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Following up on tenant insurance is one of the most time-consuming parts of property
              management. SmartCOI automates this entirely with configurable notification workflows.
            </p>
            <p>
              The system sends tiered reminders before certificate expiration — typically at 60, 30,
              14, and 7 days. Each notification clearly explains what coverage needs to be renewed and
              includes a link to the tenant&apos;s upload portal. If a compliance gap is found in a
              newly submitted certificate, the tenant receives a notification explaining the specific
              issue and what their broker needs to correct.
            </p>
            <p>
              You maintain full control. Pause notifications for individual tenants when needed — during
              lease negotiations, for example. Resume when ready. The dashboard shows you exactly who
              has been notified, when, and whether they have responded.
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
            <Link href="/blog/coi-compliance-guide-property-managers" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              The Complete Guide to COI Compliance for Property Managers
            </Link>
            <Link href="/vendor-insurance-compliance" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Vendor Insurance Compliance &rarr;
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Simplify Tenant Insurance Tracking
            </h2>
            <p className="mt-4 text-slate-400">
              Track tenant and vendor insurance compliance from one platform.
              Start your free trial today.
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
