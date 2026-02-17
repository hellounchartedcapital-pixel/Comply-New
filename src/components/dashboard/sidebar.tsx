'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FileCheck,
  Bell,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth';

const COLLAPSED_KEY = 'smartcoi-sidebar-collapsed';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Properties', href: '/dashboard/properties', icon: Building2 },
  { label: 'Templates', href: '/dashboard/templates', icon: FileCheck },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
] as const;

function getPageTitle(pathname: string): string {
  const match = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
  );
  return match?.label ?? 'Dashboard';
}

interface DashboardShellProps {
  userName: string | null;
  userEmail: string;
  orgName: string;
  children: React.ReactNode;
}

export function DashboardShell({
  userName,
  userEmail,
  orgName,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const pageTitle = getPageTitle(pathname);

  return (
    <>
      {/* ---- Mobile overlay ---- */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ---- Sidebar ---- */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-200 ease-in-out',
          // Desktop: relative positioning within the flex layout
          'md:relative md:z-auto',
          // Mobile: slide in/out
          mobileOpen
            ? 'w-64 translate-x-0'
            : '-translate-x-full md:translate-x-0',
          collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        {/* Logo & org */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.svg"
            alt="SmartCOI"
            className="h-8 w-8 flex-shrink-0"
          />
          <div
            className={cn(
              'min-w-0 transition-opacity duration-200',
              collapsed ? 'md:hidden' : ''
            )}
          >
            <p className="truncate text-sm font-bold text-slate-950">
              SmartCOI
            </p>
            <p className="truncate text-xs text-slate-500">{orgName}</p>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' &&
                  pathname.startsWith(item.href + '/'));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex h-10 items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                      collapsed ? 'md:justify-center md:px-0' : '',
                      isActive
                        ? 'border-l-[3px] border-emerald-500 bg-emerald-50 pl-[9px] pr-3 text-emerald-700'
                        : 'px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive
                          ? 'text-emerald-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span
                      className={cn(
                        'transition-opacity duration-200',
                        collapsed ? 'md:hidden' : ''
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section — user info + sign out */}
        <div className="border-t border-slate-200 p-3">
          <div
            className={cn(
              'mb-2 min-w-0 px-1 transition-opacity duration-200',
              collapsed ? 'md:hidden' : ''
            )}
          >
            <p className="truncate text-sm font-medium text-slate-900">
              {userName ?? 'User'}
            </p>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut()}
            className={cn(
              'flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
              collapsed && 'md:justify-center md:px-0'
            )}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span
              className={cn(
                'transition-opacity duration-200',
                collapsed ? 'md:hidden' : ''
              )}
            >
              Sign out
            </span>
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <div className="hidden border-t border-slate-200 md:block">
          <button
            onClick={toggleCollapsed}
            className="flex h-10 w-full items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* ---- Main area (header + content) ---- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/80 px-4 backdrop-blur-sm md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-slate-950">{pageTitle}</h1>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </>
  );
}
