import React from 'react';
import { Logo } from './Logo';

export function LandingPage({ onLogin, onSignUp, onPrivacy, onTerms, onPricing }) {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
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
              className="group relative px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-full font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className="relative z-10">Start Free Trial</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 min-h-screen flex items-center">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-emerald-200 px-4 py-2 rounded-full text-sm font-medium text-gray-600 mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent font-semibold">AI-Powered</span>
              <span>COI Tracking</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight">
              Stop wasting hours on{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  COI compliance
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M1 5.5C47 2 153 2 199 5.5" stroke="url(#underlineGradient)" strokeWidth="3" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="underlineGradient" x1="0" y1="0" x2="200" y2="0">
                      <stop stopColor="#059669"/>
                      <stop offset="0.5" stopColor="#10B981"/>
                      <stop offset="1" stopColor="#14B8A6"/>
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
              SmartCOI uses artificial intelligence to extract insurance data from certificates in seconds, not minutes. Save 10+ hours every week.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <button
                onClick={onSignUp}
                className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Free Trial
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="group px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all duration-300"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Demo
                </span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 sm:gap-12 justify-center lg:justify-start">
              {[
                { value: '5 sec', label: 'Extraction time' },
                { value: '99%', label: 'Accuracy' },
                { value: '10+ hrs', label: 'Saved weekly' }
              ].map((stat, idx) => (
                <div key={idx} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative lg:pl-8">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl blur-2xl scale-95" />

            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
              {/* Browser chrome */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-md px-4 py-1 text-xs text-gray-400 border border-gray-200">
                    app.smartcoi.io/dashboard
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Compliance Dashboard</h3>
                    <span className="text-xs text-gray-400">Live</span>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { value: '47', label: 'Compliant', color: 'emerald', icon: '✓' },
                      { value: '8', label: 'Expiring', color: 'amber', icon: '⚠' },
                      { value: '3', label: 'Expired', color: 'red', icon: '✕' }
                    ].map((card, idx) => (
                      <div key={idx} className={`relative overflow-hidden bg-gradient-to-br from-${card.color}-50 to-white rounded-xl p-4 border border-${card.color}-100`}>
                        <div className={`text-2xl font-bold text-${card.color}-600`}>{card.value}</div>
                        <div className="text-xs text-gray-500 mt-1">{card.label}</div>
                        <div className={`absolute -right-2 -top-2 text-4xl opacity-10 text-${card.color}-500`}>{card.icon}</div>
                      </div>
                    ))}
                  </div>

                  {/* Vendor List */}
                  <div className="space-y-2">
                    {[
                      { name: 'ABC Cleaning Services', status: 'Compliant', statusColor: 'emerald' },
                      { name: 'Pro Electric LLC', status: 'Expiring in 14 days', statusColor: 'amber' },
                      { name: 'Metro HVAC Inc.', status: 'Expired', statusColor: 'red' }
                    ].map((vendor, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full bg-${vendor.statusColor}-500`} />
                          <span className="font-medium text-sm text-gray-700">{vendor.name}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${vendor.statusColor}-100 text-${vendor.statusColor}-700`}>
                          {vendor.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-3 border border-gray-100 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700">COI Verified</div>
                  <div className="text-[10px] text-gray-400">Just now</div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-lg p-3 border border-gray-100 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700">AI Extracted</div>
                  <div className="text-[10px] text-gray-400">5 seconds</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">Trusted by property managers everywhere</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {['Property Co.', 'Realty Plus', 'Urban Mgmt', 'Prime Properties', 'Apex Living'].map((name, idx) => (
              <div key={idx} className="text-xl font-bold text-gray-400">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-4 px-4 py-1 bg-emerald-50 rounded-full">Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Everything you need to manage COIs</h2>
            <p className="text-lg text-gray-500">Powerful tools designed specifically for property managers who are tired of manual data entry.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <path d="M13 10V3L4 14h7v7l9-11h-7z"/>,
                title: 'Instant AI Extraction',
                description: 'Upload a COI and our AI extracts all policy details, limits, and expiration dates in under 5 seconds.',
                gradient: 'from-amber-400 to-orange-500'
              },
              {
                icon: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>,
                title: 'Expiration Alerts',
                description: 'Never miss a renewal. Get automatic alerts 30, 14, and 7 days before any certificate expires.',
                gradient: 'from-blue-400 to-indigo-500'
              },
              {
                icon: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>,
                title: 'Compliance Tracking',
                description: 'See at a glance which vendors are compliant, expiring soon, or need immediate attention.',
                gradient: 'from-emerald-400 to-teal-500'
              },
              {
                icon: <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>,
                title: 'Vendor Management',
                description: 'Organize all your vendors and their insurance documents in one central, searchable database.',
                gradient: 'from-purple-400 to-pink-500'
              },
              {
                icon: <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>,
                title: 'Cloud Storage',
                description: 'All certificates securely stored in the cloud. Access from anywhere, share with your team instantly.',
                gradient: 'from-cyan-400 to-blue-500'
              },
              {
                icon: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>,
                title: 'Team Collaboration',
                description: 'Invite team members, assign properties, and work together to keep compliance on track.',
                gradient: 'from-rose-400 to-red-500'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-900 text-white relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 px-4 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">From PDF to compliant in seconds</h2>
            <p className="text-lg text-gray-400">Three simple steps to eliminate manual COI data entry forever.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

            {[
              { num: '1', title: 'Upload Your COI', desc: 'Drag and drop any COI document. We support PDF, JPG, and PNG formats.' },
              { num: '2', title: 'AI Extracts Data', desc: 'Our AI instantly reads the document and extracts all policy details automatically.' },
              { num: '3', title: 'Track & Monitor', desc: 'View compliance status, get alerts, and never worry about expired coverage again.' }
            ].map((step, idx) => (
              <div key={idx} className="text-center relative z-10">
                <div className="relative inline-block mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-3xl font-extrabold shadow-xl shadow-emerald-500/25 rotate-3 hover:rotate-0 transition-transform duration-300">
                    {step.num}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-50 -z-10" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-4 px-4 py-1 bg-emerald-50 rounded-full">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start your 14-day free trial. No credit card required.</p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-lg opacity-25" />

              <div className="relative bg-white rounded-3xl p-10 shadow-2xl border border-gray-100">
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Early Adopter Pricing
                  </span>
                </div>

                <div className="text-center mb-8 pt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                  <p className="text-gray-500">Everything you need to manage COI compliance</p>
                </div>

                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">$99</span>
                    <span className="text-xl text-gray-400">/month</span>
                  </div>
                  <p className="text-emerald-600 font-medium mt-2">Or $79/month billed annually (save $240)</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    'Unlimited COI uploads',
                    'AI-powered data extraction',
                    'Up to 50 properties',
                    'Automatic expiration alerts',
                    'Compliance dashboard',
                    'Email support'
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onSignUp}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Start 14-Day Free Trial
                </button>
              </div>
            </div>

            <p className="text-center text-gray-500 mt-8">
              Need more?{' '}
              <button onClick={onPricing} className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                View all plans
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15)_0%,transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6">Ready to save 10+ hours every week?</h2>
          <p className="text-lg sm:text-xl text-white/90 mb-10">Join property managers who have already automated their COI compliance with SmartCOI.</p>
          <button
            onClick={onSignUp}
            className="group px-10 py-5 bg-white text-emerald-600 rounded-xl font-bold text-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              Start Your Free Trial
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
          <p className="text-white/70 text-sm mt-6">No credit card required • 5-minute setup • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 9h-2v2H9v-2H7v-2h2V7h2v2h2v2z"/>
                </svg>
              </div>
              <span className="text-xl font-bold">
                Smart<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">COI</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white text-sm transition-colors">Features</a>
              <button onClick={onPricing} className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</button>
              <button onClick={onPrivacy} className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</button>
              <button onClick={onTerms} className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</button>
            </div>

            <p className="text-sm text-gray-500">&copy; 2025 SmartCOI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
