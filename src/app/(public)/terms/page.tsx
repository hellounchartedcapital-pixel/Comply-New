import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'SmartCOI terms of service — read about your rights and responsibilities when using our AI-powered COI compliance tracking platform.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: February 2026
        </p>

        <div className="prose-section mt-10 space-y-10">
          {/* Introduction */}
          <section>
            <h2>Introduction</h2>
            <p>
              SmartCOI is operated by SmartCOI (&quot;we&quot;, &quot;us&quot;,
              &quot;our&quot;). By accessing or using the SmartCOI service, you
              agree to be bound by these Terms of Service. If you do not agree to
              these terms, please do not use the service.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2>Service Description</h2>
            <p>
              SmartCOI provides AI-powered certificate of insurance (COI)
              compliance tracking for commercial property managers. The service
              extracts data from uploaded PDF documents using artificial
              intelligence and checks coverage against user-configured
              requirements. It also provides tools for vendor and tenant
              management, automated notifications, and compliance dashboards.
            </p>
          </section>

          {/* AI Disclaimer */}
          <section>
            <h2>AI Disclaimer</h2>
            <p>
              SmartCOI uses artificial intelligence to extract and analyze
              insurance certificate data. While we strive for accuracy, AI
              extraction is not perfect. Users are responsible for reviewing and
              confirming all extracted data before relying on it for compliance
              decisions.
            </p>
            <p>
              SmartCOI does not provide legal, insurance, or compliance advice.
              The service is a tool to assist property managers &mdash; it does
              not replace professional judgment or legal counsel.
            </p>
          </section>

          {/* Accounts */}
          <section>
            <h2>Accounts</h2>
            <p>
              Users must provide accurate information when creating an account.
              Each account is associated with a single organization. You are
              responsible for maintaining the security of your account
              credentials and for all activity that occurs under your account.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2>Acceptable Use</h2>
            <p>
              The service may only be used for legitimate business purposes
              related to insurance compliance tracking. You agree not to:
            </p>
            <ul>
              <li>Upload malicious, fraudulent, or illegal files</li>
              <li>
                Attempt to reverse-engineer, decompile, or disassemble the
                service
              </li>
              <li>
                Use automated tools, bots, or scripts to access the service
                beyond normal usage
              </li>
              <li>
                Interfere with the service&apos;s operation or other
                users&apos; access
              </li>
            </ul>
          </section>

          {/* Data and Privacy */}
          <section>
            <h2>Data and Privacy</h2>
            <p>
              Please refer to our{' '}
              <a href="/privacy" className="text-brand-dark hover:underline">
                Privacy Policy
              </a>{' '}
              for details on how we collect, use, and protect your information.
              Uploaded documents are processed for extraction purposes and stored
              securely.
            </p>
          </section>

          {/* Subscriptions and Billing */}
          <section>
            <h2>Subscriptions and Billing</h2>
            <ul>
              <li>
                <strong>Free trial:</strong> All new accounts receive a 14-day
                free trial with full access to the service.
              </li>
              <li>
                <strong>Billing:</strong> Paid subscriptions are billed monthly
                or annually, depending on the plan you select.
              </li>
              <li>
                <strong>Cancellation:</strong> You may cancel your subscription
                at any time. Cancellation takes effect at the end of the current
                billing period.
              </li>
              <li>
                <strong>Refunds:</strong> We do not offer refunds for partial
                billing periods.
              </li>
              <li>
                <strong>Price changes:</strong> We reserve the right to change
                pricing with 30 days notice to existing customers.
              </li>
            </ul>
          </section>

          {/* Service Availability */}
          <section>
            <h2>Service Availability</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted
              service. Planned maintenance, infrastructure issues, or
              third-party service outages may cause temporary downtime. We are
              not liable for data loss, downtime, or AI extraction errors.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2>Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SmartCOI&apos;s total
              liability for any claims arising from your use of the service is
              limited to the amount you paid to SmartCOI in the 12 months
              preceding the claim.
            </p>
            <p>
              We are not liable for indirect, incidental, special,
              consequential, or punitive damages, including but not limited to
              loss of profits, data, or business opportunities.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2>Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these terms or
              engage in abusive behavior. You may cancel your account at any
              time through the billing settings in your dashboard.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2>Changes to Terms</h2>
            <p>
              We may update these terms from time to time. We will notify
              existing customers of material changes via email at least 30 days
              before they take effect. Continued use of the service after
              changes take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2>Contact</h2>
            <p>
              If you have questions about these terms, contact us at{' '}
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
