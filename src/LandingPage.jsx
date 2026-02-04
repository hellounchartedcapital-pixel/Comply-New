import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import {
  CheckCircle, Zap, Bell, Menu, X,
  FileCheck, FolderOpen, Users, Check,
  AlertCircle, XCircle, Send, Mail, User, MessageSquare, Loader2,
  Building2, ChevronDown, FileText
} from 'lucide-react';
import { supabase } from './supabaseClient';
import logger from './logger';

// Contact Form Modal
function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-contact', {
        body: {
          name: formData.name,
          email: formData.email,
          message: formData.message
        }
      });

      if (fnError) throw fnError;
      if (data && !data.success) throw new Error(data.error || 'Failed to send message');

      setSent(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      logger.error('Contact form error', err);
      setError('Failed to send message. Please try emailing us directly at contact@smartcoi.io');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Get in Touch</h2>
                <p className="text-emerald-100 text-sm">We'd love to hear from you</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-gray-600 mb-6">
                Thank you for reaching out. We'll get back to you within 24 hours.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Or email us directly at{' '}
                <a href="mailto:contact@smartcoi.io" className="text-emerald-600 hover:underline">
                  contact@smartcoi.io
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Dashboard Mockup Component - Realistic preview of actual dashboard
function DashboardMockup() {
  // Fake data matching the actual dashboard layout
  // 42 total: 35 compliant (83%), 3 non-compliant, 2 expired, 2 expiring
  const stats = { total: 42, compliant: 35, nonCompliant: 3, expired: 2, expiring: 2 };
  const compliancePercent = Math.round((stats.compliant / stats.total) * 100);

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

      {/* App Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-md flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Smart<span className="text-emerald-500">COI</span></span>
          </div>
          {/* Property Selector */}
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 ml-2">
            <Building2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-medium text-gray-700">All Properties</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-3.5 h-3.5 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-1">
          <div className="px-3 py-2 text-[10px] font-semibold text-emerald-600 border-b-2 border-emerald-500 flex items-center gap-1.5">
            <FolderOpen className="w-3 h-3" />
            Dashboard
          </div>
          <div className="px-3 py-2 text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
            <FileCheck className="w-3 h-3" />
            Vendors
          </div>
          <div className="px-3 py-2 text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Tenants
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-3 bg-gray-50">
        {/* Stats Cards Row - 5 columns like actual dashboard */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
            <p className="text-[8px] text-gray-500 font-medium">Total Tracked</p>
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
            <p className="text-[8px] text-gray-500 font-medium">Compliant</p>
            <p className="text-lg font-bold text-emerald-600">{stats.compliant}</p>
          </div>
          <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
            <p className="text-[8px] text-gray-500 font-medium">Expired</p>
            <p className="text-lg font-bold text-red-600">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
            <p className="text-[8px] text-gray-500 font-medium">Non-Compliant</p>
            <p className="text-lg font-bold text-orange-600">{stats.nonCompliant}</p>
          </div>
          <div className="bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
            <p className="text-[8px] text-gray-500 font-medium">Expiring Soon</p>
            <p className="text-lg font-bold text-amber-600">{stats.expiring}</p>
          </div>
        </div>

        {/* Overview Row - Pie Chart & Upcoming Expirations */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Compliance Overview */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-900 mb-2">Overall Compliance</p>
            <div className="flex items-center gap-3">
              {/* Donut Chart */}
              <div className="relative">
                <svg width="70" height="70" viewBox="0 0 70 70" className="transform -rotate-90">
                  <circle cx="35" cy="35" r="26" fill="none" stroke="#10b981" strokeWidth="10"
                    strokeDasharray={`${(stats.compliant / stats.total) * 163.4} 163.4`} strokeDashoffset="0" />
                  <circle cx="35" cy="35" r="26" fill="none" stroke="#f97316" strokeWidth="10"
                    strokeDasharray={`${(stats.nonCompliant / stats.total) * 163.4} 163.4`}
                    strokeDashoffset={`${-(stats.compliant / stats.total) * 163.4}`} />
                  <circle cx="35" cy="35" r="26" fill="none" stroke="#ef4444" strokeWidth="10"
                    strokeDasharray={`${(stats.expired / stats.total) * 163.4} 163.4`}
                    strokeDashoffset={`${-((stats.compliant + stats.nonCompliant) / stats.total) * 163.4}`} />
                  <circle cx="35" cy="35" r="26" fill="none" stroke="#f59e0b" strokeWidth="10"
                    strokeDasharray={`${(stats.expiring / stats.total) * 163.4} 163.4`}
                    strokeDashoffset={`${-((stats.compliant + stats.nonCompliant + stats.expired) / stats.total) * 163.4}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-emerald-500">{compliancePercent}%</span>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[9px] text-gray-700">{stats.compliant} Compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-[9px] text-gray-700">{stats.nonCompliant} Non-Compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-[9px] text-gray-700">{stats.expired} Expired</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-[9px] text-gray-700">{stats.expiring} Expiring</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Expirations */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-900">Upcoming Expirations</p>
              <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Next 30 Days</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                    <FileText className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-gray-900">GreenScape LLC</p>
                    <p className="text-[8px] text-gray-500">Vendor</p>
                  </div>
                </div>
                <span className="text-[8px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">12 days</span>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-100 rounded flex items-center justify-center">
                    <Users className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-gray-900">John Smith</p>
                    <p className="text-[8px] text-gray-500">Tenant • Unit 204</p>
                  </div>
                </div>
                <span className="text-[8px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">3 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Needs Attention Section */}
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-900">Needs Attention</p>
            <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">4 items</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div>
                  <p className="text-[9px] font-medium text-gray-900">Riverside Cleaning Co.</p>
                  <p className="text-[8px] text-red-600">Coverage expired (8 days overdue)</p>
                </div>
              </div>
              <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Vendor</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[9px] font-medium text-gray-900">Sarah Johnson</p>
                  <p className="text-[8px] text-orange-600">GL coverage below requirement</p>
                </div>
              </div>
              <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Tenant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onLogin, onSignUp, onPrivacy, onTerms, onPricing }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

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
      description: "Upload a COI and our AI extracts all policy details, limits, and expiration dates automatically in seconds.",
    },
    {
      icon: FileText,
      title: "Smart Lease Analysis",
      description: "Upload a lease and our AI extracts tenant insurance requirements automatically. No more manual reading of lease agreements.",
    },
    {
      icon: Building2,
      title: "Multi-Property Management",
      description: "Manage vendors and tenants across multiple properties from one dashboard. Set unique requirements per property.",
    },
    {
      icon: Bell,
      title: "Automated Follow-Ups",
      description: "Automatically contact vendors and tenants when certificates expire or coverage is non-compliant. Set custom reminder schedules.",
    },
    {
      icon: CheckCircle,
      title: "Compliance Dashboard",
      description: "See at a glance which vendors and tenants are compliant, expiring soon, or need immediate attention with real-time stats.",
    },
    {
      icon: Users,
      title: "Smart Coverage Analysis",
      description: "Help vendors and tenants understand exactly where their insurance falls short of your requirements.",
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Upload Documents",
      description: "Upload COIs for vendors or leases for tenants. Our AI extracts all policy details and requirements automatically.",
    },
    {
      number: 2,
      title: "Track Compliance",
      description: "View your dashboard with real-time compliance stats across all properties. See who's compliant and who needs attention.",
    },
    {
      number: 3,
      title: "Automate Follow-Ups",
      description: "SmartCOI automatically emails vendors and tenants when certificates expire or coverage falls short.",
    },
  ];

  const pricingTiers = [
    {
      name: "Free",
      price: "Free",
      period: "forever",
      description: "Perfect for getting started",
      vendors: "Up to 10 vendors & tenants",
      features: [
        "AI-powered COI extraction",
        "Smart lease analysis",
        "Compliance dashboard",
        "Expiration alerts",
        "Email COI requests",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Starter",
      price: "$79",
      period: "/month",
      description: "For small property managers",
      vendors: "Up to 25 vendors & tenants",
      features: [
        "Everything in Free",
        "Multi-property management",
        "CSV & PDF export",
        "Automated follow-ups",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$149",
      period: "/month",
      description: "For growing companies",
      vendors: "Up to 100 vendors & tenants",
      features: [
        "Everything in Starter",
        "Activity history & audit log",
        "Custom compliance thresholds",
        "Priority support",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$299",
      period: "/month",
      description: "For large-scale operations",
      vendors: "Up to 500 vendors & tenants",
      features: [
        "Everything in Professional",
        "Unlimited properties",
        "Dedicated support",
        "Custom integrations",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
  ];

  const faqs = [
    {
      question: "How does the AI extraction work?",
      answer: "Simply upload a PDF of any Certificate of Insurance or lease document. Our AI instantly reads and extracts all policy information including coverage limits, expiration dates, and insurance requirements with 99% accuracy.",
    },
    {
      question: "How does lease analysis work for tenants?",
      answer: "Upload your tenant's lease document and SmartCOI automatically extracts all insurance requirements specified in the lease. When the tenant uploads their COI, we compare it against these requirements automatically.",
    },
    {
      question: "Can I manage multiple properties?",
      answer: "Yes! SmartCOI supports multi-property management. Set unique insurance requirements per property, filter your dashboard by property, and track compliance across your entire portfolio from one place.",
    },
    {
      question: "What happens when a vendor or tenant is non-compliant?",
      answer: "SmartCOI automatically identifies compliance gaps and can send follow-up emails explaining exactly what coverage is missing or insufficient. They receive clear, actionable guidance on how to become compliant.",
    },
    {
      question: "Is there really a free plan?",
      answer: "Yes! Our Free plan is free forever and includes up to 10 vendors and tenants with full AI extraction capabilities. No credit card required to get started.",
    },
    {
      question: "How do automated follow-ups work?",
      answer: "Configure SmartCOI to automatically email vendors and tenants when certificates expire or are about to expire. Set custom reminder schedules (30, 14, 7 days before expiration) and let the system handle the follow-ups.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes. All documents are encrypted at rest and in transit. We use enterprise-grade security and never share your data with third parties. Your certificates and leases are stored securely in the cloud.",
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
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
                Track insurance compliance for all your vendors and tenants in one
                dashboard. Get notified before certificates expire and automatically
                follow up with anyone who falls out of compliance. Never chase down
                a COI again.
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
            <div className="animate-fade-in-up animation-delay-300 lg:animate-float flex justify-center lg:justify-end">
              <div className="w-full max-w-md lg:max-w-none">
                <DashboardMockup />
              </div>
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
              <button
                onClick={() => setShowContactModal(true)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Contact
              </button>
            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-500">
              &copy; 2025 SmartCOI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  );
}
