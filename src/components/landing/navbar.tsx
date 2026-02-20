'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
];

const resourceLinks = [
  { label: 'Blog', href: '/blog', desc: 'Insights on COI compliance and property management' },
  { label: 'COI Compliance Guide', href: '/blog/coi-compliance-guide-property-managers', desc: 'The complete guide for property managers' },
  { label: 'Compare Solutions', href: '/compare', desc: 'See how SmartCOI stacks up' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace('/#', '');

    if (pathname === '/') {
      // Already on landing page — smooth scroll
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Navigate to landing page with hash
      router.push(href);
    }
  }

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold text-slate-950">SmartCOI</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}

          {/* Resources dropdown */}
          <div ref={resourcesRef} className="relative">
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950"
            >
              Resources
              <svg className={cn('h-3.5 w-3.5 transition-transform', resourcesOpen && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>

            {resourcesOpen && (
              <div className="absolute top-full left-1/2 mt-2 w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {resourceLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setResourcesOpen(false)}
                    className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-950">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{item.desc}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-dark"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
          aria-label="Toggle menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            {mobileOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
              >
                {link.label}
              </a>
            ))}
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-2">Resources</span>
            {resourceLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
            <hr className="border-slate-200" />
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-slate-700"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-slate-950"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
