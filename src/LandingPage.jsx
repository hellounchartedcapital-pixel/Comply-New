import React from 'react';
import { CheckCircle } from 'lucide-react';

export function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold" style={{ fontFamily: 'Libre Baskerville, serif' }}>comply</span>
            </div>
            <button
              onClick={onGetStarted}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'Libre Baskerville, serif', color: '#1F2937' }}>
            Stop Chasing COIs.<br />Start Managing Properties.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            AI-powered COI tracking that saves property managers 10+ hours per week. Upload. Verify. Done.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold text-lg transition-colors shadow-lg"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-50 font-semibold text-lg transition-colors border-2 border-gray-200"
            >
              See How It Works
            </button>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">😫</div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Hours of Manual Work
              </h3>
              <p className="text-gray-600">
                Reviewing COIs, checking coverage amounts, tracking expiration dates. You're spending 10-15 hours every week on paperwork.
              </p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Compliance Risk
              </h3>
              <p className="text-gray-600">
                One missed expiration could cost you $50k+ in liability. You're constantly worried about expired policies.
              </p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Endless Email Chains
              </h3>
              <p className="text-gray-600">
                Chasing vendors for updated COIs. Following up. Reminding again. It never ends and nothing gets automated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              SmartCOI Does It All For You
            </h2>
            <p className="text-xl text-gray-600">
              What took 30 minutes now takes 30 seconds
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="text-green-500 text-4xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                AI Extraction in 5 Seconds
              </h3>
              <p className="text-gray-600 mb-4">
                Upload any COI PDF. Our AI instantly extracts company names, coverage amounts, expiration dates, and policy numbers. No manual data entry ever again.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="text-green-500 text-4xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Instant Compliance Checking
              </h3>
              <p className="text-gray-600 mb-4">
                Red = expired. Orange = non-compliant. Green = good to go. See your risk at a glance. No spreadsheets, no guessing, no manual checking.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="text-green-500 text-4xl mb-4">🔔</div>
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Smart Alerts (30 Days Before)
              </h3>
              <p className="text-gray-600 mb-4">
                Never miss an expiration again. Automated email alerts 30 days before policies expire. Stay ahead of renewals without lifting a finger.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="text-green-500 text-4xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Professional Reports
              </h3>
              <p className="text-gray-600 mb-4">
                Export to Excel or PDF with one click. Perfect for audits, ownership reports, or quarterly reviews. Professional formatting, zero effort.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="text-5xl font-bold text-white mb-2">10hrs</div>
              <p className="text-green-100 text-lg">Saved Every Week</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-white mb-2">5sec</div>
              <p className="text-green-100 text-lg">AI Processing Time</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-white mb-2">100%</div>
              <p className="text-green-100 text-lg">Compliant Properties</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            Start Managing Smarter Today
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join property managers who've already automated their COI tracking
          </p>
          <button
            onClick={onGetStarted}
            className="px-10 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold text-xl transition-colors shadow-lg"
          >
            Get Started Free →
          </button>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Set up in 60 seconds
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2026 Comply. Eliminate manual COI tracking forever.</p>
        </div>
      </footer>
    </div>
  );
}
