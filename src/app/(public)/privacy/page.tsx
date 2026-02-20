import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'SmartCOI privacy policy — learn how we collect, use, and protect your data when you use our COI compliance tracking platform.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: February 2026
        </p>

        <div className="prose-section mt-10 space-y-10">
          {/* Introduction */}
          <section>
            <h2>Introduction</h2>
            <p>
              SmartCOI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects
              your privacy. This policy describes how we collect, use, and
              protect your information when you use the SmartCOI service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2>Information We Collect</h2>

            <h3>Account information</h3>
            <p>
              Name, email address, and organization name, provided during
              registration.
            </p>

            <h3>Property and vendor/tenant data</h3>
            <p>
              Property names, addresses, vendor and tenant company names, and
              contact email addresses, entered by users within the application.
            </p>

            <h3>Insurance documents</h3>
            <p>
              Certificate of Insurance (COI) PDF files uploaded by users or
              their vendors and tenants through the self-service portal.
            </p>

            <h3>Usage data</h3>
            <p>
              Pages visited, features used, and timestamps, collected
              automatically to help us improve the service.
            </p>

            <h3>Payment information</h3>
            <p>
              Payment processing is handled by Stripe. We do not store credit
              card numbers or full payment details on our servers.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2>How We Use Your Information</h2>

            <h3>To provide the service</h3>
            <p>
              We use your data to extract information from COI documents, check
              compliance against your configured requirements, and send
              notifications about coverage gaps and expirations.
            </p>

            <h3>AI processing</h3>
            <p>
              Uploaded PDF documents are sent to Anthropic&apos;s Claude API for
              data extraction. Anthropic processes the document content to
              extract structured insurance data. Anthropic&apos;s data retention
              policies apply to this processing &mdash; see{' '}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-dark hover:underline"
              >
                Anthropic&apos;s privacy policy
              </a>{' '}
              for details.
            </p>

            <h3>Email communications</h3>
            <p>
              Transactional emails, including compliance notifications,
              follow-up reminders, and portal upload links, are sent via Resend.
            </p>

            <h3>Service improvement</h3>
            <p>
              We use aggregated, anonymized usage data to understand how the
              product is used and to improve its features.
            </p>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2>Data Storage and Security</h2>
            <ul>
              <li>
                Data is stored on Supabase (backed by AWS) with encryption at
                rest and in transit.
              </li>
              <li>
                PDF documents are stored in Supabase Storage with access
                controls restricting access to authorized users.
              </li>
              <li>
                We use row-level security to ensure organizations can only
                access their own data.
              </li>
              <li>
                We do not sell, rent, or share your personal information with
                third parties for marketing purposes.
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2>Data Retention</h2>
            <ul>
              <li>
                Account data is retained while your account is active.
              </li>
              <li>
                After account cancellation, data is retained for 90 days to
                allow for recovery, then permanently deleted.
              </li>
              <li>
                You may request deletion of your data at any time by contacting{' '}
                <a
                  href="mailto:support@smartcoi.io"
                  className="text-brand-dark hover:underline"
                >
                  support@smartcoi.io
                </a>
                .
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2>Third-Party Services</h2>
            <p>
              SmartCOI relies on the following third-party services to operate:
            </p>
            <ul>
              <li>
                <strong>Anthropic</strong> &mdash; AI-powered data extraction
                from insurance documents
              </li>
              <li>
                <strong>Supabase</strong> &mdash; Database, authentication, and
                file storage
              </li>
              <li>
                <strong>Stripe</strong> &mdash; Payment processing and
                subscription management
              </li>
              <li>
                <strong>Resend</strong> &mdash; Transactional email delivery
              </li>
              <li>
                <strong>Vercel</strong> &mdash; Application hosting and
                deployment
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2>Your Rights</h2>
            <ul>
              <li>
                <strong>Access:</strong> You may request a copy of the personal
                data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> You may update your information at
                any time through the app settings.
              </li>
              <li>
                <strong>Deletion:</strong> You may request deletion of your
                account and all associated data.
              </li>
            </ul>
            <p className="mt-3">
              <strong>California residents:</strong> Under the CCPA, you have
              the right to know what personal data is collected, request
              deletion, and opt out of the sale of personal data. We do not sell
              personal data.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2>Cookies</h2>
            <p>
              We use essential cookies for authentication and session management.
              We do not use third-party advertising or tracking cookies.
            </p>
          </section>

          {/* Children */}
          <section>
            <h2>Children</h2>
            <p>
              SmartCOI is a business-to-business service and is not intended for
              use by anyone under 18 years of age.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will
              notify users of material changes via email. Continued use of the
              service after changes take effect constitutes acceptance of the
              updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2>Contact</h2>
            <p>
              If you have questions about this privacy policy or your data,
              contact us at{' '}
              <a
                href="mailto:support@smartcoi.io"
                className="text-brand-dark hover:underline"
              >
                support@smartcoi.io
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
