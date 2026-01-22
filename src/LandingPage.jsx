import React from 'react';
import { Logo } from './Logo';
import { CheckCircle, Sparkles, Upload, Bell, FileText, ArrowRight, Zap, Shield, Clock } from 'lucide-react';

export function LandingPage({ onLogin, onSignUp, onPrivacy, onTerms }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="default" />
            <div className="flex items-center space-x-4">
              <button
                onClick={onLogin}
                className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Log In
              </button>
              <button
                onClick={onSignUp}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 font-medium transition-all shadow-sm hover:shadow-md"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white -z-10"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-20 -z-10"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-20 -z-10"></div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">AI-Powered Certificate Tracking</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent leading-tight">
              COI Compliance on<br />Autopilot
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Stop chasing expired certificates. SmartCOI uses AI to extract, verify, and track insurance compliance—so you can focus on what matters.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={onSignUp}
                className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-lg transition-all border-2 border-gray-200 hover:border-gray-300"
              >
                See How It Works
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>5-second setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>Free forever plan</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur-2xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
                <div className="bg-gray-800 rounded-lg p-6">
                  {/* Mock dashboard */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-700 rounded w-1/3 mb-2"></div>
                        <div className="h-2 bg-gray-700 rounded w-1/4"></div>
                      </div>
                      <div className="px-4 py-2 bg-emerald-500 bg-opacity-20 text-emerald-400 rounded-lg text-sm font-medium">
                        Compliant
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-700 rounded w-1/3 mb-2"></div>
                        <div className="h-2 bg-gray-700 rounded w-1/4"></div>
                      </div>
                      <div className="px-4 py-2 bg-orange-500 bg-opacity-20 text-orange-400 rounded-lg text-sm font-medium">
                        Expiring Soon
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-700 rounded w-1/3 mb-2"></div>
                        <div className="h-2 bg-gray-700 rounded w-1/4"></div>
                      </div>
                      <div className="px-4 py-2 bg-emerald-500 bg-opacity-20 text-emerald-400 rounded-lg text-sm font-medium">
                        Compliant
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-bold text-emerald-600 mb-2">10hrs</div>
              <p className="text-gray-600 text-lg">Saved per week</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-emerald-600 mb-2">5sec</div>
              <p className="text-gray-600 text-lg">AI extraction time</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-emerald-600 mb-2">99%</div>
              <p className="text-gray-600 text-lg">Accuracy rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Everything you need, nothing you don't
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful automation that saves hours every week—without the complexity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">AI Extraction</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload any COI PDF and watch our AI instantly extract company names, coverage amounts, expiration dates, and policy numbers. Zero manual data entry.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Smart Compliance</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatic compliance checking against your requirements. Red, yellow, or green status at a glance. Know your risk instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Proactive Alerts</h3>
              <p className="text-gray-600 leading-relaxed">
                Get notified 30 days before policies expire. Never miss a renewal again. Stay ahead without the manual tracking.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Drag & Drop Upload</h3>
              <p className="text-gray-600 leading-relaxed">
                Simple, intuitive file uploads. Drag a PDF, drop it, done. We handle the rest automatically with AI-powered processing.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                What used to take 30 minutes now takes 30 seconds. Process certificates instantly and get back to managing your properties.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Real-Time Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                See all your vendors at a glance. Filter, sort, and search instantly. Export reports with one click for audits or reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              From upload to compliance in seconds
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to automated COI tracking
            </p>
          </div>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Upload Your COI PDF</h3>
                <p className="text-lg text-gray-600">
                  Drag and drop any Certificate of Insurance. Our system accepts all standard formats.
                </p>
              </div>
              <div className="flex-shrink-0 w-64 h-40 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 flex items-center justify-center">
                <Upload className="w-16 h-16 text-emerald-500" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <div className="flex-1 text-center md:text-right">
                <h3 className="text-2xl font-bold mb-3 text-gray-900">AI Extracts All Data</h3>
                <p className="text-lg text-gray-600">
                  Our AI reads and extracts all relevant information in 5 seconds—coverage amounts, dates, policy numbers.
                </p>
              </div>
              <div className="flex-shrink-0 w-64 h-40 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 flex items-center justify-center">
                <Sparkles className="w-16 h-16 text-emerald-500" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Instant Compliance Status</h3>
                <p className="text-lg text-gray-600">
                  See your vendor's compliance status immediately. Green means compliant, yellow means expiring soon, red means action needed.
                </p>
              </div>
              <div className="flex-shrink-0 w-64 h-40 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 flex items-center justify-center">
                <CheckCircle className="w-16 h-16 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to automate your COI tracking?
          </h2>
          <p className="text-xl text-emerald-50 mb-10 max-w-2xl mx-auto">
            Join property managers who've already saved hundreds of hours with SmartCOI
          </p>
          <button
            onClick={onSignUp}
            className="group px-10 py-5 bg-white text-emerald-600 rounded-xl hover:bg-gray-50 font-bold text-xl transition-all shadow-xl hover:shadow-2xl inline-flex items-center space-x-3"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-sm text-emerald-100 mt-6">
            No credit card required • 5-second setup • Free forever plan available
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <Logo size="small" className="opacity-80" />
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={onPrivacy}
                className="text-sm hover:text-white transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={onTerms}
                className="text-sm hover:text-white transition-colors"
              >
                Terms of Service
              </button>
            </div>
            <p className="text-sm">&copy; 2026 SmartCOI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
