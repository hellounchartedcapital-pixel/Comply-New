import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  AlertTriangle,
  PieChart as PieChartIcon,
  FileText,
  FileDown,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { IconContainer } from '@/components/shared/IconContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { PropertySelector } from '@/components/shared/PropertySelector';
import { fetchVendors } from '@/services/vendors';
import { fetchTenants } from '@/services/tenants';
import { fetchProperties } from '@/services/properties';
import { fetchOrganizationSettings } from '@/services/settings';
import { exportComplianceReport } from '@/services/pdf-export';
import type { Vendor, Tenant } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = {
  compliant: 'hsl(160, 82%, 39%)',
  nonCompliant: 'hsl(0, 84%, 60%)',
  expiring: 'hsl(38, 92%, 50%)',
  expired: 'hsl(0, 72%, 51%)',
};

function computeStats(vendors: Vendor[], tenants: Tenant[], filter: 'all' | 'vendors' | 'tenants') {
  let compliant = 0;
  let nonCompliant = 0;
  let expiring = 0;
  let expired = 0;

  if (filter === 'all' || filter === 'vendors') {
    for (const v of vendors) {
      if (v.status === 'compliant') compliant++;
      else if (v.status === 'expiring') expiring++;
      else if (v.status === 'expired') expired++;
      else nonCompliant++;
    }
  }
  if (filter === 'all' || filter === 'tenants') {
    for (const t of tenants) {
      if (t.insurance_status === 'compliant') compliant++;
      else if (t.insurance_status === 'expiring') expiring++;
      else if (t.insurance_status === 'expired') expired++;
      else nonCompliant++;
    }
  }

  return { compliant, nonCompliant, expiring, expired, total: compliant + nonCompliant + expiring + expired };
}

function exportCSV(vendors: Vendor[], tenants: Tenant[]) {
  const rows = [['Type', 'Name', 'Property', 'Status', 'Expiration Date']];

  for (const v of vendors) {
    rows.push([
      'Vendor',
      v.name,
      v.property?.name ?? 'Unassigned',
      v.status,
      v.expiration_date ?? 'N/A',
    ]);
  }

  for (const t of tenants) {
    rows.push([
      'Tenant',
      t.name,
      t.property?.name ?? 'Unassigned',
      t.insurance_status,
      t.lease_end ?? 'N/A',
    ]);
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `smartcoi-compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const navigate = useNavigate();
  const [entityFilter, setEntityFilter] = useState<'all' | 'vendors' | 'tenants'>('all');
  const [pdfPropertyId, setPdfPropertyId] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: vendorData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'reports'],
    queryFn: () => fetchVendors({ pageSize: 100 }),
  });

  const { data: tenantData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', 'reports'],
    queryFn: () => fetchTenants({ pageSize: 100 }),
  });

  const isLoading = vendorsLoading || tenantsLoading;
  const vendors = useMemo(() => vendorData?.data ?? [], [vendorData?.data]);
  const tenants = useMemo(() => tenantData?.data ?? [], [tenantData?.data]);

  const stats = useMemo(() => computeStats(vendors, tenants, entityFilter), [vendors, tenants, entityFilter]);

  const barData = useMemo(() => {
    const vendorStats = computeStats(vendors, tenants, 'vendors');
    const tenantStats = computeStats(vendors, tenants, 'tenants');

    if (entityFilter === 'vendors') {
      return [
        { category: 'Compliant', Vendors: vendorStats.compliant },
        { category: 'Non-Compliant', Vendors: vendorStats.nonCompliant },
        { category: 'Expiring', Vendors: vendorStats.expiring },
        { category: 'Expired', Vendors: vendorStats.expired },
      ];
    }
    if (entityFilter === 'tenants') {
      return [
        { category: 'Compliant', Tenants: tenantStats.compliant },
        { category: 'Non-Compliant', Tenants: tenantStats.nonCompliant },
        { category: 'Expiring', Tenants: tenantStats.expiring },
        { category: 'Expired', Tenants: tenantStats.expired },
      ];
    }
    return [
      { category: 'Compliant', Vendors: vendorStats.compliant, Tenants: tenantStats.compliant },
      { category: 'Non-Compliant', Vendors: vendorStats.nonCompliant, Tenants: tenantStats.nonCompliant },
      { category: 'Expiring', Vendors: vendorStats.expiring, Tenants: tenantStats.expiring },
      { category: 'Expired', Vendors: vendorStats.expired, Tenants: tenantStats.expired },
    ];
  }, [vendors, tenants, entityFilter]);

  const pieData = useMemo(() => {
    return [
      { name: 'Compliant', value: stats.compliant },
      { name: 'Non-Compliant', value: stats.nonCompliant },
      { name: 'Expiring', value: stats.expiring },
      { name: 'Expired', value: stats.expired },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const PIE_COLORS = [CHART_COLORS.compliant, CHART_COLORS.nonCompliant, CHART_COLORS.expiring, CHART_COLORS.expired];

  const complianceRate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" subtitle="Analytics and compliance reporting" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="p-5"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-5"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Analytics and compliance reporting"
        actions={
          <Button variant="outline" onClick={() => exportCSV(vendors, tenants)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Tabs value={entityFilter} onValueChange={(v) => setEntityFilter(v as typeof entityFilter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Breakdown</CardTitle>
            <CardDescription>Current status distribution by entity type</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.total === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {(entityFilter === 'all' || entityFilter === 'vendors') && (
                    <Bar dataKey="Vendors" name="Vendors" fill="hsl(160, 82%, 39%)" radius={[4, 4, 0, 0]} />
                  )}
                  {(entityFilter === 'all' || entityFilter === 'tenants') && (
                    <Bar dataKey="Tenants" name="Tenants" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Distribution</CardTitle>
            <CardDescription>Overall compliance rate: {complianceRate}%</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Reports</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/vendors')}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <IconContainer icon={AlertTriangle} />
              <div>
                <h3 className="font-semibold">Expiration Report</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.expiring} expiring soon, {stats.expired} expired
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/vendors')}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <IconContainer icon={PieChartIcon} />
              <div>
                <h3 className="font-semibold">Gap Analysis</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.nonCompliant} non-compliant across all entities
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/properties')}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <IconContainer icon={FileText} />
              <div>
                <h3 className="font-semibold">Portfolio Summary</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.total} total entities, {complianceRate}% compliant
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Compliance Report (PDF)
          </CardTitle>
          <CardDescription>
            Generate a professional PDF compliance report for a specific property.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PropertySelector
            value={pdfPropertyId}
            onChange={setPdfPropertyId}
            label="Select Property"
            required
          />
          <Button
            disabled={!pdfPropertyId || generatingPdf}
            onClick={async () => {
              setGeneratingPdf(true);
              try {
                const [props, orgSettings, vData, tData] = await Promise.all([
                  fetchProperties(),
                  fetchOrganizationSettings(),
                  fetchVendors({ propertyId: pdfPropertyId, pageSize: 500 }),
                  fetchTenants({ propertyId: pdfPropertyId, pageSize: 500 }),
                ]);
                const property = props.find((p) => p.id === pdfPropertyId);
                if (!property) throw new Error('Property not found');
                exportComplianceReport({
                  property,
                  vendors: vData.data,
                  tenants: tData.data,
                  companyName: orgSettings?.company_name ?? undefined,
                });
              } catch (err) {
                console.error('PDF export failed:', err);
              } finally {
                setGeneratingPdf(false);
              }
            }}
          >
            {generatingPdf ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Export PDF Report</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
