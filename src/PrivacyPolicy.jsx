import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

export function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="default" />
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              SmartCOI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our certificate of insurance tracking service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p><strong>Account Information:</strong> When you create an account, we collect your email address and password.</p>
              <p><strong>Uploaded Documents:</strong> We process Certificate of Insurance (COI) documents you upload to extract insurance data. Documents are processed securely and not stored permanently after extraction.</p>
              <p><strong>Vendor Data:</strong> We store vendor names, insurance coverage amounts, expiration dates, and compliance status that you manage through our service.</p>
              <p><strong>Usage Data:</strong> We collect information about how you interact with our service, including access times and features used.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 leading-relaxed">
              <li>To provide and maintain our service</li>
              <li>To process and analyze your COI documents</li>
              <li>To send you compliance alerts and notifications</li>
              <li>To improve our AI extraction accuracy</li>
              <li>To respond to your inquiries and support requests</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in transit (TLS) and at rest, secure authentication, and row-level security policies that ensure you can only access your own data. Our AI processing occurs through secure, encrypted connections.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your account and vendor data for as long as your account is active. Uploaded PDF documents are processed immediately and not stored permanently. You may request deletion of your account and all associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              We use trusted third-party services to operate our platform, including Supabase for database and authentication, and AI services for document processing. These providers are bound by their own privacy policies and data protection agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 leading-relaxed">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              We use essential cookies to maintain your session and authentication state. We do not use third-party tracking cookies or sell your data to advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at privacy@smartcoi.io.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
