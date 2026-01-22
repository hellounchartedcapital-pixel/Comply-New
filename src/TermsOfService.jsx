import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

export function TermsOfService({ onBack }) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using SmartCOI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              SmartCOI is a software-as-a-service platform that helps users track and manage Certificate of Insurance (COI) documents. The Service uses artificial intelligence to extract data from uploaded documents and monitor insurance compliance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>You must create an account to use the Service. You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Upload fraudulent, forged, or illegally obtained documents</li>
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to the Service or its systems</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Resell or redistribute the Service without authorization</li>
                <li>Use automated systems to access the Service beyond normal use</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data and Content</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>You retain ownership of all data and documents you upload to the Service. By using the Service, you grant us a limited license to process your documents for the purpose of providing the Service.</p>
              <p>You are responsible for ensuring you have the right to upload and process any documents you submit to the Service.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. AI-Powered Extraction</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>Our Service uses artificial intelligence to extract data from documents. While we strive for accuracy, you acknowledge that:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>AI extraction may occasionally contain errors</li>
                <li>You should verify extracted data for critical decisions</li>
                <li>The Service is a tool to assist, not replace, human judgment</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Service Availability</h2>
            <p className="text-gray-600 leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable for maintenance, updates, or circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, SMARTCOI SHALL NOT BE LIABLE FOR:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Damages arising from reliance on extracted data</li>
                <li>Any amount exceeding the fees paid by you in the preceding 12 months</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-gray-600 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              We may suspend or terminate your access to the Service at any time for violation of these Terms. You may cancel your account at any time. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Continued use after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these Terms, please contact us at legal@smartcoi.io.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
