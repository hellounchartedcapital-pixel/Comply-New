import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, Check,
  Mail, User, MessageSquare, Send, Loader2,
  CheckCircle, AlertCircle, ChevronDown,
  Sparkles, Clock, FileText, Link2, Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardPreview } from '@/components/landing/DashboardPreview';

/* ------------------------------------------------------------------ */
/*  Design tokens (scoped to landing page)                              */
/* ------------------------------------------------------------------ */
const C = {
  green: '#73E2A7',
  greenDark: '#5CC98E',
  greenDim: 'rgba(115, 226, 167, 0.10)',
  greenBorder: 'rgba(115, 226, 167, 0.20)',
  bg: '#FFFFFF',
  bgSection: '#F8F9FB',
  bgCard: '#FFFFFF',
  border: '#EBEBEF',
  borderLight: '#F0F0F4',
  text: '#111114',
  textSecondary: '#6B6B76',
  textTertiary: '#9D9DA7',
  radius: 14,
  radiusSm: 10,
  radiusXs: 8,
  shadowSm: '0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.05)',
  shadowLg: '0 12px 48px rgba(0,0,0,0.07)',
};

const FONT = "'DM Sans', sans-serif";
const FONT_MONO = "'Space Mono', monospace";

/* ------------------------------------------------------------------ */
/*  Scroll-triggered fade-in                                            */
/* ------------------------------------------------------------------ */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setVisible(true); },
      { threshold, rootMargin: '0px 0px -40px 0px' }
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
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Modal (preserved from existing build)                       */
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

  const handleClose = () => { setSent(false); setError(null); onClose(); };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%', boxShadow: C.shadowLg, overflow: 'hidden' }}>
        <div style={{ background: C.text, padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Get in Touch</h2>
              <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>We&rsquo;d love to hear from you</p>
            </div>
          </div>
          <button onClick={handleClose} style={{ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.greenDim, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} color={C.greenDark} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Message Sent!</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 24 }}>Thank you for reaching out. We&rsquo;ll get back to you within 24 hours.</p>
              <button onClick={handleClose} style={{ padding: '10px 24px', background: C.text, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ padding: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'start' }}>
                  <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#B91C1C', margin: 0 }}>{error}</p>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color={C.textTertiary} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    style={{ width: '100%', padding: '10px 12px 10px 40px', border: `1px solid ${C.border}`, borderRadius: C.radiusSm, fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color={C.textTertiary} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '10px 12px 10px 40px', border: `1px solid ${C.border}`, borderRadius: C.radiusSm, fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>Message</label>
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={18} color={C.textTertiary} style={{ position: 'absolute', left: 12, top: 12 }} />
                  <textarea required rows={4} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="How can we help you?"
                    style={{ width: '100%', padding: '10px 12px 10px 40px', border: `1px solid ${C.border}`, borderRadius: C.radiusSm, fontSize: 14, fontFamily: FONT, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <button type="submit" disabled={sending}
                style={{ width: '100%', padding: '12px 0', background: C.text, color: '#fff', border: 'none', borderRadius: C.radiusSm, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontFamily: FONT, opacity: sending ? 0.6 : 1 }}>
                {sending ? <><Loader2 size={18} className="animate-spin" /><span>Sending...</span></> : <><Send size={18} /><span>Send Message</span></>}
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: C.textSecondary }}>
                Or email us directly at <a href="mailto:contact@smartcoi.io" style={{ color: C.greenDark }}>contact@smartcoi.io</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Label                                                       */
/* ------------------------------------------------------------------ */
function SectionLabel({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: FONT_MONO, fontSize: 12, fontWeight: 400, textTransform: 'uppercase' as const,
      letterSpacing: '0.1em', color: C.greenDark,
    }}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature icons (minimalistic SVG strokes)                            */
/* ------------------------------------------------------------------ */
const featureIcons = [Sparkles, Send, Link2, FileText, Clock, Building2];

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */
const features = [
  {
    title: 'AI-Powered Extraction',
    description: 'Drop a COI PDF. Our AI reads the document, extracts every coverage type, limit, expiration date, and named insured — and checks compliance in seconds.',
  },
  {
    title: 'Automated Follow-Up',
    description: 'Non-compliant or expiring? SmartCOI emails the vendor or tenant automatically with a link to upload their updated COI. Follow-ups until resolved.',
  },
  {
    title: 'Self-Service Portal',
    description: 'Vendors and tenants click one link, upload their certificate, and get instant feedback. Compliant? Done. Issues? They see exactly what to fix.',
  },
  {
    title: 'Tenant Lease Extraction',
    description: 'Upload a lease and SmartCOI extracts the specific insurance requirements — coverage types, limits, named insured. No more reading 50-page leases.',
  },
  {
    title: 'Expiration Tracking',
    description: 'Automatic alerts at 30 days, 7 days, and on expiration. Your vendors and tenants get reminded. You get notified. Nothing slips through.',
  },
  {
    title: 'Multi-Property Support',
    description: 'Manage certificates across your entire portfolio from one dashboard. Each property has its own requirements, vendors, and tenants.',
  },
];

const steps = [
  { num: '01', title: 'Add your property', desc: 'Enter your property details and the names that should appear as Additional Insured and Certificate Holder on every COI.' },
  { num: '02', title: 'Upload certificates', desc: 'Drop a vendor COI or tenant lease. AI extracts the data, checks compliance, and flags any issues — instantly.' },
  { num: '03', title: 'Let SmartCOI handle it', desc: 'Non-compliant? Expiring? SmartCOI emails them automatically with a link to upload their updated certificate.' },
];

const pricingTiers = [
  {
    name: 'Free', price: '$0', period: 'forever',
    certs: 'Up to 25 certificates', cta: 'Get started', popular: false,
    features: ['AI certificate extraction', 'Compliance checking', 'Automated email follow-ups', 'Self-service upload portal', 'Tenant lease extraction'],
  },
  {
    name: 'Starter', price: '$79', period: '/month',
    certs: 'Up to 50 certificates', cta: 'Start free trial', popular: false,
    features: ['Everything in Free', 'Expiration tracking & alerts', 'Multi-property support', 'Priority support'],
  },
  {
    name: 'Professional', price: '$149', period: '/month',
    certs: 'Up to 150 certificates', cta: 'Start free trial', popular: true,
    features: ['Everything in Starter', 'Unlimited properties', 'Advanced compliance reports', 'Team access'],
  },
  {
    name: 'Enterprise', price: '$299', period: '/month',
    certs: 'Unlimited certificates', cta: 'Get in touch', popular: false,
    features: ['Everything in Professional', 'Dedicated account manager', 'Custom integrations', 'SLA & onboarding'],
  },
];

const problemCards = [
  { number: '10+', line1: 'hours/week spent on manual', line2: 'COI tracking and follow-ups' },
  { number: '73%', line1: 'of certificates have at least one', line2: 'compliance issue on first submission' },
  { number: '1', line1: 'missed expiration is all it takes', line2: 'to create serious liability exposure' },
];

const faqs = [
  { q: 'What types of documents can SmartCOI read?', a: 'SmartCOI\u2019s AI extracts data from standard ACORD certificate of insurance PDFs as well as tenant lease agreements. It reads coverage types, limits, expiration dates, named insured parties, and endorsement requirements like additional insured and waiver of subrogation.' },
  { q: 'How is SmartCOI different from other COI trackers?', a: 'Most COI trackers only check vendor certificates against standardized building requirements. SmartCOI also extracts insurance requirements directly from tenant lease PDFs \u2014 so you can check tenant COIs against the specific terms in their lease. No other platform does this.' },
  { q: 'Do my vendors or tenants need an account?', a: 'No. When a certificate needs updating, SmartCOI sends an email with a unique upload link. They click it, upload their COI, and get instant feedback on compliance \u2014 no login, no account creation, no friction.' },
  { q: 'How long does setup take?', a: 'Under 5 minutes. Add your property, set your requirements (or upload a lease and let AI do it), and start uploading certificates. You\u2019ll see compliance results immediately.' },
  { q: 'What happens when a certificate expires?', a: 'SmartCOI sends automatic reminders at 30 days, 7 days, and on expiration. Vendors and tenants receive an email with a link to upload their renewed certificate. Follow-ups continue until the updated certificate is submitted.' },
  { q: 'Can I try SmartCOI for free?', a: 'Yes. The Free plan supports up to 25 certificates with all features included \u2014 AI extraction, compliance checking, automated emails, and the self-service portal. No credit card required.' },
];

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                 */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
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
    <div style={{ fontFamily: FONT, color: C.text, background: C.bg, overflowX: 'hidden' }} className="min-h-screen">

      {/* ============================================================ */}
      {/*  1. NAVBAR                                                    */}
      {/* ============================================================ */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(255,255,255,0.7)',
          borderBottom: isScrolled ? `1px solid ${C.border}` : '1px solid transparent',
          boxShadow: isScrolled ? C.shadowSm : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/logo-icon.svg" alt="SmartCOI" style={{ height: 32, width: 32 }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                Smart<span style={{ color: C.greenDark }}>COI</span>
              </span>
            </div>

            {/* Center nav — desktop */}
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: 4 }}>
              {[{ href: '#features', label: 'Features' }, { href: '#pricing', label: 'Pricing' }, { href: '#faq', label: 'FAQs' }].map((link) => (
                <button
                  key={link.href}
                  onClick={() => smoothScroll(link.href)}
                  style={{ padding: '6px 16px', fontSize: 14, fontWeight: 500, color: C.textSecondary, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: FONT }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = '#F8F9FB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = 'none'; }}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Right actions — desktop */}
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: 12 }}>
              <button onClick={goToLogin} style={{ padding: '6px 16px', fontSize: 14, fontWeight: 500, color: C.textSecondary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>
                Sign In
              </button>
              <button onClick={goToSignup} style={{
                padding: '8px 20px', fontSize: 14, fontWeight: 600, color: '#fff', background: C.text,
                border: 'none', borderRadius: C.radiusXs, cursor: 'pointer', fontFamily: FONT,
              }}>
                Get Started
              </button>
            </div>

            {/* Mobile hamburger */}
            <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ padding: 8, background: 'none', border: 'none', color: C.text, cursor: 'pointer' }}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden" style={{ paddingBottom: 16, borderTop: `1px solid ${C.borderLight}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[{ href: '#features', label: 'Features' }, { href: '#pricing', label: 'Pricing' }, { href: '#faq', label: 'FAQs' }].map((link) => (
                  <button key={link.href} onClick={() => smoothScroll(link.href)}
                    style={{ textAlign: 'left', padding: '10px 12px', fontSize: 15, fontWeight: 500, color: C.textSecondary, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: FONT }}>
                    {link.label}
                  </button>
                ))}
                <button onClick={() => { goToLogin(); setIsMobileMenuOpen(false); }}
                  style={{ textAlign: 'left', padding: '10px 12px', fontSize: 15, fontWeight: 500, color: C.textSecondary, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: FONT }}>
                  Sign In
                </button>
                <button onClick={() => { goToSignup(); setIsMobileMenuOpen(false); }}
                  style={{ marginTop: 8, padding: '12px 0', background: C.text, color: '#fff', border: 'none', borderRadius: C.radiusXs, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, fontSize: 15 }}>
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
      <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 80 }} className="px-4 sm:px-6">
        {/* Green radial glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 800, height: 800,
          background: 'radial-gradient(circle, rgba(115,226,167,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* Badge */}
          <FadeIn>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: C.greenDim, border: `1px solid ${C.greenBorder}`,
              borderRadius: 100, padding: '6px 16px', marginBottom: 24,
            }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: C.greenDark, animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: C.greenDark }}>AI-Powered COI Compliance</span>
            </div>
          </FadeIn>

          {/* Headline */}
          <FadeIn delay={0.05}>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20, color: C.text }}>
              Insurance compliance{' '}
              <br className="hidden sm:block" />
              <span style={{ color: C.greenDark }}>on autopilot.</span>
            </h1>
          </FadeIn>

          {/* Subheadline */}
          <FadeIn delay={0.1}>
            <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', lineHeight: 1.6, color: C.textSecondary, maxWidth: 640, margin: '0 auto 32px' }}>
              Upload a COI or tenant lease. SmartCOI extracts the data, checks compliance against your requirements, and follows up automatically. Built for commercial property managers.
            </p>
          </FadeIn>

          {/* Buttons */}
          <FadeIn delay={0.15}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ marginBottom: 48 }}>
              <button onClick={goToSignup} style={{
                padding: '12px 28px', fontSize: 15, fontWeight: 600, color: '#fff', background: C.text,
                border: 'none', borderRadius: C.radiusXs, cursor: 'pointer', fontFamily: FONT,
              }}>
                Start free trial &rarr;
              </button>
              <button onClick={() => setShowContactModal(true)} style={{
                padding: '12px 28px', fontSize: 15, fontWeight: 600, color: C.text, background: 'transparent',
                border: `1px solid ${C.border}`, borderRadius: C.radiusXs, cursor: 'pointer', fontFamily: FONT,
              }}>
                Schedule demo
              </button>
            </div>
          </FadeIn>

          {/* Dashboard preview */}
          <FadeIn delay={0.2}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              <DashboardPreview />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  3. PROBLEM SECTION                                           */}
      {/* ============================================================ */}
      <section style={{ background: C.bg, padding: '80px 0' }} className="px-4 sm:px-6">
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <SectionLabel>THE PROBLEM</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 12 }}>
              COI tracking shouldn&rsquo;t be this painful
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: C.textSecondary, maxWidth: 560, margin: '0 auto 48px' }}>
              You&rsquo;re spending hours every week on something that should take minutes. Manual tracking creates real risk.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" style={{ maxWidth: 960 }}>
            {problemCards.map((card, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div
                  style={{
                    background: C.bgSection, border: `1px solid ${C.border}`, borderRadius: C.radius,
                    padding: 32, textAlign: 'center', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.greenBorder.replace('0.20', '0.50'); }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
                >
                  <div style={{ fontSize: 40, fontWeight: 800, color: C.greenDark, marginBottom: 8 }}>{card.number}</div>
                  <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5 }}>
                    {card.line1}<br />{card.line2}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  4. FEATURES — EVEN 3×2 GRID                                  */}
      {/* ============================================================ */}
      <section id="features" style={{ background: C.bgSection, padding: '80px 0' }} className="px-4 sm:px-6">
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <SectionLabel>FEATURES</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 12 }}>
              Everything you need. Nothing you don&rsquo;t.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: C.textSecondary, maxWidth: 560, margin: '0 auto 48px' }}>
              Upload a certificate and let SmartCOI handle the rest — from extraction to compliance to follow-up.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 14 }}>
            {features.map((feature, i) => {
              const Icon = featureIcons[i] ?? Sparkles;
              return (
                <FadeIn key={i} delay={i * 0.07}>
                  <div
                    style={{
                      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.radius,
                      padding: 28, textAlign: 'left', height: '100%',
                      transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.greenBorder.replace('0.20', '0.50');
                      e.currentTarget.style.boxShadow = C.shadowMd;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: C.radiusSm,
                      background: C.greenDim, border: `1px solid ${C.greenBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                    }}>
                      <Icon size={20} color={C.greenDark} strokeWidth={1.8} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{feature.title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSecondary, margin: 0 }}>{feature.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  5. HOW IT WORKS                                              */}
      {/* ============================================================ */}
      <section style={{ background: C.bg, padding: '80px 0' }} className="px-4 sm:px-6">
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 12 }}>
              Three steps. Zero headaches.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: C.textSecondary, maxWidth: 480, margin: '0 auto 48px' }}>
              From setup to full compliance tracking in under 5 minutes.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 32 }}>
            {steps.map((step, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 44, fontWeight: 700, color: 'rgba(115,226,167,0.25)', marginBottom: 12 }}>
                    {step.num}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSecondary, margin: 0 }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  6. PRICING                                                   */}
      {/* ============================================================ */}
      <section id="pricing" style={{ background: C.bgSection, padding: '80px 0' }} className="px-4 sm:px-6">
        <div style={{ maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <SectionLabel>PRICING</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 12 }}>
              Simple, upfront pricing
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: C.textSecondary, maxWidth: 560, margin: '0 auto 48px' }}>
              All features included on every plan. Only difference is certificate count. No long contracts, no surprise fees.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 14, alignItems: 'start' }}>
            {pricingTiers.map((tier, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div
                  style={{
                    position: 'relative',
                    background: C.bgCard, borderRadius: C.radius,
                    border: tier.popular ? `2px solid ${C.greenDark}` : `1px solid ${C.border}`,
                    boxShadow: tier.popular ? `0 0 0 4px ${C.greenDim}` : 'none',
                    padding: '30px 22px', textAlign: 'left',
                    maxWidth: tier.popular ? undefined : undefined,
                  }}
                >
                  {tier.popular && (
                    <div style={{
                      position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                      background: C.greenDark, color: '#fff', fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase' as const, padding: '3px 14px', borderRadius: 100,
                      letterSpacing: '0.02em', whiteSpace: 'nowrap',
                    }}>
                      Most Popular
                    </div>
                  )}

                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>{tier.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: C.text }}>{tier.price}</span>
                    <span style={{ fontSize: 14, color: C.textSecondary }}>{tier.period}</span>
                  </div>

                  {/* Cert count pill */}
                  <div style={{
                    display: 'inline-block', background: C.greenDim, color: C.greenDark,
                    fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, marginBottom: 20,
                  }}>
                    {tier.certs}
                  </div>

                  {/* Features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tier.features.map((feat, fi) => (
                      <li key={fi} style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                        <Check size={16} color={C.greenDark} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 14, color: C.textSecondary }}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={tier.cta === 'Get in touch' ? () => setShowContactModal(true) : goToSignup}
                    style={{
                      width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600, borderRadius: C.radiusXs,
                      cursor: 'pointer', fontFamily: FONT, border: tier.popular ? 'none' : `1px solid ${C.border}`,
                      background: tier.popular ? C.text : 'transparent',
                      color: tier.popular ? '#fff' : C.text,
                      transition: 'background 0.2s',
                    }}
                  >
                    {tier.cta} &rarr;
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  7. TESTIMONIAL                                               */}
      {/* ============================================================ */}
      <section style={{ background: C.bg, padding: '80px 0' }} className="px-4 sm:px-6">
        <FadeIn>
          <div style={{ maxWidth: 660, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 56, color: C.green, opacity: 0.35, lineHeight: 1, marginBottom: 16 }}>&ldquo;</div>
            <p style={{ fontSize: 21, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.5, color: C.text, marginBottom: 24 }}>
              We used to spend 10+ hours a week manually checking COIs against lease requirements. SmartCOI cut that to minutes. The lease extraction alone saved us from hiring another compliance coordinator.
            </p>
            <p style={{ fontSize: 14, color: C.textSecondary }}>
              <strong>Property Manager</strong> &middot; Commercial Real Estate
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ============================================================ */}
      {/*  8. FAQ                                                       */}
      {/* ============================================================ */}
      <section id="faq" style={{ background: C.bgSection, padding: '80px 0' }} className="px-4 sm:px-6">
        <div style={{ maxWidth: 660, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <SectionLabel>FAQ</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: C.text, marginTop: 12, marginBottom: 40 }}>
              Frequently Asked Questions
            </h2>
          </FadeIn>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div
                  style={{
                    background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.radiusSm,
                    overflow: 'hidden', cursor: 'pointer',
                  }}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenFaq(openFaq === i ? null : i); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0, paddingRight: 16 }}>{faq.q}</h3>
                    <ChevronDown
                      size={18}
                      color={C.textTertiary}
                      style={{
                        flexShrink: 0,
                        transition: 'transform 0.2s',
                        transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      maxHeight: openFaq === i ? 200 : 0,
                      opacity: openFaq === i ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease, opacity 0.3s ease',
                    }}
                  >
                    <p style={{ padding: '0 20px 16px', fontSize: 14, lineHeight: 1.65, color: C.textSecondary, margin: 0 }}>{faq.a}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  9. FINAL CTA                                                 */}
      {/* ============================================================ */}
      <section style={{ position: 'relative', background: C.bg, padding: '96px 0' }} className="px-4 sm:px-6">
        {/* Green radial glow */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600,
          background: 'radial-gradient(circle, rgba(115,226,167,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <FadeIn>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: C.text, marginBottom: 16, lineHeight: 1.2 }}>
              Ready to stop chasing<br />certificates?
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: C.textSecondary, marginBottom: 32 }}>
              Join property managers who&rsquo;ve replaced spreadsheets and manual follow-ups with SmartCOI.
            </p>
            <button onClick={goToSignup} style={{
              padding: '12px 28px', fontSize: 15, fontWeight: 600, color: '#fff', background: C.text,
              border: 'none', borderRadius: C.radiusXs, cursor: 'pointer', fontFamily: FONT,
            }}>
              Start free trial &rarr;
            </button>
          </div>
        </FadeIn>
      </section>

      {/* ============================================================ */}
      {/*  10. FOOTER                                                   */}
      {/* ============================================================ */}
      <footer style={{ background: C.bgSection, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8" style={{ marginBottom: 32 }}>
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1" style={{ maxWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <img src="/logo-icon.svg" alt="SmartCOI" style={{ height: 22, width: 22 }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                  Smart<span style={{ color: C.greenDark }}>COI</span>
                </span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: C.textTertiary }}>
                AI-powered certificate of insurance tracking for commercial property managers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: C.textTertiary, marginBottom: 12 }}>Product</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><button onClick={() => smoothScroll('#features')} style={{ fontSize: 14, color: C.textSecondary, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT }}>Features</button></li>
                <li><button onClick={() => smoothScroll('#pricing')} style={{ fontSize: 14, color: C.textSecondary, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT }}>Pricing</button></li>
                <li><button onClick={() => smoothScroll('#faq')} style={{ fontSize: 14, color: C.textSecondary, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT }}>FAQ</button></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: C.textTertiary, marginBottom: 12 }}>Company</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><a href="#" style={{ fontSize: 14, color: C.textSecondary, textDecoration: 'none' }}>About</a></li>
                <li><a href="#" style={{ fontSize: 14, color: C.textSecondary, textDecoration: 'none' }}>Blog</a></li>
                <li><button onClick={() => setShowContactModal(true)} style={{ fontSize: 14, color: C.textSecondary, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT }}>Contact</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: C.textTertiary, marginBottom: 12 }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><a href="#" style={{ fontSize: 14, color: C.textSecondary, textDecoration: 'none' }}>Privacy Policy</a></li>
                <li><a href="#" style={{ fontSize: 14, color: C.textSecondary, textDecoration: 'none' }}>Terms of Service</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            <p style={{ fontSize: 12, color: C.textTertiary, margin: 0 }}>
              &copy; 2026 SmartCOI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Contact Modal */}
      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
}
