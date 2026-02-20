import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.svg" alt="" className="h-7 w-7" />
              <span className="text-lg font-bold text-white">SmartCOI</span>
            </div>
            <p className="text-sm text-slate-500">
              AI-powered COI compliance tracking for commercial property managers.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/features/coi-tracking" className="text-slate-400 transition-colors hover:text-white">
                COI Tracking
              </Link>
              <Link href="/features/compliance-automation" className="text-slate-400 transition-colors hover:text-white">
                Compliance Automation
              </Link>
              <Link href="/features/vendor-management" className="text-slate-400 transition-colors hover:text-white">
                Vendor Management
              </Link>
              <Link href="/coi-tracking-software" className="text-slate-400 transition-colors hover:text-white">
                COI Tracking Software
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resources</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/blog" className="text-slate-400 transition-colors hover:text-white">
                Blog
              </Link>
              <Link href="/compare" className="text-slate-400 transition-colors hover:text-white">
                Compare Solutions
              </Link>
              <Link href="/blog/coi-compliance-guide-property-managers" className="text-slate-400 transition-colors hover:text-white">
                COI Compliance Guide
              </Link>
              <Link href="/blog/acord-25-certificate-explained" className="text-slate-400 transition-colors hover:text-white">
                ACORD 25 Guide
              </Link>
            </div>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Company</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
                Login
              </Link>
              <Link href="/signup" className="text-slate-400 transition-colors hover:text-white">
                Sign Up
              </Link>
              <Link href="/terms" className="text-slate-400 transition-colors hover:text-white">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-slate-400 transition-colors hover:text-white">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} SmartCOI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
