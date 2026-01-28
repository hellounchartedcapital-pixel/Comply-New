import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import {
  CheckCircle, Zap, Bell, Menu, X,
  FileCheck, FolderOpen, Cloud, Users, Check,
  AlertCircle, XCircle, Calendar
} from 'lucide-react';

// Dashboard Mockup Component - Realistic preview of actual dashboard
function DashboardMockup() {
  // Fake vendor data for the mockup
  const stats = { total: 58, compliant: 47, nonCompliant: 5, expired: 3, expiring: 3 };

  const upcomingExpirations = [
    { name: "Pro Electric LLC", date: "Feb 12, 2025", days: 14 },
    { name: "Swift Plumbing Co.", date: "Feb 18, 2025", days: 20 },
    { name: "Green Lawn Care", date: "Feb 25, 2025", days: 27 },
  ];

  const vendors = [
    {
      name: "ABC Cleaning Services",
      status: "compliant",
      expDate: "08/15/2025",
      gl: "$1,000,000",
      auto: "$1,000,000",
      wc: "Statutory",
      issues: []
    },
    {
      name: "Pro Electric LLC",
      status: "expiring",
      expDate: "02/12/2025",
      gl: "$2,000,000",
      auto: "$1,000,000",
      wc: "Statutory",
      issues: []
    },
    {
      name: "Metro HVAC Inc.",
      status: "expired",
      expDate: "01/15/2025",
      gl: "$1,000,000",
      auto: "$500,000",
      wc: "Statutory",
      issues: ["Policy expired 13 days ago"]
    },
    {
      name: "SafeGuard Security",
      status: "non-compliant",
      expDate: "06/30/2025",
      gl: "$500,000",
      auto: "$500,000",
      wc: "Statutory",
      issues: ["GL below minimum ($1M required)"]
    },
  ];

  const statusConfig = {
    compliant: { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "text-emerald-500" },
    expiring: { badge: "bg-amber-100 text-amber-700 border-amber-200", icon: "text-amber-500" },
    expired: { badge: "bg-red-100 text-red-700 border-red-200", icon: "text-red-500" },
    "non-compliant": { badge: "bg-orange-100 text-orange-700 border-orange-200", icon: "text-orange-500" },
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Browser chrome */}
      <div className="bg-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <div className="ml-4 flex-1 bg-white rounded-lg px-3 py-1.5 text-xs text-gray-400 border border-gray-200">
            app.smartcoi.io/dashboard
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-4 bg-gray-50">
        {/* Overview Row - Pie Chart & Upcoming */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Mini Pie Chart */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-900 mb-2">Compliance Overview</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg width="60" height="60" viewBox="0 0 60 60" className="transform -rotate-90">
                  <circle cx="30" cy="30" r="22" fill="none" stroke="#10b981" strokeWidth="8"
                    strokeDasharray={`${(stats.compliant / stats.total) * 138.23} 138.23`} strokeDashoffset="0" />
                  <circle cx="30" cy="30" r="22" fill="none" stroke="#f97316" strokeWidth="8"
                    strokeDasharray={`${(stats.nonCompliant / stats.total) * 138.23} 138.23`}
                    strokeDashoffset={`${-(stats.compliant / stats.total) * 138.23}`} />
                  <circle cx="30" cy="30" r="22" fill="none" stroke="#ef4444" strokeWidth="8"
                    strokeDasharray={`${(stats.expired / stats.total) * 138.23} 138.23`}
                    strokeDashoffset={`${-((stats.compliant + stats.nonCompliant) / stats.total) * 138.23}`} />
                  <circle cx="30" cy="30" r="22" fill="none" stroke="#f59e0b" strokeWidth="8"
                    strokeDasharray={`${(stats.expiring / stats.total) * 138.23} 138.23`}
                    strokeDashoffset={`${-((stats.compliant + stats.nonCompliant + stats.expired) / stats.total) * 138.23}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">{stats.total}</span>
                </div>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600">{stats.compliant} Compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-gray-600">{stats.nonCompliant} Non-Compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">{stats.expired} Expired</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Expirations */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-900">Upcoming Expirations</p>
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">30 Days</span>
            </div>
            <div className="space-y-1.5">
              {upcomingExpirations.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.days <= 14 ? 'bg-amber-500' : 'bg-yellow-400'}`}></div>
                    <span className="text-[10px] font-medium text-gray-900 truncate max-w-[80px]">{item.name}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.days <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{item.days}d</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm">
            <p className="text-[9px] text-gray-500 font-medium">Total</p>
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm">
            <p className="text-[9px] text-gray-500 font-medium">Expired</p>
            <p className="text-lg font-bold text-red-600">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm">
            <p className="text-[9px] text-gray-500 font-medium">Non-Compliant</p>
            <p className="text-lg font-bold text-orange-600">{stats.nonCompliant}</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm">
            <p className="text-[9px] text-gray-500 font-medium">Compliant</p>
            <p className="text-lg font-bold text-emerald-600">{stats.compliant}</p>
          </div>
        </div>

        {/* Vendor List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {vendors.map((vendor, index) => (
            <div key={index} className={`p-3 ${index !== vendors.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="mt-0.5">
                    {vendor.status === 'compliant' && (
                      <CheckCircle className="text-emerald-500" size={14} />
                    )}
                    {vendor.status === 'expiring' && (
                      <AlertCircle className="text-amber-500" size={14} />
                    )}
                    {vendor.status === 'expired' && (
                      <XCircle className="text-red-500" size={14} />
                    )}
                    {vendor.status === 'non-compliant' && (
                      <AlertCircle className="text-orange-500" size={14} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900 truncate">{vendor.name}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${statusConfig[vendor.status].badge}`}>
                        {vendor.status.toUpperCase().replace('-', ' ')}
                      </span>
                    </div>
                    {vendor.issues.length > 0 && (
                      <p className="text-[9px] text-red-600 mb-1 flex items-center gap-1">
                        <AlertCircle size={9} />
                        {vendor.issues[0]}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[9px] text-gray-500">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">GL: {vendor.gl}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">Auto: {vendor.auto}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">WC: {vendor.wc}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Calendar size={9} />
                    {vendor.expDate}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onLogin, onSignUp, onPrivacy, onTerms }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  const stats = [
    { value: "99%", label: "Accuracy rate" },
    { value: "10+ hrs", label: "Saved per week" },
  ];

  const features = [
    {
      icon: Zap,
      title: "Instant AI Extraction",
      description: "Upload a COI and our AI extracts all policy details, limits, and expiration dates automatically.",
    },
    {
      icon: Bell,
      title: "Automated Follow-Ups",
      description: "Our system automatically contacts vendors when certificates are expired or non-compliant, so you don't have to chase them down.",
    },
    {
      icon: CheckCircle,
      title: "Compliance Tracking",
      description: "See at a glance which vendors are compliant, expiring soon, or need immediate attention. Vendors receive clear guidance on what's missing.",
    },
    {
      icon: FolderOpen,
      title: "Vendor Management",
      description: "Organize all your vendors and their insurance documents in one central, searchable database.",
    },
    {
      icon: Cloud,
      title: "Cloud Storage",
      description: "All certificates securely stored in the cloud. Access from anywhere, share with your team instantly.",
    },
    {
      icon: Users,
      title: "Smart Coverage Analysis",
      description: "Help vendors understand exactly where their insurance falls short of your requirements with detailed compliance reports.",
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Upload Your COI",
      description: "Drag and drop any COI document. We support PDF, JPG, and PNG formats.",
    },
    {
      number: 2,
      title: "AI Extracts Data",
      description: "Our AI reads the certificate and extracts all relevant policy information automatically.",
    },
    {
      number: 3,
      title: "Track & Monitor",
      description: "View your compliance dashboard and receive alerts before certificates expire.",
    },
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for getting started",
      vendors: "Up to 10 vendors",
      features: [
        "AI-powered data extraction",
        "Expiration alerts",
        "Compliance tracking",
        "Cloud document storage",
        "Email support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Basic",
      price: "$29",
      period: "/month",
      description: "For small teams",
      vendors: "Up to 25 vendors",
      features: [
        "Everything in Starter",
        "Automated vendor follow-ups",
        "Custom compliance requirements",
        "PDF & CSV exports",
        "Email support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "For growing businesses",
      vendors: "Up to 50 vendors",
      features: [
        "Everything in Basic",
        "Priority email support",
        "Advanced reporting",
      ],
      cta: "Get Started Free",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      description: "For large operations",
      vendors: "100+ vendors",
      features: [
        "Everything in Professional",
        "Unlimited vendors",
        "Team collaboration",
        "Advanced analytics",
        "Dedicated support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "How does the AI extraction work?",
      answer: "Simply upload a PDF, JPG, or PNG of any Certificate of Insurance. Our AI instantly reads and extracts all policy information including coverage limits, expiration dates, and named insureds with 99% accuracy.",
    },
    {
      question: "What happens when a vendor is non-compliant?",
      answer: "SmartCOI automatically identifies compliance gaps and can send follow-up emails to vendors explaining exactly what coverage is missing or insufficient. Vendors receive clear, actionable guidance.",
    },
    {
      question: "Is there really a free plan?",
      answer: "Yes! Our Starter plan is free forever and includes up to 10 vendors with full AI extraction capabilities. No credit card required to get started.",
    },
    {
      question: "How do expiration alerts work?",
      answer: "You'll receive automatic email notifications 30, 14, and 7 days before any certificate expires. You can also customize alert timing in your notification settings.",
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer: "Absolutely. You can change your plan at any time. When upgrading, you'll get immediate access to additional features. When downgrading, changes take effect at the end of your billing cycle.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes. All documents are encrypted at rest and in transit. We use enterprise-grade security and never share your data with third parties. Your certificates are stored securely in the cloud.",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm"
          : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Logo size="default" />

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={onLogin}
                className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={onSignUp}
                className="h-11 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/45 transition-all duration-200"
              >
                Get Started Free
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-900"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 animate-fade-in">
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-gray-600 font-medium hover:text-gray-900 transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <button
                  onClick={() => { onLogin(); setIsMobileMenuOpen(false); }}
                  className="text-gray-600 font-medium hover:text-gray-900 transition-colors py-2 text-left"
                >
                  Log In
                </button>
                <button
                  onClick={() => { onSignUp(); setIsMobileMenuOpen(false); }}
                  className="w-full h-11 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold mt-2"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-teal-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        {/* Hero gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50 -z-10" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-6 shadow-sm animate-fade-in-up">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-600">
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent font-semibold">AI-Powered</span> COI Tracking
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 animate-fade-in-up animation-delay-100">
                Stop wasting hours on{" "}
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">COI compliance</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 animate-fade-in-up animation-delay-200">
                SmartCOI uses artificial intelligence to extract insurance data from
                certificates in seconds. Automatically follow up with non-compliant vendors
                and help them understand exactly what coverage they need.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-fade-in-up animation-delay-300">
                <button
                  onClick={onSignUp}
                  className="h-12 px-8 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold text-base shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/45 transition-all duration-200"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="h-12 px-8 bg-white text-gray-900 border-2 border-gray-200 rounded-lg font-semibold text-base hover:border-emerald-500 hover:text-emerald-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  How It Works
                </button>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 justify-center lg:justify-start animate-fade-in-up animation-delay-400">
                {stats.map((stat, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                      {stat.value}
                    </span>
                    <span className="text-sm text-gray-500">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="animate-fade-in-up animation-delay-300 lg:animate-float">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-4">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Everything you need to manage COIs
            </h2>
            <p className="text-lg text-gray-600">
              Powerful tools designed specifically for property managers who are tired
              of manual data entry.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-gray-50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              From PDF to compliant in seconds
            </h2>
            <p className="text-lg text-gray-400">
              Three simple steps to eliminate manual COI data entry forever.
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid md:grid-cols-3 gap-8 md:gap-12">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" />

            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                {/* Step number */}
                <div className="relative z-10 w-20 h-20 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-gray-900">
                  <span className="text-3xl font-extrabold text-white">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-4">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade as you grow. No hidden fees.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-2xl p-6 shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 max-w-sm mx-auto md:max-w-none w-full ${
                  tier.popular ? 'border-2 border-emerald-500 shadow-2xl' : 'border border-gray-200'
                }`}
              >
                {/* Top gradient bar */}
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" />
                )}

                {/* Badge */}
                {tier.popular && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {tier.name}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-4xl font-extrabold ${tier.popular ? 'bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                    {tier.price}
                  </span>
                  <span className="text-gray-500 text-sm">{tier.period}</span>
                </div>
                <p className="text-sm text-emerald-600 font-semibold mb-6">
                  {tier.vendors}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={onSignUp}
                  className={`w-full h-12 rounded-lg font-semibold transition-all duration-200 ${
                    tier.popular
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-4">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about SmartCOI
            </p>
          </div>

          {/* FAQ items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[200%] bg-gradient-radial from-white/10 to-transparent" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
            Ready to automate your COI management?
          </h2>
          <p className="text-lg sm:text-xl text-white/90 mb-8">
            Join hundreds of property managers who have already saved thousands of
            hours with SmartCOI. Get started free today.
          </p>
          <button
            onClick={onSignUp}
            className="h-14 px-10 bg-white text-emerald-600 rounded-lg font-semibold text-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-gray-900">
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

            {/* Links */}
            <div className="flex items-center gap-8">
              <button
                onClick={onPrivacy}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Privacy
              </button>
              <button
                onClick={onTerms}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Terms
              </button>
              <a
                href="mailto:support@smartcoi.io"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-500">
              &copy; 2025 SmartCOI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
