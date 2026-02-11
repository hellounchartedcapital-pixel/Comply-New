import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Building2,
  CheckCircle2,
  ArrowRight,
  Users,
  BarChart3,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Extraction',
    description:
      'Upload COIs or lease documents and let AI automatically extract coverage details, limits, and endorsements.',
  },
  {
    icon: Building2,
    title: 'Property-Level Tracking',
    description:
      'Manage insurance requirements per building with customizable defaults for both vendors and tenants.',
  },
  {
    icon: CheckCircle2,
    title: 'Real-Time Compliance',
    description:
      'Instantly compare actual coverage against requirements. Know exactly who is compliant and who needs attention.',
  },
  {
    icon: Clock,
    title: 'Expiration Monitoring',
    description:
      'Automated alerts for expiring coverage with configurable follow-up emails to vendors and tenants.',
  },
  {
    icon: Users,
    title: 'Unified Workflows',
    description:
      'Same streamlined process for vendors and tenants — set requirements, upload COIs, track compliance.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description:
      'Visual dashboards showing compliance rates, trends, and gap analysis across your entire portfolio.',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Add Your Properties',
    description: 'Set up your buildings and configure default insurance requirements.',
  },
  {
    step: '2',
    title: 'Add Vendors & Tenants',
    description: 'Use AI to extract requirements from leases or set them manually.',
  },
  {
    step: '3',
    title: 'Upload COIs',
    description: 'AI reads the certificates and compares against your requirements instantly.',
  },
  {
    step: '4',
    title: 'Stay Compliant',
    description: 'Monitor dashboards, get expiration alerts, and send automated follow-ups.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="SmartCOI" className="h-9 w-9" />
            <span className="text-xl font-bold">
              Smart<span className="text-gradient-primary">COI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/login')}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
          AI-Powered Compliance Tracking
        </Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          COI Compliance Made{' '}
          <span className="text-gradient-primary">Simple</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          SmartCOI helps commercial property managers track vendor and tenant insurance
          compliance with AI-powered document extraction, real-time monitoring, and
          automated follow-ups.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate('/login')}>
            Start Free Trial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/login')}>
            View Demo
          </Button>
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            14-day free trial
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Cancel anytime
          </span>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-white py-12">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-16 px-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-primary">85%</p>
            <p className="mt-1 text-sm text-muted-foreground">Time saved on COI reviews</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-primary">99%</p>
            <p className="mt-1 text-sm text-muted-foreground">Extraction accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient-primary">2 min</p>
            <p className="mt-1 text-sm text-muted-foreground">Average review time</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything you need to manage COI compliance
          </h2>
          <p className="mt-3 text-muted-foreground">
            From AI extraction to automated follow-ups — one platform for your entire portfolio.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              Get up and running in minutes, not weeks.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-lg font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="rounded-2xl gradient-primary p-12 text-white">
          <h2 className="text-3xl font-bold">Ready to simplify COI compliance?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join property managers who save hours every week with AI-powered insurance tracking.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 bg-white text-foreground hover:bg-white/90"
            onClick={() => navigate('/login')}
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.svg" alt="SmartCOI" className="h-6 w-6" />
            <span className="text-sm font-semibold">SmartCOI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SmartCOI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
