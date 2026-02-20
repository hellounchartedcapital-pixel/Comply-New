'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface UpgradeModalCtx {
  showUpgradeModal: (message?: string) => void;
}

const Ctx = createContext<UpgradeModalCtx>({
  showUpgradeModal: () => {},
});

export function useUpgradeModal() {
  return useContext(Ctx);
}

// ---------------------------------------------------------------------------
// Provider + Modal
// ---------------------------------------------------------------------------

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<string | null>(null);

  const showUpgradeModal = useCallback((message?: string) => {
    setBody(message ?? null);
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ showUpgradeModal }}>
      {children}

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Your free trial has ended
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {body ??
                  'Subscribe to SmartCOI to continue automating your COI compliance.'}
              </p>

              <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/settings/billing"
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  onClick={() => setOpen(false)}
                >
                  View Plans
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
