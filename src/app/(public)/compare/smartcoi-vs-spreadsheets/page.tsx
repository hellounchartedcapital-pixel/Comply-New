import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'COI Tracking: Software vs Spreadsheets — Why It\'s Time to Switch',
  description:
    'Compare manual spreadsheet COI tracking vs dedicated software. Real time and cost analysis shows why property managers are switching to automated tracking.',
  alternates: {
    canonical: '/compare/smartcoi-vs-spreadsheets',
  },
  openGraph: {
    title: 'COI Tracking: Software vs Spreadsheets — Why It\'s Time to Switch',
    description:
      'Compare manual spreadsheet COI tracking vs dedicated software. Real time and cost analysis shows why property managers are switching to automated tracking.',
    type: 'website',
    url: 'https://smartcoi.io/compare/smartcoi-vs-spreadsheets',
  },
};

export default function SmartCOIvsSpreadsheetsPage() {
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
            COI Tracking: Software vs Spreadsheets
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Most property management teams start tracking COIs in spreadsheets. It works at first.
            But as your portfolio grows, the cracks become canyons. Here&apos;s a real-world
            comparison of spreadsheet tracking vs dedicated COI tracking software.
          </p>
        </section>

        {/* Time Cost Analysis */}
        <section className="mx-auto mt-20 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            The Time Cost of Spreadsheet Tracking
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Let&apos;s do the math for a property management firm with 5 properties and 100 total
              vendors and tenants. Each vendor and tenant has at least one certificate of insurance
              that needs to be collected, reviewed, and monitored.
            </p>
            <p>
              <strong className="text-slate-950">Certificate review: 10-15 minutes each.</strong> Open
              the PDF. Find the coverage table. Compare each limit against your requirements. Check
              the expiration dates. Verify the additional insured. Type the data into the spreadsheet.
              For 100 certificates, that is 16-25 hours of initial data entry.
            </p>
            <p>
              <strong className="text-slate-950">Expiration monitoring: 2-3 hours per week.</strong> Sort
              the spreadsheet by expiration date. Identify who is expiring in the next 30-60 days.
              Draft and send individual follow-up emails. Track who has responded. That is 100-150 hours
              per year just on follow-ups.
            </p>
            <p>
              <strong className="text-slate-950">Renewal processing: 5-8 hours per week.</strong> When
              updated certificates come in (as email attachments, naturally), open each one, verify the
              new data, update the spreadsheet, and confirm compliance. With annual renewals, every
              certificate turns over at least once per year.
            </p>
            <p>
              <strong className="text-slate-950">Total: 10+ hours per week</strong> — roughly a
              quarter of a full-time employee dedicated to certificate tracking for a modestly
              sized portfolio. At a fully loaded cost of $60,000-80,000 per year for a property
              management professional, you are spending $15,000-20,000 annually in labor alone.
            </p>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Side-by-Side Comparison
          </h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left font-semibold text-slate-950">Capability</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-400">Spreadsheets</th>
                  <th className="px-6 py-4 text-left font-semibold text-[#4CC78A]">SmartCOI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { cap: 'Data extraction from PDFs', spread: 'Manual (you read and type)', smart: 'AI-powered, seconds' },
                  { cap: 'Compliance checking', spread: 'Manual comparison', smart: 'Instant, automated' },
                  { cap: 'Expiration monitoring', spread: 'Sort by date, check manually', smart: 'Automatic alerts' },
                  { cap: 'Follow-up notifications', spread: 'Draft emails one by one', smart: 'Automated at configurable intervals' },
                  { cap: 'Vendor self-service', spread: 'Not possible', smart: 'Self-service upload portal' },
                  { cap: 'Audit trail', spread: 'Only if meticulously maintained', smart: 'Automatic for every action' },
                  { cap: 'Portfolio dashboard', spread: 'Build pivot tables yourself', smart: 'Built-in, real-time' },
                  { cap: 'Time per certificate', spread: '10-15 minutes', smart: 'Under 1 minute' },
                  { cap: 'Error rate', spread: 'Increases with volume', smart: 'Consistent accuracy' },
                  { cap: 'Scales with portfolio', spread: 'Poorly', smart: 'Effortlessly' },
                ].map((row) => (
                  <tr key={row.cap}>
                    <td className="px-6 py-3 font-medium text-slate-950">{row.cap}</td>
                    <td className="px-6 py-3 text-slate-500">{row.spread}</td>
                    <td className="px-6 py-3 text-slate-600">{row.smart}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Error Rates */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            The Error Problem
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Spreadsheet-based COI tracking has an inherent accuracy problem: humans make mistakes,
              especially when performing repetitive data entry. After reviewing the tenth certificate
              of the day, it is easy to misread a limit ($500,000 vs $5,000,000), overlook an
              expiration date, or miss that the additional insured section lists the wrong entity.
            </p>
            <p>
              These errors are silent. Nobody notices a mistyped limit in a spreadsheet until a
              claim is filed. Nobody catches a missed expiration until the vendor is already working
              without coverage. The spreadsheet gives a false sense of security — you think you are
              tracking compliance, but the data may be wrong.
            </p>
            <p>
              Automated extraction eliminates this class of error. The AI applies the same level of
              scrutiny to every certificate, regardless of how many it has processed that day.
            </p>
          </div>
        </section>

        {/* Real-World Scenario */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            What Happens When Insurance Expires and Nobody Notices
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Consider this scenario. ABC Landscaping has been maintaining the grounds at your
              commercial office complex for three years. They provided a certificate of insurance
              when they started. Their general liability policy has a June 1 renewal date. It is
              now September. You have been tracking certificates in a spreadsheet, but the person
              who maintained it left the company in July. Nobody checked the spreadsheet in August.
            </p>
            <p>
              On September 15, an ABC Landscaping employee is trimming hedges near the building
              entrance when a branch falls and injures a visitor. The visitor is taken to the
              hospital with a head injury. They file a claim.
            </p>
            <p>
              Your attorney asks for ABC Landscaping&apos;s current certificate of insurance. You
              pull up the spreadsheet — and discover their policy expired on June 1. Three and a
              half months ago. ABC Landscaping has been operating on your property without verified
              insurance for an entire quarter.
            </p>
            <p>
              Now your organization is potentially exposed. The visitor&apos;s attorney will
              argue that you failed to verify vendor insurance, that you allowed an uninsured
              vendor to operate on the property, and that your negligence in tracking contributed
              to the injury. Even if ABC renewed their policy (which you cannot confirm), you
              have no documentation to prove compliance at the time of the incident.
            </p>
            <p>
              With automated COI tracking software, this scenario does not happen. The system
              would have flagged the approaching expiration 60 days before June 1, sent automated
              reminders to ABC Landscaping, and alerted your team if the certificate was not
              renewed. The compliance gap would have been caught in April, not after an injury
              in September.
            </p>
          </div>
        </section>

        {/* Cost Comparison */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            The Cost Comparison
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Spreadsheets are &quot;free&quot; (ignoring the labor cost). SmartCOI starts at
              $79/month for the Starter plan. That is $948 per year.
            </p>
            <p>
              But the true cost comparison is not software price vs zero. It is software price
              vs labor cost plus risk exposure.
            </p>
            <p>
              At 10+ hours per week in labor for a 100-vendor portfolio, spreadsheet tracking
              costs $15,000-20,000 per year in staff time. SmartCOI reduces that to well under an
              hour per week — a savings of roughly $14,000-19,000 annually, far exceeding the
              software cost.
            </p>
            <p>
              And that calculation does not include the risk reduction. A single uninsured incident
              can cost tens of thousands to millions of dollars. The software cost is trivial
              compared to the exposure it eliminates.
            </p>
          </div>
        </section>

        {/* Related Content */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-xl font-bold text-slate-950">Learn More</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/blog/cost-of-not-tracking-vendor-insurance" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              The Hidden Cost of Not Tracking Vendor Insurance Compliance
            </Link>
            <Link href="/coi-tracking-software" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              COI Tracking Software for Property Managers
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to Upgrade from Spreadsheets?
            </h2>
            <p className="mt-4 text-slate-400">
              Start your free trial and see the difference in minutes. No credit card required.
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
