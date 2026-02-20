import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'SmartCOI vs Jones — COI Tracking Software Comparison',
  description:
    'Compare SmartCOI and Jones for COI tracking. See how AI-powered instant extraction compares to Jones\'s managed service approach for property managers.',
  alternates: {
    canonical: '/compare/smartcoi-vs-jones',
  },
  openGraph: {
    title: 'SmartCOI vs Jones — COI Tracking Software Comparison',
    description:
      'Compare SmartCOI and Jones for COI tracking. See how AI-powered instant extraction compares to Jones\'s managed service approach for property managers.',
    type: 'website',
    url: 'https://smartcoi.io/compare/smartcoi-vs-jones',
  },
};

export default function SmartCOIvsJonesPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <Link href="/compare" className="text-sm text-slate-500 hover:text-slate-700">
            &larr; All Comparisons
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            SmartCOI vs Jones
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Two different approaches to COI tracking. SmartCOI focuses on instant AI-powered
            extraction with self-serve setup. Jones offers a managed service with deep
            enterprise integrations. Here&apos;s an honest comparison.
          </p>
        </section>

        {/* Comparison Table */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left font-semibold text-slate-950">Feature</th>
                  <th className="px-6 py-4 text-left font-semibold text-[#4CC78A]">SmartCOI</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-950">Jones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { feature: 'Data extraction', smart: 'AI-powered, seconds', jones: 'Human review, ~24 hours' },
                  { feature: 'Setup time', smart: 'Self-serve, minutes', jones: 'Sales call + implementation' },
                  { feature: 'Pricing', smart: 'Transparent, published', jones: 'Custom quotes only' },
                  { feature: 'Free trial', smart: '14 days, no card required', jones: 'Demo only' },
                  { feature: 'Vendor portal', smart: 'Self-service upload links', jones: 'Available' },
                  { feature: 'PMS integrations', smart: 'Enterprise plan (Yardi, MRI, AppFolio)', jones: 'Deep integrations (Yardi, MRI, Procore)' },
                  { feature: 'Compliance checking', smart: 'Instant, automated', jones: 'Human + automated' },
                  { feature: 'Enterprise support', smart: 'Dedicated account manager', jones: 'Full enterprise team' },
                  { feature: 'Target market', smart: 'Mid-market CRE firms', jones: 'Enterprise CRE & construction' },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="px-6 py-3 font-medium text-slate-950">{row.feature}</td>
                    <td className="px-6 py-3 text-slate-600">{row.smart}</td>
                    <td className="px-6 py-3 text-slate-600">{row.jones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SmartCOI Advantages */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Where SmartCOI Excels
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong className="text-slate-950">Instant AI extraction.</strong> SmartCOI&apos;s AI
              extracts certificate data in seconds. Jones uses a combination of technology and human
              reviewers, with typical turnaround times of up to 24 hours. For property managers who
              need to know compliance status immediately — when a vendor shows up for work, when a
              tenant submits a certificate during lease signing — instant results matter.
            </p>
            <p>
              <strong className="text-slate-950">Self-serve signup and setup.</strong> SmartCOI is
              designed for teams that want to get started immediately. Sign up, configure your
              requirements, and upload your first certificate — all within minutes, no sales call
              required. Jones typically requires a sales conversation, proposal, and implementation
              period before you can begin.
            </p>
            <p>
              <strong className="text-slate-950">Transparent pricing.</strong> SmartCOI publishes
              its pricing openly. Starter plan at $79/month, Professional at $199/month, Enterprise
              by consultation. You know what you are paying before you ever talk to anyone. Jones
              requires contacting sales for pricing, which adds friction to the evaluation process.
            </p>
            <p>
              <strong className="text-slate-950">No sales call required.</strong> For firms that want
              to evaluate software on their own terms, SmartCOI&apos;s free trial lets you test
              the full platform with your actual certificates before making a decision.
            </p>
          </div>
        </section>

        {/* Jones Advantages */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Where Jones Excels
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong className="text-slate-950">Deep PMS integrations.</strong> Jones has
              established integrations with major property management systems including Yardi, MRI,
              and Procore. For enterprise organizations where COI data needs to flow seamlessly into
              existing systems, these integrations can be a deciding factor. SmartCOI offers
              enterprise integrations but Jones has had longer to build and refine them.
            </p>
            <p>
              <strong className="text-slate-950">Larger team and enterprise support.</strong> Jones
              is a larger organization with dedicated implementation, training, and support teams.
              For enterprise firms that need hands-on onboarding, custom workflows, and dedicated
              account management from day one, Jones&apos;s team size is an advantage.
            </p>
            <p>
              <strong className="text-slate-950">Multi-industry coverage.</strong> While SmartCOI
              is focused specifically on commercial real estate, Jones serves multiple industries
              including construction, healthcare, and transportation. Organizations with COI
              tracking needs across different industries may benefit from Jones&apos;s broader
              platform.
            </p>
            <p>
              <strong className="text-slate-950">Managed service option.</strong> Jones offers a
              fully managed service where their team handles certificate collection and review.
              For organizations that prefer to outsource the entire process rather than manage it
              in-house with software, this is a meaningful differentiator.
            </p>
          </div>
        </section>

        {/* Bottom Line */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            The Bottom Line
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong className="text-slate-950">Choose SmartCOI</strong> if you are a mid-market
              commercial real estate firm that wants instant AI-powered extraction, self-serve setup,
              transparent pricing, and the ability to be up and running in minutes rather than weeks.
              SmartCOI is built for teams that value speed and simplicity.
            </p>
            <p>
              <strong className="text-slate-950">Choose Jones</strong> if you are an enterprise
              organization that needs deep integrations with Yardi, MRI, or Procore, wants a fully
              managed service option, or requires multi-industry COI tracking beyond commercial
              real estate.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Try SmartCOI Free for 14 Days
            </h2>
            <p className="mt-4 text-slate-400">
              See how instant AI extraction compares. No credit card required.
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
