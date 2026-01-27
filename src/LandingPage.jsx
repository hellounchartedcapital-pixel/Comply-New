import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import {
  CheckCircle, Zap, Upload, Bell, FileText, Play, Menu, X,
  FileCheck, FolderOpen, Cloud, Users, Check
} from 'lucide-react';

// Dashboard Mockup Component
function DashboardMockup() {
  const vendors = [
    { name: "ABC Cleaning Services", status: "Compliant", statusType: "compliant" },
    { name: "Pro Electric LLC", status: "Expiring in 14 days", statusType: "expiring" },
    { name: "Metro HVAC Inc.", status: "Expired", statusType: "expired" },
  ];

  const statusColors = {
    compliant: "bg-emerald-500/10 text-emerald-500",
    expiring: "bg-amber-500/10 text-amber-500",
    expired: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Browser chrome */}
      <div className="bg-gray-100 p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-5">
          Compliance Dashboard
        </h3>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">47</div>
            <div className="text-xs text-gray-500">Compliant</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">8</div>
            <div className="text-xs text-gray-500">Expiring Soon</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-500">3</div>
            <div className="text-xs text-gray-500">Expired</div>
          </div>
        </div>

        {/* Vendor list */}
        <div className="space-y-0">
          {vendors.map((vendor, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm font-medium text-gray-900">
                {vendor.name}
              </span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[vendor.statusType]}`}>
                {vendor.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onLogin, onSignUp, onPrivacy, onTerms, onPricing }) {
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
    { label: "Pricing", onClick: onPricing },
  ];

  const stats = [
    { value: "5 sec", label: "Average extraction time" },
    { value: "99%", label: "Accuracy rate" },
    { value: "10+ hrs", label: "Saved per week" },
  ];

  const features = [
    {
      icon: Zap,
      title: "Instant AI Extraction",
      description: "Upload a COI and our AI extracts all policy details, limits, and expiration dates in under 5 seconds.",
    },
    {
      icon: Bell,
      title: "Expiration Alerts",
      description: "Never miss a renewal. Get automatic alerts 30, 14, and 7 days before any certificate expires.",
    },
    {
      icon: CheckCircle,
      title: "Compliance Tracking",
      description: "See at a glance which vendors are compliant, expiring soon, or need immediate attention.",
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
      title: "Team Collaboration",
      description: "Invite team members, assign properties, and work together to keep compliance on track.",
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

  const pricingFeatures = [
    "Unlimited COI uploads",
    "AI-powered data extraction",
    "Expiration alerts & reminders",
    "Vendor management portal",
    "Cloud document storage",
    "Team collaboration tools",
    "Priority email support",
  ];

  return (
    <div className="min-h-screen bg-white">
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
              {navLinks.map((link, index) => (
                link.onClick ? (
                  <button
                    key={index}
                    onClick={link.onClick}
                    className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </button>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-gray-600 font-medium hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </a>
                )
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
                Start Free Trial
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
                {navLinks.map((link, index) => (
                  link.onClick ? (
                    <button
                      key={index}
                      onClick={() => { link.onClick(); setIsMobileMenuOpen(false); }}
                      className="text-gray-600 font-medium hover:text-gray-900 transition-colors py-2 text-left"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-gray-600 font-medium hover:text-gray-900 transition-colors py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  )
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
                  Start Free Trial
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
                certificates in seconds, not minutes. Save 10+ hours every week.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-fade-in-up animation-delay-300">
                <button
                  onClick={onSignUp}
                  className="h-12 px-8 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold text-base shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/45 transition-all duration-200"
                >
                  Start Free Trial
                </button>
                <button
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="h-12 px-8 bg-white text-gray-900 border-2 border-gray-200 rounded-lg font-semibold text-base hover:border-emerald-500 hover:text-emerald-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Watch Demo
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
              One plan. All features. No hidden fees.
            </p>
          </div>

          {/* Pricing card */}
          <div className="max-w-lg mx-auto">
            <div className="relative bg-white rounded-3xl p-10 shadow-2xl border-2 border-emerald-500 overflow-hidden">
              {/* Top gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" />

              {/* Badge */}
              <div className="absolute top-6 right-6 bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                Most Popular
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Professional
              </h3>
              <p className="text-gray-600 mb-6">
                Everything you need to manage COI compliance
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">$49</span>
                <span className="text-lg text-gray-500">/month</span>
              </div>
              <p className="text-sm text-emerald-600 mb-8">
                Billed annually — Save 20%
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {pricingFeatures.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-900">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={onSignUp}
                className="w-full h-14 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white rounded-lg font-semibold text-lg shadow-lg shadow-emerald-500/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/45 transition-all duration-200"
              >
                Start Free Trial
              </button>
            </div>
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
            hours with SmartCOI.
          </p>
          <button
            onClick={onSignUp}
            className="h-14 px-10 bg-white text-emerald-600 rounded-lg font-semibold text-lg hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            Start Your Free Trial Today
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
