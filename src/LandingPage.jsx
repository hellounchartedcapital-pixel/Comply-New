import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import {
  CheckCircle, Zap, Bell, Menu, X,
  FileCheck, FolderOpen, Cloud, Users, Check,
  AlertCircle, XCircle, Calendar, Send, Mail, User, MessageSquare, Loader2,
  Building2, ChevronDown, Upload, Search, FileText
} from 'lucide-react';
import { supabase } from './supabaseClient';

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
      console.error('Contact form error:', err);
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
  // 35 total: 28 compliant (80%), 4 non-compliant, 2 expired, 1 expiring
  const stats = { total: 35, compliant: 28, nonCompliant: 4, expired: 2, expiring: 1 };
  const compliancePercent = Math.round((stats.compliant / stats.total) * 100);

  const vendors = [
    {
      name: "Riverside Cleaning Co.",
      dba: "Riverside Services",
      status: "expired",
      expDate: "9/25/2025",
      daysInfo: "126 days",
      gl: "$1,000,000",
      auto: "$1,000,000",
      wc: "Statutory",
      issue: "Coverage expired 2025-09-25 (126 days overdue)"
    },
    {
      name: "Summit HVAC Solutions",
      status: "compliant",
      expDate: "10/2/2026",
      gl: "$1,000,000",
      auto: "$3,000,000",
      wc: "Statutory"
    },
    {
      name: "GreenScape Landscaping LLC",
      dba: "GreenScape Services",
      status: "compliant",
      expDate: "3/1/2026",
      gl: "$1,000,000",
      auto: "$1,000,000",
      wc: "Statutory"
    },
  ];

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
          <button className="px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Upload COI
          </button>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-3 bg-gray-50">
        {/* Overview Row - Pie Chart & Upcoming Expirations */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Compliance Overview */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <p className="text-xs font-bold text-gray-900 mb-3">Compliance Overview</p>
            <div className="flex items-center gap-4">
              {/* Donut Chart */}
              <div className="relative">
                <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  {/* Compliant (green) */}
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#10b981" strokeWidth="12"
                    strokeDasharray={`${(stats.compliant / stats.total) * 188.5} 188.5`} strokeDashoffset="0" />
                  {/* Non-compliant (orange) */}
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#f97316" strokeWidth="12"
                    strokeDasharray={`${(stats.nonCompliant / stats.total) * 188.5} 188.5`}
                    strokeDashoffset={`${-(stats.compliant / stats.total) * 188.5}`} />
                  {/* Expired (red) */}
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#ef4444" strokeWidth="12"
                    strokeDasharray={`${(stats.expired / stats.total) * 188.5} 188.5`}
                    strokeDashoffset={`${-((stats.compliant + stats.nonCompliant) / stats.total) * 188.5}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-emerald-500">{compliancePercent}%</span>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-900">{stats.compliant} Compliant</span>
                    <span className="text-[9px] text-gray-500 ml-1">{Math.round((stats.compliant/stats.total)*100)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-900">{stats.nonCompliant} Non-Compliant</span>
                    <span className="text-[9px] text-gray-500 ml-1">{Math.round((stats.nonCompliant/stats.total)*100)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-900">{stats.expired} Expired</span>
                    <span className="text-[9px] text-gray-500 ml-1">{Math.round((stats.expired/stats.total)*100)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-900">{stats.expiring} Expiring Soon</span>
                    <span className="text-[9px] text-gray-500 ml-1">0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Expirations */}
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-900">Upcoming Expirations</p>
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Next 30 Days</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-[10px] font-medium text-gray-900">GreenScape Landsca...</p>
                  <p className="text-[9px] text-gray-500">3/1/2026</p>
                </div>
                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">30 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-xl p-2.5 border-2 border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-500 font-medium">Total Vendors</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-500 font-medium">Expired</p>
              <p className="text-xl font-bold text-red-500">{stats.expired}</p>
            </div>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-500 font-medium">Non-Compliant</p>
              <p className="text-xl font-bold text-orange-500">{stats.nonCompliant}</p>
            </div>
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[9px] text-gray-500 font-medium">Compliant</p>
              <p className="text-xl font-bold text-emerald-500">{stats.compliant}</p>
            </div>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <div className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-[10px] text-gray-400">
              Search vendors...
            </div>
          </div>
          <button className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-[9px] font-semibold">Export PDF</button>
          <button className="px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[9px] font-semibold">Export CSV</button>
        </div>
        <p className="text-[9px] text-gray-500 mb-2">Showing {stats.total} of {stats.total} vendors</p>

        {/* Vendor List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {vendors.map((vendor, index) => (
            <div key={index} className={`p-3 ${index !== vendors.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="mt-0.5">
                    {vendor.status === 'compliant' && <CheckCircle className="text-emerald-500" size={16} />}
                    {vendor.status === 'expired' && <XCircle className="text-red-500" size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-gray-900">{vendor.name}</span>
                      {vendor.dba && <span className="text-[11px] text-gray-500">/ {vendor.dba}</span>}
                      {vendor.status === 'expired' && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">
                          Expired ({vendor.daysInfo})
                        </span>
                      )}
                      {vendor.status === 'compliant' && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          COMPLIANT
                        </span>
                      )}
                    </div>
                    {vendor.issue && (
                      <p className="text-[9px] text-red-600 mb-1 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {vendor.issue}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[9px] text-gray-500">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">GL: {vendor.gl}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">Auto: {vendor.auto}</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">WC: {vendor.wc}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0 space-y-1">
                  <div className="text-[9px] text-gray-500 flex items-center gap-1 justify-end">
                    <Calendar size={9} />
                    {vendor.expDate}
                  </div>
                  <div className="text-[9px] space-x-1">
                    <span className="text-gray-500 hover:text-gray-700 cursor-pointer">Edit</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-red-500 hover:text-red-600 cursor-pointer">Delete</span>
                  </div>
                  <div className="text-[9px] text-emerald-600 hover:text-emerald-700 cursor-pointer">View Details</div>
                  {vendor.status === 'expired' && (
                    <button className="text-[8px] bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1 ml-auto">
                      <Mail size={8} />
                      Request COI
                    </button>
                  )}
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
      name: "Free",
      price: "Free",
      period: "forever",
      description: "Perfect for getting started",
      vendors: "Up to 10 vendors",
      features: [
        "AI-powered COI extraction",
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
      vendors: "Up to 25 vendors",
      features: [
        "Everything in Free",
        "CSV export",
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
      vendors: "Up to 100 vendors",
      features: [
        "Everything in Starter",
        "Analytics & reports",
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
      vendors: "Up to 500 vendors",
      features: [
        "Everything in Professional",
        "API access",
        "Dedicated support",
      ],
      cta: "Start Free Trial",
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
      answer: "Yes! Our Free plan is free forever and includes up to 10 vendors with full AI extraction capabilities. No credit card required to get started.",
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
