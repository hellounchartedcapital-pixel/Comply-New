import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          {/* Brand */}
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.svg" alt="" className="h-7 w-7" />
              <span className="text-lg font-bold text-white">SmartCOI</span>
            </div>
            <p className="text-sm text-slate-500">
              AI-powered COI compliance tracking.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
            <Link href="/features/coi-tracking" className="text-slate-400 transition-colors hover:text-white">
              COI Tracking
            </Link>
            <Link href="/features/compliance-automation" className="text-slate-400 transition-colors hover:text-white">
              Compliance
            </Link>
            <Link href="/features/vendor-management" className="text-slate-400 transition-colors hover:text-white">
              Vendor Management
            </Link>
            <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="text-slate-400 transition-colors hover:text-white">
              Sign Up
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} SmartCOI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
