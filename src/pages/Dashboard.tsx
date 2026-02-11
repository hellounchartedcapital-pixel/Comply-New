import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { IconContainer } from '@/components/shared/IconContainer';
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
        <text
          x="50%"
          y="44%"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: '26px', fontWeight: 700, fill: 'hsl(222, 47%, 11%)' }}
        >
          {rate}%
        </text>
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: '11px', fill: 'hsl(215, 16%, 47%)' }}
        >
          Compliant
        </text>
        <RechartsTooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface ActionItem {
  id: string;
  name: string;
  type: 'vendor' | 'tenant';
  status: string;
  property?: string;
}

function ActionItems({ vendors, tenants }: { vendors: Vendor[]; tenants: Tenant[] }) {
  const [expanded, setExpanded] = useState(false);

  const items = useMemo((): ActionItem[] => {
    const result: ActionItem[] = [];

    for (const v of vendors) {
      if (v.status !== 'compliant') {
        result.push({
          id: v.id,
          name: v.name,
          type: 'vendor',
          status: v.status,
          property: v.property?.name,
        });
      }
    }

    for (const t of tenants) {
      if (t.insurance_status !== 'compliant') {
        result.push({
          id: t.id,
          name: t.name,
          type: 'tenant',
          status: t.insurance_status,
          property: t.property?.name,
        });
      }
    }

    const priority: Record<string, number> = { expired: 0, 'non-compliant': 1, expiring: 2 };
    result.sort((a, b) => (priority[a.status] ?? 3) - (priority[b.status] ?? 3));

    return result;
  }, [vendors, tenants]);

  if (items.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-2" />
          <p>All vendors and tenants are compliant!</p>
        </div>
      </div>
    );
  }

  const displayed = expanded ? items : items.slice(0, 5);

  return (
    <div className="space-y-3">
      {displayed.map((item) => (
        <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
          <IconContainer icon={item.type === 'vendor' ? Truck : Users} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {item.property ?? 'Unassigned'} &middot; {item.type}
            </p>
          </div>
          <StatusBadge status={item.status as any} />
        </div>
      ))}
      {items.length > 5 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <>Show Less <ChevronUp className="ml-1 h-4 w-4" /></>
          ) : (
            <>View All ({items.length}) <ChevronDown className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card><CardContent className="p-5"><Skeleton className="h-[220px] w-full" /></CardContent></Card>
        <Card className="lg:col-span-2"><CardContent className="p-5"><Skeleton className="h-[220px] w-full" /></CardContent></Card>
      </div>
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
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your insurance compliance status"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Certificates"
          value={allStats.combined.total}
          icon={FileText}
          subtitle={`${allStats.vendors.total} vendors, ${allStats.tenants.total} tenants`}
        />
        <StatCard
          title="Compliant"
          value={`${complianceRate}%`}
          icon={CheckCircle2}
          subtitle={`${allStats.combined.compliant} of ${allStats.combined.total}`}
        />
        <StatCard
          title="Expiring in 30 Days"
          value={allStats.combined.expiring}
          icon={AlertTriangle}
          subtitle="Requires attention"
        />
        <StatCard
          title="Action Items"
          value={allStats.combined.non_compliant + allStats.combined.expired}
          icon={Clock}
          subtitle="Non-compliant or expired"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="combined">
              <TabsList className="w-full">
                <TabsTrigger value="combined" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="vendors" className="flex-1">Vendors</TabsTrigger>
                <TabsTrigger value="tenants" className="flex-1">Tenants</TabsTrigger>
              </TabsList>
              <TabsContent value="combined">
                <ComplianceChart stats={allStats.combined} rate={complianceRate} />
              </TabsContent>
              <TabsContent value="vendors">
                <ComplianceChart stats={allStats.vendors} rate={vendorRate} />
              </TabsContent>
              <TabsContent value="tenants">
                <ComplianceChart stats={allStats.tenants} rate={tenantRate} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionItems vendors={vendors} tenants={tenants} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
