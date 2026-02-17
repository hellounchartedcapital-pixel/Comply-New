export function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Glow effect behind the dashboard */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#73E2A7]/20 via-[#4CC78A]/10 to-transparent blur-2xl" />

      {/* Dashboard mock */}
      <div className="relative rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-slate-300" />
            <div className="h-3 w-3 rounded-full bg-slate-300" />
            <div className="h-3 w-3 rounded-full bg-slate-300" />
          </div>
          <div className="mx-auto rounded-md bg-slate-100 px-16 py-1 text-xs text-slate-400">
            app.smartcoi.com/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-6">
          {/* Top stats row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Vendors" value="142" />
            <StatCard
              label="Compliant"
              value="118"
              accent="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatCard
              label="Expiring Soon"
              value="16"
              accent="text-amber-600"
              bg="bg-amber-50"
            />
            <StatCard
              label="Non-Compliant"
              value="8"
              accent="text-red-500"
              bg="bg-red-50"
            />
          </div>

          {/* Table mock */}
          <div className="rounded-lg border border-slate-200">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <div className="col-span-3">Vendor</div>
              <div className="col-span-3 hidden sm:block">Property</div>
              <div className="col-span-3 sm:col-span-2">Coverage</div>
              <div className="col-span-2">Expires</div>
              <div className="col-span-4 sm:col-span-2 text-right">Status</div>
            </div>

            <TableRow
              vendor="ABC Plumbing Co."
              property="100 Main St"
              coverage="GL, Auto, WC"
              expires="Mar 15, 2027"
              status="compliant"
            />
            <TableRow
              vendor="Metro Electric LLC"
              property="200 Oak Ave"
              coverage="GL, Auto"
              expires="Feb 28, 2026"
              status="expiring"
            />
            <TableRow
              vendor="CleanPro Services"
              property="100 Main St"
              coverage="GL, WC"
              expires="Jan 12, 2026"
              status="non-compliant"
            />
            <TableRow
              vendor="Skyline HVAC Inc."
              property="350 Pine Blvd"
              coverage="GL, Auto, WC, Umb"
              expires="Sep 01, 2027"
              status="compliant"
            />
            <TableRow
              vendor="GreenScape Lawn"
              property="200 Oak Ave"
              coverage="GL, Auto"
              expires="Dec 01, 2027"
              status="compliant"
              last
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = 'text-slate-950',
  bg = 'bg-slate-50',
}: {
  label: string;
  value: string;
  accent?: string;
  bg?: string;
}) {
  return (
    <div className={`rounded-lg ${bg} p-3`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function TableRow({
  vendor,
  property,
  coverage,
  expires,
  status,
  last = false,
}: {
  vendor: string;
  property: string;
  coverage: string;
  expires: string;
  status: 'compliant' | 'expiring' | 'non-compliant';
  last?: boolean;
}) {
  const statusConfig = {
    compliant: { label: 'Compliant', classes: 'bg-emerald-50 text-emerald-700' },
    expiring: { label: 'Expiring', classes: 'bg-amber-50 text-amber-700' },
    'non-compliant': { label: 'Gap Found', classes: 'bg-red-50 text-red-600' },
  };
  const s = statusConfig[status];

  return (
    <div
      className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm ${!last ? 'border-b border-slate-100' : ''}`}
    >
      <div className="col-span-3 font-medium text-slate-900 truncate">{vendor}</div>
      <div className="col-span-3 hidden text-slate-500 sm:block truncate">{property}</div>
      <div className="col-span-3 sm:col-span-2 text-slate-500 truncate">{coverage}</div>
      <div className="col-span-2 text-slate-500">{expires}</div>
      <div className="col-span-4 sm:col-span-2 flex justify-end">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.classes}`}
        >
          {s.label}
        </span>
      </div>
    </div>
  );
}
