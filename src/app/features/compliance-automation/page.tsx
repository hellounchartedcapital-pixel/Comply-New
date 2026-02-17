import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Automated Insurance Compliance for Property Managers | SmartCOI',
  description:
    'Automate insurance compliance verification for vendors and tenants. AI checks coverage limits, additional insured, and expiration dates automatically.',
  alternates: {
    canonical: 'https://smartcoi.com/features/compliance-automation',
  },
  openGraph: {
    title: 'Automated Insurance Compliance for Property Managers | SmartCOI',
    description:
      'Automate insurance compliance verification for vendors and tenants. AI checks coverage limits, additional insured, and expiration dates automatically.',
    type: 'website',
    url: 'https://smartcoi.com/features/compliance-automation',
  },
};

export default function ComplianceAutomationPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            Compliance Automation
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Insurance Compliance on Autopilot
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Stop manually comparing certificates against requirements. SmartCOI automates the
            entire compliance workflow — from upload to notification — so gaps never go unnoticed.
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
            Manual Compliance Checking Is Broken
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Verifying insurance compliance by hand is one of the most tedious and error-prone
              tasks in property management. For each vendor or tenant, you need to check that
              their certificate lists the right coverage types, that limits meet or exceed your
              minimums, that your entities are listed as additional insured, and that nothing
              has expired.
            </p>
            <p>
              A single property might have 20 vendors, each with multiple coverage requirements.
              Multiply that across a portfolio of properties and you&apos;re looking at hundreds
              of compliance checks — each one requiring careful reading of fine print and mental
              math. It&apos;s not a question of if something gets missed, but when.
            </p>
            <p>
              And when compliance gaps do slip through, the consequences can be severe. An
              uninsured contractor injury, a fire at a tenant&apos;s space with insufficient
              coverage, a lawsuit where the additional insured endorsement was missing — these
              are the scenarios that keep property managers up at night.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            How SmartCOI Automates Compliance
          </h2>
          <div className="mt-8 space-y-8">
            {[
              {
                step: '1',
                title: 'Set Your Requirements Once',
                desc: 'Define coverage requirements using customizable templates. Set minimum limits for each coverage type, mark which are required, and specify additional insured and certificate holder entities. These templates can be reused across vendors and properties.',
              },
              {
                step: '2',
                title: 'AI Extracts Certificate Data',
                desc: 'When a COI is uploaded — whether by your team or by the vendor through our self-service portal — our AI reads the entire document. It extracts every coverage type, policy number, carrier, limit amount, effective date, expiration date, and named entities. No manual data entry needed.',
              },
              {
                step: '3',
                title: 'Instant Compliance Calculation',
                desc: 'The extracted data is automatically compared against your requirements. SmartCOI checks coverage limits, verifies additional insured entities match, flags expiring policies, and identifies any gaps — all in seconds. You see a clear pass/fail breakdown for every requirement.',
              },
              {
                step: '4',
                title: 'Automated Notifications',
                desc: 'When gaps are found or certificates are about to expire, SmartCOI automatically notifies the vendor or tenant with a clear explanation of what needs to be fixed. They can upload a new certificate through the self-service portal — no more email tag.',
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

        {/* Key Capabilities */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Built for Real-World Compliance
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              SmartCOI handles the full spectrum of commercial insurance compliance requirements.
              From general liability and auto insurance to workers&apos; compensation, umbrella
              policies, professional liability, and specialty coverages like pollution and liquor
              liability — every coverage type is supported.
            </p>
            <p>
              The system understands different limit types (per occurrence, aggregate, combined
              single limit, statutory) and compares them correctly. It fuzzy-matches entity
              names so that minor spelling differences don&apos;t create false gaps. And it
              tracks expiration dates with configurable warning thresholds so you&apos;re always
              ahead of renewals.
            </p>
          </div>
        </section>

        {/* Related Features */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-xl font-bold text-slate-950">Related Features</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/features/coi-tracking" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              COI Tracking
            </Link>
            <Link href="/features/vendor-management" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Vendor Management
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Automate Your Compliance Workflow Today
            </h2>
            <p className="mt-4 text-slate-400">
              Let AI handle the tedious compliance checks while you focus on managing properties.
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
