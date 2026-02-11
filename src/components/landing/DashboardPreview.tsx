import {
  LayoutDashboard,
  Building2,
  Truck,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  Search,
  Bell,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Static mini-replica of the real SmartCOI dashboard (non-interactive)       */
/* -------------------------------------------------------------------------- */

const sidebarNav = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Properties', icon: Building2 },
  { label: 'Vendors', icon: Truck },
  { label: 'Tenants', icon: Users },
  { label: 'Requirements', icon: ClipboardCheck },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
];

const statCards = [
  { title: 'Total Certificates', value: '284', icon: FileText, subtitle: '196 vendors, 88 tenants', color: 'text-emerald-600' },
  { title: 'Compliant', value: '94%', icon: CheckCircle2, subtitle: '267 of 284', color: 'text-emerald-600' },
  { title: 'Expiring in 30 Days', value: '12', icon: AlertTriangle, subtitle: 'Requires attention', color: 'text-amber-600' },
  { title: 'Tenants Tracked', value: '156', icon: Users, subtitle: 'Across 8 properties', color: 'text-teal-600' },
];

const actionItems = [
  { name: 'Apex Cleaning Services', type: 'Vendor', property: 'Sunrise Tower', status: 'expired', statusLabel: 'Expired', statusColor: 'bg-red-100 text-red-700' },
  { name: 'Metro Electric Co.', type: 'Vendor', property: 'Harbor Plaza', status: 'non-compliant', statusLabel: 'Non-Compliant', statusColor: 'bg-orange-100 text-orange-700' },
  { name: 'Sarah Johnson', type: 'Tenant', property: 'Lakeview Apartments', status: 'expiring', statusLabel: 'Expiring', statusColor: 'bg-amber-100 text-amber-700' },
  { name: 'ABC Plumbing', type: 'Vendor', property: 'Sunrise Tower', status: 'non-compliant', statusLabel: 'Non-Compliant', statusColor: 'bg-orange-100 text-orange-700' },
];

/* Donut chart SVG — matches the real dashboard's PieChart */
function MiniDonut() {
  const total = 284;
  const segments = [
    { value: 267, color: '#10b981', label: 'Compliant' },
    { value: 12, color: '#f59e0b', label: 'Expiring' },
    { value: 5, color: '#ef4444', label: 'Non-Compliant' },
  ];
  const circumference = 2 * Math.PI * 40;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex-shrink-0">
        <svg width="90" height="90" viewBox="0 0 100 100" className="transform -rotate-90">
          {segments.map((seg, i) => {
            const dash = (seg.value / total) * circumference;
            const el = (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-emerald-600">94%</span>
          <span className="text-[8px] text-gray-500">Compliant</span>
        </div>
      </div>
      <div className="flex gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[8px] text-gray-600 whitespace-nowrap">{seg.value} {seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPreview() {
  return (
    <div
      className="rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden bg-white select-none pointer-events-none"
      style={{ transformOrigin: 'top center' }}
      aria-hidden="true"
    >
      <div className="flex" style={{ minHeight: 340 }}>
        {/* Sidebar */}
        <div className="w-[52px] flex-shrink-0 flex flex-col" style={{ backgroundColor: 'hsl(222, 47%, 11%)' }}>
          {/* Logo */}
          <div className="h-10 flex items-center justify-center border-b" style={{ borderColor: 'hsl(215, 28%, 20%)' }}>
            <img src="/logo-icon.svg" alt="" className="h-5 w-5" />
          </div>
          {/* Nav */}
          <nav className="flex-1 py-2 px-1.5 space-y-0.5">
            {sidebarNav.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center justify-center rounded-md p-1.5 ${
                    item.active
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
                      : ''
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${item.active ? 'text-white' : 'text-gray-500'}`} />
                </div>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="h-10 flex items-center justify-between px-3 border-b border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-md px-2 py-1 flex-1 max-w-[160px]">
                <Search className="h-2.5 w-2.5 text-gray-400" />
                <span className="text-[8px] text-gray-400">Search...</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-3 w-3 text-gray-400" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </div>
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center justify-center">
                <span className="text-[7px] font-bold text-white">JD</span>
              </div>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="flex-1 p-3 bg-gray-50/80 overflow-hidden">
            {/* Page header */}
            <div className="mb-2.5">
              <p className="text-[11px] font-bold text-gray-900">Dashboard</p>
              <p className="text-[7px] text-gray-500">Overview of your insurance compliance status</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[7px] text-gray-500 mb-0.5">{card.title}</p>
                        <p className={`text-sm font-bold ${card.color}`}>{card.value}</p>
                        <p className="text-[6px] text-gray-400 mt-0.5">{card.subtitle}</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-2.5 w-2.5 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts + Action Items row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Compliance Overview */}
              <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-bold text-gray-900">Compliance Overview</p>
                  <div className="flex gap-0.5">
                    <span className="text-[7px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">All</span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded text-gray-400">Vendors</span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded text-gray-400">Tenants</span>
                  </div>
                </div>
                <MiniDonut />
              </div>

              {/* Action Items */}
              <div className="col-span-2 bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
                <p className="text-[9px] font-bold text-gray-900 mb-2">Action Items</p>
                <div className="space-y-1.5">
                  {actionItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-gray-50 p-1.5">
                      <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        {item.type === 'Vendor' ? (
                          <Truck className="h-2.5 w-2.5 text-emerald-600" />
                        ) : (
                          <Users className="h-2.5 w-2.5 text-emerald-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-[7px] text-gray-500">{item.property} &middot; {item.type}</p>
                      </div>
                      <span className={`text-[7px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${item.statusColor}`}>
                        {item.statusLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
