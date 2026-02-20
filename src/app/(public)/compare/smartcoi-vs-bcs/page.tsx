import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'SmartCOI vs BCS — COI Tracking Software Comparison',
  description:
    'Compare SmartCOI and BCS for COI tracking. AI-powered extraction vs OCR technology. Self-serve setup vs full-service human review.',
  alternates: {
    canonical: '/compare/smartcoi-vs-bcs',
  },
  openGraph: {
    title: 'SmartCOI vs BCS — COI Tracking Software Comparison',
    description:
      'Compare SmartCOI and BCS for COI tracking. AI-powered extraction vs OCR technology. Self-serve setup vs full-service human review.',
    type: 'website',
    url: 'https://smartcoi.io/compare/smartcoi-vs-bcs',
  },
};

export default function SmartCOIvsBCSPage() {
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
            SmartCOI vs BCS
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            SmartCOI and BCS (formerly PINS) both solve certificate of insurance tracking,
            but with different approaches. SmartCOI uses AI for instant extraction.
            BCS offers OCR plus full-service human review. Here&apos;s how they compare.
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
                  <th className="px-6 py-4 text-left font-semibold text-slate-950">BCS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { feature: 'Data extraction', smart: 'AI-powered, seconds', bcs: 'OCR + manual correction' },
                  { feature: 'Full-service option', smart: 'Self-serve software', bcs: 'Human analysts available' },
                  { feature: 'Setup time', smart: 'Self-serve, minutes', bcs: 'Implementation required' },
                  { feature: 'Pricing', smart: 'Transparent, from $79/mo', bcs: 'Custom quotes' },
                  { feature: 'Free trial', smart: '14 days, no card required', bcs: 'Demo only' },
                  { feature: 'Industry focus', smart: 'Commercial real estate', bcs: 'Multi-industry' },
                  { feature: 'Vendor portal', smart: 'Self-service upload links', bcs: 'Available' },
                  { feature: 'Compliance checking', smart: 'Instant, automated', bcs: 'Automated + human review' },
                  { feature: 'Track record', smart: 'Newer, AI-first platform', bcs: 'Established, 20+ years' },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="px-6 py-3 font-medium text-slate-950">{row.feature}</td>
                    <td className="px-6 py-3 text-slate-600">{row.smart}</td>
                    <td className="px-6 py-3 text-slate-600">{row.bcs}</td>
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
              <strong className="text-slate-950">AI-powered extraction vs OCR.</strong> This is the
              fundamental technology difference. BCS uses traditional OCR (optical character
              recognition) which reads text from document images but struggles with the varied layouts,
              fonts, and formatting of insurance certificates. SmartCOI&apos;s AI understands the
              structure and meaning of ACORD forms, resulting in higher accuracy and fewer manual
              corrections needed.
            </p>
            <p>
              <strong className="text-slate-950">Instant results.</strong> SmartCOI extracts certificate
              data in seconds and provides compliance results immediately. With BCS, the OCR extraction
              may require manual verification, and the full-service option involves human analysts with
              longer turnaround times. For property managers who need real-time compliance status,
              instant results are a significant advantage.
            </p>
            <p>
              <strong className="text-slate-950">Self-serve setup.</strong> SmartCOI is designed for
              teams that want to get started immediately. Create an account, configure requirements,
              and upload certificates — all in minutes. BCS typically requires an implementation process
              with their team.
            </p>
            <p>
              <strong className="text-slate-950">Transparent pricing.</strong> SmartCOI publishes
              pricing on its website. BCS requires contacting sales for a quote, making it harder to
              evaluate cost before committing to a sales conversation.
            </p>
          </div>
        </section>

        {/* BCS Advantages */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Where BCS Excels
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong className="text-slate-950">Full-service human review.</strong> BCS offers a
              full-service option where human analysts handle certificate collection and review. For
              organizations that want to completely outsource COI tracking rather than manage it
              in-house, this is a significant advantage. SmartCOI is a software tool that empowers
              your team; BCS can be a service that replaces the need for in-house review entirely.
            </p>
            <p>
              <strong className="text-slate-950">Multi-industry support.</strong> BCS has been
              serving clients across multiple industries — real estate, construction, healthcare,
              energy, and more — for over two decades. Their platform is designed to handle
              industry-specific compliance requirements beyond commercial real estate. SmartCOI is
              focused specifically on CRE.
            </p>
            <p>
              <strong className="text-slate-950">Longer track record.</strong> BCS has been in the
              COI tracking space for over 20 years, with an established client base and proven
              processes. For risk-averse organizations that prioritize vendor stability, BCS&apos;s
              track record provides reassurance.
            </p>
            <p>
              <strong className="text-slate-950">Compliance consulting.</strong> BCS offers compliance
              consulting services beyond just certificate tracking. For organizations that need help
              defining their insurance requirements and compliance programs, BCS can provide that
              guidance.
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
              <strong className="text-slate-950">Choose SmartCOI</strong> if you are a commercial
              real estate firm that wants instant AI-powered results, self-serve setup, transparent
              pricing, and the ability to manage COI compliance in-house with modern technology.
              SmartCOI is ideal for firms that want speed, simplicity, and control.
            </p>
            <p>
              <strong className="text-slate-950">Choose BCS</strong> if you want a full-service
              option with human analysts handling certificate review, need multi-industry compliance
              tracking, or prefer working with an established provider with a 20+ year track record.
              BCS is suited for firms that want to outsource the process entirely.
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
              See how AI-powered extraction compares to traditional OCR. No credit card required.
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
