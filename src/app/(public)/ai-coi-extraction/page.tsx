import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'AI-Powered COI Data Extraction — Instant Compliance Checking | SmartCOI',
  description:
    'Upload a COI PDF and get structured data in seconds. SmartCOI\'s AI reads ACORD forms, extracts coverage data, and checks compliance automatically.',
  alternates: {
    canonical: '/ai-coi-extraction',
  },
  openGraph: {
    title: 'AI-Powered COI Data Extraction — Instant Compliance Checking | SmartCOI',
    description:
      'Upload a COI PDF and get structured data in seconds. SmartCOI\'s AI reads ACORD forms, extracts coverage data, and checks compliance automatically.',
    type: 'website',
    url: 'https://smartcoi.io/ai-coi-extraction',
  },
};

export default function AICOIExtractionPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4CC78A]">
            AI-Powered Extraction
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            AI-Powered COI Data Extraction
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Upload a certificate of insurance PDF and get fully structured data in seconds.
            SmartCOI&apos;s AI reads ACORD forms the way a trained insurance professional would —
            extracting every coverage, limit, date, and entity with high accuracy.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-xl bg-slate-950 px-8 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:bg-slate-800"
            >
              Try It Free
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="mx-auto mt-20 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            How AI Certificate Extraction Works
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Traditional approaches to reading certificates of insurance fall into two categories:
              fully manual review and legacy OCR (optical character recognition). Manual review means
              a human opens each PDF, finds the relevant fields, and types the data into a system.
              This is accurate but slow — typically 10 to 15 minutes per certificate. Legacy OCR
              scans the document for text patterns but struggles with the varied layouts, fonts, and
              formatting of insurance certificates, resulting in frequent errors that require manual
              correction.
            </p>
            <p>
              SmartCOI uses a fundamentally different approach: AI that understands the structure and
              meaning of insurance documents. Rather than pattern-matching text, the AI comprehends
              what an ACORD 25 form contains and where to find each piece of information. It
              understands that the section labeled &quot;COMMERCIAL GENERAL LIABILITY&quot; contains
              per-occurrence and aggregate limits, that dates in specific positions indicate policy
              periods, and that the certificate holder and additional insured sections contain entity
              names with specific legal significance.
            </p>
            <p>
              The result is extraction that is both fast and accurate. A certificate that takes a human
              10 minutes to review is processed by SmartCOI&apos;s AI in seconds. And because the AI
              understands context rather than just text patterns, it handles the real-world variations
              in certificate formatting that trip up legacy OCR systems.
            </p>
          </div>
        </section>

        {/* What Gets Extracted */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            What Data Is Extracted
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: 'Coverage Types',
                desc: 'General liability, automobile liability, workers\' compensation, umbrella/excess liability, professional liability, pollution liability, and any other coverage types present on the certificate.',
              },
              {
                title: 'Policy Limits',
                desc: 'Per occurrence limits, general aggregate, products/completed operations aggregate, combined single limits, statutory limits, per-accident limits — every limit type is captured with its correct category.',
              },
              {
                title: 'Effective & Expiration Dates',
                desc: 'Policy period dates for every coverage type. SmartCOI uses these to determine current policy status and calculate expiration warnings.',
              },
              {
                title: 'Insurance Carriers',
                desc: 'The insuring company for each coverage type, along with NAIC numbers when present. Useful for verifying carrier ratings and legitimacy.',
              },
              {
                title: 'Named Insured & Entities',
                desc: 'The named insured (the vendor or tenant), certificate holder, and any additional insured entities. Entity names are extracted precisely so they can be matched against your requirements.',
              },
              {
                title: 'Description of Operations',
                desc: 'The free-text description section that often contains critical information about additional insured endorsements, waivers of subrogation, and project-specific details.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Accuracy vs Manual and OCR */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            AI vs Manual Review vs Legacy OCR
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong className="text-slate-950">Speed.</strong> Manual review takes 10-15 minutes per
              certificate. Legacy OCR is faster but requires significant manual correction — typically
              5-8 minutes per certificate including error fixing. SmartCOI&apos;s AI extraction
              completes in seconds, with results that rarely need correction.
            </p>
            <p>
              <strong className="text-slate-950">Accuracy.</strong> Manual review accuracy depends on
              the reviewer — fatigue, distraction, and volume all degrade quality. After the twentieth
              certificate of the day, a human reviewer is far more likely to miss a limit shortfall or
              misread an expiration date. Legacy OCR has inherent accuracy limitations with varied
              document formats. AI extraction maintains consistent accuracy regardless of volume.
            </p>
            <p>
              <strong className="text-slate-950">Scalability.</strong> Manual review does not scale.
              Doubling your vendor count means doubling your review time. Legacy OCR scales better
              but still requires manual oversight for every extraction. AI extraction scales
              effortlessly — processing 100 certificates takes the same effort as processing one.
            </p>
            <p>
              <strong className="text-slate-950">Context understanding.</strong> This is where AI
              truly differs. Legacy OCR reads text characters. SmartCOI&apos;s AI understands what
              the text means. It knows that &quot;$1,000,000 EACH OCCURRENCE&quot; in the general
              liability section is a per-occurrence limit, not an aggregate. It understands that
              an entity name in the description of operations section may indicate an additional
              insured endorsement. This contextual understanding dramatically reduces errors.
            </p>
          </div>
        </section>

        {/* Instant Compliance */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            From Extraction to Compliance in Seconds
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Data extraction is only half the value. What makes SmartCOI&apos;s AI extraction truly
              powerful is the immediate compliance checking that follows. The moment data is extracted,
              it is compared against the vendor&apos;s or tenant&apos;s assigned insurance requirements.
            </p>
            <p>
              You see a clear, itemized compliance breakdown: which coverage requirements are met,
              which have gaps, whether limits are sufficient, whether the right entities are listed
              as additional insured, and whether any policies are expired or expiring soon. What
              used to require careful manual comparison is now instant and automatic.
            </p>
            <p>
              This speed transforms the COI review workflow. Instead of spending time reading
              certificates and doing mental math, property managers can focus on resolving actual
              compliance issues and making decisions. The AI handles the tedious extraction and
              comparison. Humans handle the judgment calls.
            </p>
          </div>
        </section>

        {/* Related Content */}
        <section className="mx-auto mt-16 max-w-4xl px-6">
          <h2 className="text-xl font-bold text-slate-950">Learn More</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/blog/acord-25-certificate-explained" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              ACORD 25 Certificate of Insurance: A Property Manager&apos;s Guide
            </Link>
            <Link href="/blog/what-is-additional-insured-commercial-real-estate" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              What Does &quot;Additional Insured&quot; Mean in Commercial Real Estate?
            </Link>
            <Link href="/features/compliance-automation" className="text-sm font-medium text-[#4CC78A] hover:text-[#3aae72] underline">
              Automated Compliance Checking Features &rarr;
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-4xl px-6 text-center">
          <div className="rounded-2xl bg-slate-950 px-8 py-14 sm:px-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              See AI Extraction in Action
            </h2>
            <p className="mt-4 text-slate-400">
              Upload your first certificate and watch the AI extract and check
              compliance in seconds. Free 14-day trial, no credit card required.
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
