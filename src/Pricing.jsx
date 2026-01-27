// Pricing.jsx
// Pricing page with subscription tiers

import React, { useState } from 'react';
import { Logo } from './Logo';
import { Check, X, Loader2, ArrowLeft, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 49,
    priceId: '',
    description: 'Perfect for small property managers',
    vendors: 25,
    gradient: 'from-slate-500 to-slate-600',
    shadowColor: 'shadow-slate-500/20',
    features: [
      { text: 'Up to 25 vendors', included: true },
      { text: 'AI-powered COI extraction', included: true },
      { text: 'Email COI requests', included: true },
      { text: 'Compliance dashboard', included: true },
      { text: 'Expiration alerts', included: true },
      { text: 'CSV export', included: true },
      { text: 'Analytics & reports', included: false },
      { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
  },
  {
    name: 'Professional',
    price: 99,
    priceId: '',
    description: 'For growing property management companies',
    vendors: 100,
    popular: true,
    gradient: 'from-emerald-500 to-teal-500',
    shadowColor: 'shadow-emerald-500/25',
    features: [
      { text: 'Up to 100 vendors', included: true },
      { text: 'AI-powered COI extraction', included: true },
      { text: 'Email COI requests', included: true },
      { text: 'Compliance dashboard', included: true },
      { text: 'Expiration alerts', included: true },
      { text: 'CSV export', included: true },
      { text: 'Analytics & reports', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: false },
    ],
  },
  {
    name: 'Business',
    price: 199,
    priceId: '',
    description: 'For large-scale operations',
    vendors: 500,
    gradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-violet-500/25',
    features: [
      { text: 'Up to 500 vendors', included: true },
      { text: 'AI-powered COI extraction', included: true },
      { text: 'Email COI requests', included: true },
      { text: 'Compliance dashboard', included: true },
      { text: 'Expiration alerts', included: true },
      { text: 'CSV export', included: true },
      { text: 'Analytics & reports', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: true },
    ],
  },
];

export function Pricing({ onBack, onSelectPlan, currentPlan, user }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(null);

  const handleSelectPlan = async (plan) => {
    if (!user) {
      onSelectPlan?.(plan, 'signup');
      return;
    }

    setLoading(plan.name);
    try {
      await onSelectPlan?.(plan, 'checkout');
    } catch (error) {
      console.error('Error selecting plan:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getAnnualPrice = (monthlyPrice) => {
    return Math.round(monthlyPrice * 12 * 0.8);
  };

  const getDisplayPrice = (plan) => {
    if (billingCycle === 'annual') {
      return Math.round(getAnnualPrice(plan.price) / 12);
    }
    return plan.price;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <Logo size="default" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white border border-emerald-200 px-4 py-2 rounded-full text-sm font-medium text-gray-600 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Choose your{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              perfect plan
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Start your 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-16">
          <div className="relative bg-white rounded-2xl p-1.5 shadow-lg border border-gray-200">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Annual</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  billingCycle === 'annual'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.name.toLowerCase();
            const isProfessional = plan.popular;

            return (
              <div
                key={plan.name}
                className={`relative group ${isProfessional ? 'lg:-mt-4 lg:mb-4' : ''}`}
              >
                {/* Glow effect for popular */}
                {isProfessional && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-40 transition-opacity" />
                )}

                <div className={`relative h-full bg-white rounded-3xl border transition-all duration-300 ${
                  isProfessional
                    ? 'border-emerald-200 shadow-2xl'
                    : 'border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300'
                }`}>
                  {/* Popular Badge */}
                  {isProfessional && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan Header */}
                    <div className="mb-6">
                      <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} items-center justify-center mb-4 shadow-lg ${plan.shadowColor}`}>
                        {plan.name === 'Starter' && (
                          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {plan.name === 'Professional' && (
                          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                        {plan.name === 'Business' && (
                          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-gray-500 mt-1">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-extrabold ${
                          isProfessional
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent'
                            : 'text-gray-900'
                        }`}>
                          ${getDisplayPrice(plan)}
                        </span>
                        <span className="text-gray-500 text-lg">/month</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-emerald-600 text-sm font-medium mt-2">
                          ${getAnnualPrice(plan.price)}/year (save ${plan.price * 12 - getAnnualPrice(plan.price)})
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loading === plan.name || isCurrentPlan}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isProfessional
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5'
                            : 'bg-gray-900 text-white hover:bg-gray-800 hover:-translate-y-0.5'
                      }`}
                    >
                      {loading === plan.name ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : isCurrentPlan ? (
                        <span>Current Plan</span>
                      ) : (
                        <span>Start Free Trial</span>
                      )}
                    </button>

                    {/* Vendor Count */}
                    <p className="text-center text-sm text-gray-500 mt-4">
                      Up to <span className="font-semibold text-gray-700">{plan.vendors}</span> vendors
                    </p>
                  </div>

                  {/* Features */}
                  <div className="border-t border-gray-100 p-8">
                    <p className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span>What's included</span>
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          {feature.included ? (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isProfessional
                                ? 'bg-emerald-100'
                                : 'bg-gray-100'
                            }`}>
                              <Check className={`w-3 h-3 ${
                                isProfessional ? 'text-emerald-600' : 'text-gray-600'
                              }`} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <X className="w-3 h-3 text-gray-300" />
                            </div>
                          )}
                          <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] rounded-3xl" />
            <div className="relative p-12 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Need more than 500 vendors?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Contact us for custom enterprise pricing with unlimited vendors, SSO, dedicated support, and custom integrations.
              </p>
              <a
                href="mailto:sales@smartcoi.io"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-300"
              >
                Contact Sales
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Preview */}
        <div className="mt-20 text-center">
          <p className="text-gray-500 mb-2">
            All plans include a <span className="text-gray-700 font-semibold">14-day free trial</span>
          </p>
          <p className="text-gray-500">
            Questions? Email us at{' '}
            <a href="mailto:support@smartcoi.io" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
              support@smartcoi.io
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 9h-2v2H9v-2H7v-2h2V7h2v2h2v2z"/>
                </svg>
              </div>
              <span className="font-bold text-gray-900">
                Smart<span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">COI</span>
              </span>
            </div>
            <p className="text-sm text-gray-500">
              &copy; 2025 SmartCOI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
