import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  Plus,
  RefreshCcw,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
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

function ComplianceChart({ stats }: { stats: ComplianceStats }) {
  const data = [
    { name: 'Compliant', value: stats.compliant },
    { name: 'Non-Compliant', value: stats.non_compliant },
    { name: 'Expiring', value: stats.expiring },
    { name: 'Expired', value: stats.expired },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
          {data.map((_entry, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface RecentActivityItem {
  id: string;
  description: string;
  entityName: string;
  type: string;
  time: string;
}

function RecentActivity({ vendors, tenants }: { vendors: Vendor[]; tenants: Tenant[] }) {
  const activities = useMemo((): RecentActivityItem[] => {
    const items: RecentActivityItem[] = [];
    for (const v of vendors.slice(0, 5)) {
      items.push({
        id: v.id,
        description: `Vendor ${v.status === 'compliant' ? 'is compliant' : 'needs attention'}`,
        entityName: v.name,
        type: 'vendor',
        time: v.updated_at,
      });
    }
    for (const t of tenants.slice(0, 5)) {
      items.push({
        id: t.id,
        description: `Tenant ${t.insurance_status === 'compliant' ? 'is compliant' : 'needs attention'}`,
        entityName: t.name,
        type: 'tenant',
        time: t.updated_at,
      });
    }
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return items.slice(0, 10);
  }, [vendors, tenants]);

  if (activities.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 rounded-lg bg-secondary/50 p-3">
          <IconContainer
            icon={activity.type === 'vendor' ? Truck : Users}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activity.entityName}</p>
            <p className="text-xs text-muted-foreground">{activity.description}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {activity.type}
          </Badge>
        </div>
      ))}
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
        <Card><CardContent className="p-5"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
        <Card className="lg:col-span-2"><CardContent className="p-5"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: vendorData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'dashboard'],
    queryFn: () => fetchVendors({ pageSize: 100 }),
  });

  const { data: tenantData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', 'dashboard'],
    queryFn: () => fetchTenants({ pageSize: 100 }),
  });

  const isLoading = vendorsLoading || tenantsLoading;
  const vendors = vendorData?.data ?? [];
  const tenants = tenantData?.data ?? [];
  const allStats = useMemo(() => calculateStats(vendors, tenants), [vendors, tenants]);

  if (isLoading) return <DashboardSkeleton />;

  const complianceRate = allStats.combined.total > 0
    ? Math.round((allStats.combined.compliant / allStats.combined.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your insurance compliance status"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/upload')}>
              <Upload className="mr-2 h-4 w-4" />
              Upload COI
            </Button>
            <Button size="sm" onClick={() => navigate('/vendors')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Entities"
          value={allStats.combined.total}
          icon={Building2}
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
                <ComplianceChart stats={allStats.combined} />
              </TabsContent>
              <TabsContent value="vendors">
                <ComplianceChart stats={allStats.vendors} />
              </TabsContent>
              <TabsContent value="tenants">
                <ComplianceChart stats={allStats.tenants} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity vendors={vendors} tenants={tenants} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate('/upload')}>
              <Upload className="h-5 w-5 text-primary" />
              <span>Upload COI</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate('/vendors')}>
              <Truck className="h-5 w-5 text-primary" />
              <span>Add Vendor</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate('/tenants')}>
              <Users className="h-5 w-5 text-primary" />
              <span>Add Tenant</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => navigate('/reports')}>
              <RefreshCcw className="h-5 w-5 text-primary" />
              <span>Run Compliance Check</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
