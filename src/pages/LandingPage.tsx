import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, Check,
  Zap, Bell, Users, FileText, Sparkles,
  LayoutDashboard, Truck, ArrowRight,
  Mail, User, MessageSquare, Send, Loader2,
  CheckCircle, AlertCircle, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardPreview } from '@/components/landing/DashboardPreview';

/* ------------------------------------------------------------------ */
/*  Scroll-triggered fade-in hook                                      */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setVisible(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Form Modal (preserved from existing build)                 */
/* ------------------------------------------------------------------ */
function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-contact', {
        body: { name: formData.name, email: formData.email, message: formData.message },
      });
      if (fnError) throw fnError;
      if (data && !(data as { success?: boolean }).success)
        throw new Error((data as { error?: string }).error || 'Failed to send message');

      setSent(true);
      setFormData({ name: '', email: '', message: '' });
    } catch {
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
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Get in Touch</h2>
                <p className="text-emerald-100 text-sm">We&rsquo;d love to hear from you</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-gray-600 mb-6">Thank you for reaching out. We&rsquo;ll get back to you within 24 hours.</p>
              <button onClick={handleClose} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors">
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
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Your name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea required rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none" placeholder="How can we help you?" />
                </div>
              </div>
              <button type="submit" disabled={sending}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Sending...</span></>) : (<><Send className="w-5 h-5" /><span>Send Message</span></>)}
              </button>
              <p className="text-center text-sm text-gray-500">
                Or email us directly at{' '}
                <a href="mailto:contact@smartcoi.io" className="text-emerald-600 hover:underline">contact@smartcoi.io</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#about', label: 'About' },
];

const painPoints = [
  {
    icon: FileText,
    title: 'Manually ensuring compliance is a nightmare',
    description: 'Cross-referencing every COI against your requirements by hand is tedious, error-prone, and eats up hours every week.',
  },
  {
    icon: AlertCircle,
    title: 'Lapsed vendor coverage = massive liability',
    description: 'A single expired vendor certificate can expose property owners to millions in uninsured risk. Manual tracking guarantees blind spots.',
  },
  {
    icon: Users,
    title: 'Tenant COIs are even harder',
    description: 'Insurance requirements are buried in lease language that varies per tenant. Nobody has time to cross-reference every lease against every COI.',
  },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered COI Extraction',
    description: 'Upload a certificate PDF and let AI extract carrier info, coverage types, limits, and expiration dates in seconds — not hours.',
    span: 'lg:col-span-2',
  },
  {
    icon: Truck,
    title: 'Vendor Compliance',
    description: 'Set requirements per building, upload vendor COIs, get instant compliance status. Three ways to set up requirements — building defaults, AI-assisted, or manual.',
    span: '',
  },
  {
    icon: Users,
    title: 'Tenant COI Tracking',
    description: 'Upload a lease and let AI extract insurance requirements automatically. The only platform that handles lease-driven tenant compliance — not just vendors.',
    span: '',
  },
  {
    icon: Bell,
    title: 'Expiration Alerts',
    description: 'Get notified before certificates expire. Automatically email vendors and tenants when coverage lapses so you never get caught with a gap.',
    span: '',
  },
  {
    icon: LayoutDashboard,
    title: 'Real-Time Compliance Dashboard',
    description: 'See your entire portfolio\'s compliance status at a glance. Filter by property, vendor, tenant, or status. Export reports in one click.',
    span: '',
  },
];

const pricingTiers = [
  {
    name: 'Free',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for getting started',
    capacity: 'Up to 10 vendors & tenants',
    features: ['AI-powered COI extraction', 'Smart lease analysis', 'Compliance dashboard', 'Expiration alerts', 'Email COI requests'],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Starter',
    price: '$79',
    period: '/month',
    description: 'For small property managers',
    capacity: 'Up to 50 vendors & tenants',
    features: ['Everything in Free', 'Multi-property management', 'CSV & PDF export', 'Automated follow-ups'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/month',
    description: 'For growing portfolios',
    capacity: 'Up to 100 vendors & tenants',
    features: ['Everything in Starter', 'Activity history & audit log', 'Custom compliance thresholds', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$299',
    period: '/month',
    description: 'For large-scale operations',
    capacity: 'Up to 500 vendors & tenants',
    features: ['Everything in Professional', 'Unlimited properties', 'Custom integrations', 'SSO & advanced security', 'Dedicated account manager'],
    cta: 'Contact Sales',
    popular: false,
  },
];

const faqs = [
  { question: 'How does the AI extraction work?', answer: 'Upload a PDF of any Certificate of Insurance or lease document. Our AI reads and extracts all policy information including coverage limits, expiration dates, and insurance requirements with 99% accuracy.' },
  { question: 'How does lease analysis work for tenants?', answer: 'Upload your tenant\'s lease document and SmartCOI automatically extracts all insurance requirements specified in the lease. When the tenant uploads their COI, we compare it against these requirements automatically.' },
  { question: 'Can I manage multiple properties?', answer: 'Yes! SmartCOI supports multi-property management. Set unique insurance requirements per property, filter your dashboard by property, and track compliance across your entire portfolio from one place.' },
  { question: 'What happens when a vendor or tenant is non-compliant?', answer: 'SmartCOI identifies compliance gaps and can send follow-up emails explaining exactly what coverage is missing or insufficient. They receive clear, actionable guidance on becoming compliant.' },
  { question: 'Is there really a free plan?', answer: 'Yes! Our Free plan is free forever and includes up to 10 vendors and tenants with full AI extraction capabilities. No credit card required to get started.' },
  { question: 'Is my data secure?', answer: 'All documents are encrypted at rest and in transit. We use enterprise-grade security and never share your data with third parties. Your certificates and leases are stored securely in the cloud.' },
];

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goToLogin = () => navigate('/login');
  const goToSignup = () => navigate('/login');

  const smoothScroll = (href: string) => {
    setIsMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans">
      {/* ============================================================ */}
      {/*  1. NAVBAR                                                    */}
      {/* ============================================================ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200/80 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[72px]">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img src="/logo-icon.svg" alt="SmartCOI" className="h-9 w-9" />
              <span className="text-xl font-bold text-gray-900">
                Smart<span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">COI</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => smoothScroll(link.href)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/60 transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={goToLogin}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Login
              </button>
              <button
                onClick={goToSignup}
                className="h-10 px-5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all duration-200"
              >
                Get Started
              </button>
            </div>

            {/* Mobile hamburger */}
            <button className="md:hidden p-2 text-gray-700" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-gray-100 pt-3">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => smoothScroll(link.href)}
                    className="text-left px-3 py-2.5 text-gray-600 font-medium hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => { goToLogin(); setIsMobileMenuOpen(false); }}
                  className="text-left px-3 py-2.5 text-gray-600 font-medium hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => { goToSignup(); setIsMobileMenuOpen(false); }}
                  className="mt-2 w-full h-11 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  2. HERO SECTION                                              */}
      {/* ============================================================ */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-gradient-to-bl from-emerald-500/8 via-teal-400/5 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-teal-500/8 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-emerald-400/5 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <FadeIn>
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-full px-4 py-2 mb-6 shadow-sm">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent font-semibold">AI-Powered</span> COI Tracking
                  </span>
                </div>
              </FadeIn>

              <FadeIn delay={0.05}>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 text-gray-900">
                  Stop wasting hours on{' '}
                  <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">COI compliance</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.1}>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                  Track insurance compliance for all your vendors and tenants in one
                  dashboard. Get notified before certificates expire and automatically
                  follow up with anyone who falls out of compliance.
                </p>
              </FadeIn>

              <FadeIn delay={0.15}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                  <button
                    onClick={goToSignup}
                    className="group h-12 px-8 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="h-12 px-8 bg-white text-gray-900 border-2 border-gray-200 rounded-xl font-semibold text-base hover:border-emerald-400 hover:text-emerald-600 transition-all duration-200"
                  >
                    Book a Demo
                  </button>
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="flex flex-wrap gap-x-8 gap-y-3 justify-center lg:justify-start">
                  <div className="flex flex-col">
                    <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">99%</span>
                    <span className="text-sm text-gray-500">Extraction accuracy</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">10+ hrs</span>
                    <span className="text-sm text-gray-500">Saved per week</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">30 sec</span>
                    <span className="text-sm text-gray-500">Per COI extraction</span>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Dashboard Preview */}
            <FadeIn delay={0.15} className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md lg:max-w-[580px] xl:max-w-[640px]">
                <DashboardPreview />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  3. PROBLEM SECTION                                           */}
      {/* ============================================================ */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-gray-50/80">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">The problem</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                COI tracking is broken
              </h2>
              <p className="text-lg text-gray-600">
                Property managers spend hours every week chasing down certificates, cross-referencing spreadsheets, and hoping nothing slips through the cracks.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {painPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="bg-white rounded-2xl p-7 border border-gray-200/80 shadow-sm h-full">
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{point.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{point.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  4. FEATURES — BENTO GRID                                     */}
      {/* ============================================================ */}
      <section id="features" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Features</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                Everything you need to manage COIs
              </h2>
              <p className="text-lg text-gray-600">
                Powerful tools designed specifically for property managers who are tired of manual compliance tracking.
              </p>
            </div>
          </FadeIn>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <FadeIn
                  key={i}
                  delay={i * 0.08}
                  className={feature.span}
                >
                  <div className="group relative bg-gray-50 hover:bg-white rounded-2xl p-8 border border-gray-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-300/80 h-full">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5. PRICING SECTION                                           */}
      {/* ============================================================ */}
      <section id="pricing" className="py-20 sm:py-24 px-4 sm:px-6 bg-gray-50/80">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Pricing</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-gray-600">Start free, upgrade as you grow. No hidden fees.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start">
            {pricingTiers.map((tier, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div
                  className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                    tier.popular
                      ? 'border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 md:scale-[1.03]'
                      : 'border border-gray-200 shadow-lg'
                  }`}
                >
                  {tier.popular && (
                    <div className="h-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" />
                  )}

                  <div className="p-7">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                      {tier.popular && (
                        <span className="text-[11px] font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-5">{tier.description}</p>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-4xl font-extrabold ${tier.popular ? 'bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent' : 'text-gray-900'}`}>
                        {tier.price}
                      </span>
                      {tier.period && <span className="text-gray-500 text-sm">{tier.period}</span>}
                    </div>
                    <p className="text-sm text-emerald-600 font-semibold mb-6">{tier.capacity}</p>

                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={tier.cta === 'Contact Sales' ? () => setShowContactModal(true) : goToSignup}
                      className={`w-full h-12 rounded-xl font-semibold transition-all duration-200 ${
                        tier.popular
                          ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 hover:-translate-y-0.5'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {tier.cta}
                    </button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ SECTION (About)                                          */}
      {/* ============================================================ */}
      <section id="about" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">FAQ</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
                Frequently asked questions
              </h2>
              <p className="text-lg text-gray-600">Everything you need to know about SmartCOI.</p>
            </div>
          </FadeIn>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div
                  className="bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-200/80 transition-all duration-200 overflow-hidden cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenFaq(openFaq === i ? null : i); }}
                >
                  <div className="flex items-center justify-between p-6">
                    <h3 className="text-base font-semibold text-gray-900 pr-4">{faq.question}</h3>
                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </div>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: openFaq === i ? 200 : 0,
                      opacity: openFaq === i ? 1 : 0,
                    }}
                  >
                    <p className="px-6 pb-6 text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. CTA SECTION                                               */}
      {/* ============================================================ */}
      <section className="relative py-24 sm:py-28 px-4 sm:px-6 overflow-hidden" style={{ backgroundColor: 'hsl(222, 47%, 11%)' }}>
        {/* Subtle gradient orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <FadeIn>
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5">
              Stop chasing certificates.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Start tracking compliance.</span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join property managers who have already saved thousands of hours with SmartCOI. Get started in under two minutes.
            </p>
            <button
              onClick={goToSignup}
              className="group h-14 px-10 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 inline-flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-sm text-gray-500 mt-4">No credit card required</p>
          </div>
        </FadeIn>
      </section>

      {/* ============================================================ */}
      {/*  7. FOOTER                                                    */}
      {/* ============================================================ */}
      <footer className="py-16 px-4 sm:px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo-icon.svg" alt="SmartCOI" className="h-8 w-8" />
                <span className="text-lg font-bold text-white">
                  Smart<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">COI</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                AI-powered COI compliance tracking for commercial property managers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><button onClick={() => smoothScroll('#features')} className="text-sm text-gray-500 hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => smoothScroll('#pricing')} className="text-sm text-gray-500 hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={goToLogin} className="text-sm text-gray-500 hover:text-white transition-colors">Dashboard</button></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><button onClick={() => smoothScroll('#about')} className="text-sm text-gray-500 hover:text-white transition-colors">About</button></li>
                <li><button onClick={() => setShowContactModal(true)} className="text-sm text-gray-500 hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {/* UPDATE: Replace # with real URLs when privacy/terms pages exist */}
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} SmartCOI. All rights reserved.
            </p>
            <a href="mailto:contact@smartcoi.io" className="text-sm text-gray-600 hover:text-white transition-colors">
              contact@smartcoi.io
            </a>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
}
