export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen">
      {/* Left panel — branded hero */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between gradient-primary p-12">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="SmartCOI" className="h-10 w-10" />
          <span className="text-xl font-bold text-slate-950">SmartCOI</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            Insurance compliance,
            <br />
            simplified.
          </h1>
          <p className="mt-4 text-lg text-slate-950/70">
            AI-powered COI tracking for commercial property managers.
            Automate certificate collection, verify coverage requirements,
            and stay ahead of expirations.
          </p>
        </div>

        <p className="text-sm text-slate-950/50">
          &copy; {new Date().getFullYear()} SmartCOI. All rights reserved.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
