import React from 'react';
import { Logo } from './Logo';

export function LandingPage({ onLogin, onSignUp, onPrivacy, onTerms, onPricing }) {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 py-4 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <Logo size="default" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors">How It Works</a>
            <button onClick={onPricing} className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors">Pricing</button>
            <button
              onClick={onLogin}
              className="text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Log In
            </button>
            <button
              onClick={onSignUp}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold text-sm shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/45 transition-all"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute -top-1/2 -right-1/5 w-[800px] h-[800px] bg-gradient-radial from-teal-500/10 to-transparent rounded-full pointer-events-none" />
        <div className="absolute -bottom-1/3 -left-1/10 w-[600px] h-[600px] bg-gradient-radial from-emerald-500/10 to-transparent rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
          <div className="text-center md:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm font-medium text-gray-500 mb-6">
              <span>⚡</span>
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent font-semibold">AI-Powered</span>
              <span>COI Tracking</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Stop wasting hours on{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                COI compliance
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-500 mb-8 leading-relaxed">
              SmartCOI uses artificial intelligence to extract insurance data from certificates in seconds, not minutes. Save 10+ hours every week.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-12">
              <button
                onClick={onSignUp}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/45 transition-all"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold border-2 border-gray-200 hover:border-emerald-500 hover:text-emerald-600 transition-all"
              >
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-12 justify-center md:justify-start">
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">5 sec</span>
                <span className="text-sm text-gray-500">Average extraction time</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">99%</span>
                <span className="text-sm text-gray-500">Accuracy rate</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">10+ hrs</span>
                <span className="text-sm text-gray-500">Saved per week</span>
              </div>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 p-5">
                {/* Window controls */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Compliance Dashboard</h3>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-500">47</div>
                      <div className="text-xs text-gray-500 mt-1">Compliant</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-amber-500">8</div>
                      <div className="text-xs text-gray-500 mt-1">Expiring Soon</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-500">3</div>
                      <div className="text-xs text-gray-500 mt-1">Expired</div>
                    </div>
                  </div>

                  {/* Vendor List */}
                  <div className="space-y-0">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <span className="font-medium text-sm">ABC Cleaning Services</span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">Compliant</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <span className="font-medium text-sm">Pro Electric LLC</span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600">Expiring in 14 days</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="font-medium text-sm">Metro HVAC Inc.</span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600">Expired</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-4 block">Features</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Everything you need to manage COIs</h2>
            <p className="text-lg text-gray-500">Powerful tools designed specifically for property managers who are tired of manual data entry.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant AI Extraction</h3>
              <p className="text-gray-500 leading-relaxed">Upload a COI and our AI extracts all policy details, limits, and expiration dates in under 5 seconds.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Expiration Alerts</h3>
              <p className="text-gray-500 leading-relaxed">Never miss a renewal. Get automatic alerts 30, 14, and 7 days before any certificate expires.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Compliance Tracking</h3>
              <p className="text-gray-500 leading-relaxed">See at a glance which vendors are compliant, expiring soon, or need immediate attention.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Vendor Management</h3>
              <p className="text-gray-500 leading-relaxed">Organize all your vendors and their insurance documents in one central, searchable database.</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Cloud Storage</h3>
              <p className="text-gray-500 leading-relaxed">All certificates securely stored in the cloud. Access from anywhere, share with your team instantly.</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-50 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Team Collaboration</h3>
              <p className="text-gray-500 leading-relaxed">Invite team members, assign properties, and work together to keep compliance on track.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 block">How It Works</span>
            <h2 className="text-4xl font-extrabold text-white mb-4">From PDF to compliant in seconds</h2>
            <p className="text-lg text-gray-400">Three simple steps to eliminate manual COI data entry forever.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-emerald-600 to-teal-500" />

            {/* Step 1 */}
            <div className="text-center relative z-10">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full flex items-center justify-center text-3xl font-extrabold mx-auto mb-6 border-4 border-gray-900">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Upload Your COI</h3>
              <p className="text-gray-400 leading-relaxed">Drag and drop any COI document. We support PDF, JPG, and PNG formats.</p>
            </div>

            {/* Step 2 */}
            <div className="text-center relative z-10">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full flex items-center justify-center text-3xl font-extrabold mx-auto mb-6 border-4 border-gray-900">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">AI Extracts Data</h3>
              <p className="text-gray-400 leading-relaxed">Our AI instantly reads the document and extracts all policy details automatically.</p>
            </div>

            {/* Step 3 */}
            <div className="text-center relative z-10">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full flex items-center justify-center text-3xl font-extrabold mx-auto mb-6 border-4 border-gray-900">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Track & Monitor</h3>
              <p className="text-gray-400 leading-relaxed">View compliance status, get alerts, and never worry about expired coverage again.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-4 block">Pricing</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start your 14-day free trial. No credit card required.</p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-3xl p-12 shadow-2xl border-2 border-emerald-500 relative overflow-hidden">
              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-500" />

              {/* Badge */}
              <div className="absolute top-6 right-6 bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold">
                Early Adopter
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
              <p className="text-gray-500 mb-6">Everything you need to manage COI compliance</p>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">$99</span>
                <span className="text-lg text-gray-500">/month</span>
              </div>
              <p className="text-sm text-emerald-600 mb-8">Or $79/month billed annually (save $240)</p>

              <ul className="space-y-4 mb-8">
                {[
                  'Unlimited COI uploads',
                  'AI-powered data extraction',
                  'Up to 50 properties',
                  'Automatic expiration alerts',
                  'Compliance dashboard',
                  'Email support'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onSignUp}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold text-lg shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/45 transition-all"
              >
                Start 14-Day Free Trial
              </button>
            </div>
          </div>

          <p className="text-center text-gray-500 mt-8">
            Need more?{' '}
            <button onClick={onPricing} className="text-emerald-600 hover:underline font-medium">
              View all plans
            </button>
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_50%)] pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to save 10+ hours every week?</h2>
          <p className="text-lg text-white/90 mb-8">Join property managers who have already automated their COI compliance with SmartCOI.</p>
          <button
            onClick={onSignUp}
            className="px-10 py-4 bg-white text-emerald-600 rounded-lg font-semibold text-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 9h-2v2H9v-2H7v-2h2V7h2v2h2v2z"/>
              </svg>
            </div>
            <span className="text-xl font-bold">
              Smart<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">COI</span>
            </span>
          </div>

          <div className="flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">Features</a>
            <button onClick={onPricing} className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</button>
            <button onClick={onPrivacy} className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</button>
            <button onClick={onTerms} className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</button>
          </div>

          <p className="text-sm text-gray-500">&copy; 2025 SmartCOI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
