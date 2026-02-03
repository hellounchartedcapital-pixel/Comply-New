// Pricing.jsx
// Pricing page with subscription tiers - matches new landing page style

import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Check, X, Loader2, ArrowLeft, Zap, FileCheck } from 'lucide-react';
import { AlertModal, useAlertModal } from './AlertModal';
import { useSubscription } from './useSubscription';
import logger from './logger';

const plans = [
  {
    name: 'Free',
    price: 0,
    priceId: '',
    description: 'Perfect for getting started',
    vendors: 10,
    gradient: 'from-gray-400 to-gray-500',
    shadowColor: 'shadow-gray-400/20',
    features: [
      { text: 'Up to 10 certificates', included: true },
      { text: 'AI-powered COI extraction', included: true },
      { text: 'Email COI requests', included: true },
      { text: 'Compliance dashboard', included: true },
      { text: 'Expiration alerts', included: true },
      { text: 'CSV & PDF export', included: false },
      { text: 'Automated follow-ups', included: false },
      { text: 'Analytics & reports', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Starter',
    price: 79,
    priceId: '',
    description: 'For small property managers',
    vendors: 25,
    gradient: 'from-slate-500 to-slate-600',
    shadowColor: 'shadow-slate-500/20',
    features: [
      { text: 'Up to 25 certificates', included: true },
      { text: 'AI-powered COI extraction', included: true },
      { text: 'Email COI requests', included: true },
      { text: 'Compliance dashboard', included: true },
      { text: 'Expiration alerts', included: true },
      { text: 'CSV & PDF export', included: true },
      { text: 'Automated follow-ups', included: true },
      { text: 'Analytics & reports', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Professional',
    price: 149,
    priceId: '',
    description: 'For growing property management companies',
    vendors: 100,
    popular: true,
    gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
    shadowColor: 'shadow-emerald-500/25',
    features: [
      { text: 'Up to 100 certificates', included: true },
      { text: 'AI-powered COI extraction', included: true },
      { text: 'Email COI requests', included: true },
      { text: 'Compliance dashboard', included: true },
      { text: 'Expiration alerts', included: true },
      { text: 'CSV & PDF export', included: true },
      { text: 'Automated follow-ups', included: true },
      { text: 'Analytics & reports', included: true },
      { text: 'Priority support', included: true },
    ],
  },
  {
    name: 'Enterprise',
    price: 299,
    priceId: '',
    description: 'For large-scale operations',
    vendors: 500,
    gradient: 'from-violet-500 to-purple-600',
    shadowColor: 'shadow-violet-500/25',
    features: [
      { text: 'Up to 500 certificates', included: true },
      { text: 'AI-powered COI extraction', included: true },
      { text: 'Email COI requests', included: true },
      { text: 'Compliance dashboard', included: true },
      { text: 'Expiration alerts', included: true },
      { text: 'CSV & PDF export', included: true },
      { text: 'Automated follow-ups', included: true },
      { text: 'Analytics & reports', included: true },
      { text: 'Priority support', included: true },
    ],
  },
];

export function Pricing({ onBack, onSignUp, user }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const { alertModal, showAlert, hideAlert } = useAlertModal();
  const { subscription, createCheckoutSession, openCustomerPortal } = useSubscription();

  // Check for checkout result in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutResult = params.get('checkout');
    if (checkoutResult === 'success') {
      showAlert({
        type: 'success',
        title: 'Subscription Activated!',
        message: 'Welcome to your new plan. Your subscription is now active.',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkoutResult === 'cancelled') {
      showAlert({
        type: 'info',
        title: 'Checkout Cancelled',
        message: 'No charges were made. You can try again anytime.',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showAlert]);

  const currentPlan = subscription?.plan || 'free';

  const handleSelectPlan = async (plan) => {
    const planKey = plan.name.toLowerCase();

    // If user is not logged in, redirect to signup
    if (!user) {
      onSignUp?.(planKey);
      return;
    }

    // If selecting free plan and already on free, do nothing
    if (planKey === 'free') {
      if (currentPlan === 'free') {
        showAlert({
          type: 'info',
          title: 'Already on Free Plan',
          message: 'You are already on the Free plan.',
        });
      } else {
        // User wants to downgrade - open customer portal
        try {
          setLoading(plan.name);
          await openCustomerPortal();
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Portal Error',
            message: 'Failed to open subscription management.',
            details: 'Please try again or contact support.',
          });
        } finally {
          setLoading(null);
        }
      }
      return;
    }

    // If already on this plan, open customer portal to manage
    if (planKey === currentPlan) {
      try {
        setLoading(plan.name);
        await openCustomerPortal();
      } catch (error) {
        showAlert({
          type: 'error',
          title: 'Portal Error',
          message: 'Failed to open subscription management.',
          details: 'Please try again or contact support.',
        });
      } finally {
        setLoading(null);
      }
      return;
    }

    // Create checkout session for upgrade
    setLoading(plan.name);
    try {
      const { url } = await createCheckoutSession(planKey, billingCycle === 'annual' ? 'annual' : 'monthly');
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      logger.error('Error creating checkout session', error);
      showAlert({
        type: 'error',
        title: 'Checkout Failed',
        message: 'Failed to start checkout.',
        details: error.message || 'Please try again or contact support if the issue persists.'
      });
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
    <div className="min-h-screen bg-white">
      {/* Background gradients - same as landing page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-teal-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>

      {/* Header */}
      <header className="relative bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
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
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-6 shadow-sm">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-gray-600">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent font-semibold">Simple</span>, transparent pricing
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Choose your{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              perfect plan
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Start your 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-16">
          <div className="relative bg-gray-100 rounded-2xl p-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-white text-gray-900 shadow-lg'
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
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const planKey = plan.name.toLowerCase();
            const isCurrentPlan = currentPlan === planKey;
            const isProfessional = plan.popular;

            return (
              <div
                key={plan.name}
                className={`relative group ${isProfessional ? 'xl:-mt-4 xl:mb-4' : ''}`}
              >
                {/* Glow effect for popular */}
                {isProfessional && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-40 transition-opacity" />
                )}

                <div className={`relative h-full bg-white rounded-3xl border transition-all duration-300 ${
                  isProfessional
                    ? 'border-emerald-200 shadow-2xl'
                    : 'border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300'
                }`}>
                  {/* Popular Badge */}
                  {isProfessional && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg shadow-emerald-500/25">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Plan Header */}
                    <div className="mb-6">
                      <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} items-center justify-center mb-4 shadow-lg ${plan.shadowColor}`}>
                        {plan.name === 'Free' && (
                          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                          </svg>
                        )}
                        {plan.name === 'Starter' && (
                          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {plan.name === 'Professional' && (
                          <FileCheck className="w-7 h-7 text-white" />
                        )}
                        {plan.name === 'Enterprise' && (
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
                            ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent'
                            : 'text-gray-900'
                        }`}>
                          {plan.price === 0 ? 'Free' : `$${getDisplayPrice(plan)}`}
                        </span>
                        {plan.price > 0 && <span className="text-gray-500 text-lg">/month</span>}
                      </div>
                      {billingCycle === 'annual' && plan.price > 0 && (
                        <p className="text-emerald-600 text-sm font-medium mt-2">
                          ${getAnnualPrice(plan.price)}/year (save ${plan.price * 12 - getAnnualPrice(plan.price)})
                        </p>
                      )}
                      {plan.price === 0 && (
                        <p className="text-gray-500 text-sm font-medium mt-2">
                          Free forever
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loading === plan.name || (isCurrentPlan && plan.price === 0 && user)}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                        isCurrentPlan && plan.price === 0 && user
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isCurrentPlan && user
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:-translate-y-0.5'
                            : isProfessional
                              ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5'
                              : 'bg-gray-900 text-white hover:bg-gray-800 hover:-translate-y-0.5'
                      }`}
                    >
                      {loading === plan.name ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : isCurrentPlan && user ? (
                        <span>{plan.price === 0 ? 'Current Plan' : 'Manage Subscription'}</span>
                      ) : plan.price === 0 ? (
                        <span>Get Started Free</span>
                      ) : (
                        <span>{user ? 'Upgrade Now' : 'Start Free Trial'}</span>
                      )}
                    </button>

                    {/* Vendor Count */}
                    <p className="text-center text-sm text-gray-500 mt-4">
                      Up to <span className="font-semibold text-gray-700">{plan.vendors}</span> certificates
                    </p>
                  </div>

                  {/* Features */}
                  <div className="border-t border-gray-100 p-8">
                    <p className="text-sm font-semibold text-gray-900 mb-4">What's included</p>
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
          <div className="relative bg-gray-900 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="relative p-12 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Need more than 500 certificates?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Contact us for custom enterprise pricing with unlimited certificates, SSO, dedicated support, and custom integrations.
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
      <footer className="relative py-16 px-6 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-lg flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Smart<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">COI</span>
              </span>
            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-500">
              &copy; 2025 SmartCOI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Alert Modal */}
      <AlertModal {...alertModal} onClose={hideAlert} />
    </div>
  );
}
