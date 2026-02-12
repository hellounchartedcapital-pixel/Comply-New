import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchVendors } from '@/services/vendors';
import { fetchTenants } from '@/services/tenants';
import type { ComplianceStats, Vendor, Tenant } from '@/types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

function calculateStats(
  vendors: Vendor[],
  tenants: Tenant[]
): { vendors: ComplianceStats; tenants: ComplianceStats; combined: ComplianceStats } {
  const calcGroup = (items: Array<{ status?: string; insurance_status?: string }>): ComplianceStats => {
    const stats: ComplianceStats = { total: items.length, compliant: 0, non_compliant: 0, expiring: 0, expired: 0 };
    for (const item of items) {
      const s = ('insurance_status' in item ? item.insurance_status : item.status) ?? 'non-compliant';
      if (s === 'compliant') stats.compliant++;
      else if (s === 'expiring') stats.expiring++;
      else if (s === 'expired') stats.expired++;
      else stats.non_compliant++;
    }
    return stats;
  };

  const v = calcGroup(vendors);
  const t = calcGroup(tenants);
  return {
    vendors: v,
    tenants: t,
    combined: {
      total: v.total + t.total,
      compliant: v.compliant + t.compliant,
      non_compliant: v.non_compliant + t.non_compliant,
      expiring: v.expiring + t.expiring,
      expired: v.expired + t.expired,
    },
  };
}

const CHART_COLORS = ['hsl(160, 82%, 39%)', 'hsl(0, 84%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];

function ComplianceChart({ stats, rate }: { stats: ComplianceStats; rate: number }) {
  const data = [
    { name: 'Compliant', value: stats.compliant },
    { name: 'Non-Compliant', value: stats.non_compliant },
    { name: 'Expiring', value: stats.expiring },
    { name: 'Expired', value: stats.expired },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
          {data.map((_entry, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <text x="50%" y="44%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '26px', fontWeight: 700, fill: 'hsl(222, 47%, 11%)' }}>
          {rate}%
        </text>
        <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '11px', fill: 'hsl(215, 16%, 47%)' }}>
          Compliant
        </text>
        <RechartsTooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================
// NEEDS ATTENTION SECTION
// ============================================

interface AttentionItem {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  href: string;
}

function NeedsAttention({ vendors, tenants }: { vendors: Vendor[]; tenants: Tenant[] }) {
  const navigate = useNavigate();

  const expiredVendors = vendors.filter((v) => v.status === 'expired').length;
  const expiringVendors = vendors.filter((v) => v.status === 'expiring').length;
  const nonCompliantVendors = vendors.filter((v) => v.status === 'non-compliant').length;
  const expiredTenants = tenants.filter((t) => t.insurance_status === 'expired').length;
  const expiringTenants = tenants.filter((t) => t.insurance_status === 'expiring').length;
  const nonCompliantTenants = tenants.filter((t) => t.insurance_status === 'non-compliant').length;

  const items: AttentionItem[] = [];

  const totalExpired = expiredVendors + expiredTenants;
  const totalExpiring = expiringVendors + expiringTenants;

  if (totalExpired > 0) {
    items.push({
      label: `${totalExpired} ${totalExpired === 1 ? 'entity has' : 'entities have'} expired coverage`,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/vendors?status=expired',
    });
  }

  if (totalExpiring > 0) {
    items.push({
      label: `${totalExpiring} COI${totalExpiring === 1 ? '' : 's'} expiring in the next 30 days`,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      href: '/vendors?status=expiring',
    });
  }

  if (nonCompliantVendors > 0) {
    items.push({
      label: `${nonCompliantVendors} vendor${nonCompliantVendors === 1 ? '' : 's'} non-compliant`,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/vendors?status=non-compliant',
    });
  }

  if (nonCompliantTenants > 0) {
    items.push({
      label: `${nonCompliantTenants} tenant${nonCompliantTenants === 1 ? '' : 's'} non-compliant`,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/tenants?status=non-compliant',
    });
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <div className="rounded-full bg-green-50 p-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium">All clear</p>
            <p className="text-xs text-muted-foreground">All vendors and tenants are compliant.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          Needs Your Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={() => navigate(item.href)}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className={`rounded-full p-1.5 ${item.bgColor}`}>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-[140px] w-full" />
    </div>
  );
}

export default function Dashboard() {
  const { data: vendorData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'dashboard'],
    queryFn: () => fetchVendors({ pageSize: 100 }),
  });

  const { data: tenantData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', 'dashboard'],
    queryFn: () => fetchTenants({ pageSize: 100 }),
  });

  const isLoading = vendorsLoading || tenantsLoading;
  const vendors = useMemo(() => vendorData?.data ?? [], [vendorData?.data]);
  const tenants = useMemo(() => tenantData?.data ?? [], [tenantData?.data]);
  const allStats = useMemo(() => calculateStats(vendors, tenants), [vendors, tenants]);

  if (isLoading) return <DashboardSkeleton />;

  const calcRate = (s: ComplianceStats) =>
    s.total > 0 ? Math.round((s.compliant / s.total) * 100) : 0;

  const complianceRate = calcRate(allStats.combined);
  const vendorRate = calcRate(allStats.vendors);
  const tenantRate = calcRate(allStats.tenants);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of your insurance compliance status" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Certificates" value={allStats.combined.total} icon={FileText} subtitle={`${allStats.vendors.total} vendors, ${allStats.tenants.total} tenants`} />
        <StatCard title="Compliant" value={`${complianceRate}%`} icon={CheckCircle2} subtitle={`${allStats.combined.compliant} of ${allStats.combined.total}`} />
        <StatCard title="Expiring in 30 Days" value={allStats.combined.expiring} icon={AlertTriangle} subtitle="Requires attention" />
        <StatCard title="Needs Action" value={allStats.combined.non_compliant + allStats.combined.expired} icon={Clock} subtitle="Non-compliant or expired" />
      </div>

      {/* Needs Attention — prominent section below stat cards */}
      <NeedsAttention vendors={vendors} tenants={tenants} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Compliance Overview</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="combined">
              <TabsList className="w-full">
                <TabsTrigger value="combined" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="vendors" className="flex-1">Vendors</TabsTrigger>
                <TabsTrigger value="tenants" className="flex-1">Tenants</TabsTrigger>
              </TabsList>
              <TabsContent value="combined"><ComplianceChart stats={allStats.combined} rate={complianceRate} /></TabsContent>
              <TabsContent value="vendors"><ComplianceChart stats={allStats.vendors} rate={vendorRate} /></TabsContent>
              <TabsContent value="tenants"><ComplianceChart stats={allStats.tenants} rate={tenantRate} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Vendors</span>
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium">{allStats.vendors.compliant}</span>
                  <span className="text-muted-foreground"> / {allStats.vendors.total} compliant</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Tenants</span>
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium">{allStats.tenants.compliant}</span>
                  <span className="text-muted-foreground"> / {allStats.tenants.total} compliant</span>
                </div>
              </div>
              {allStats.combined.expired > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">Expired</span>
                  </div>
                  <span className="text-sm font-medium text-red-800">{allStats.combined.expired}</span>
                </div>
              )}
              {allStats.combined.expiring > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">Expiring Soon</span>
                  </div>
                  <span className="text-sm font-medium text-yellow-800">{allStats.combined.expiring}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
