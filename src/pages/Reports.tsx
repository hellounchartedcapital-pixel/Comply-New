import { useState } from 'react';

import {
  FileText,
  Download,
  AlertTriangle,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { IconContainer } from '@/components/shared/IconContainer';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const MONTHLY_DATA = [
  { month: 'Jul', compliant: 65, nonCompliant: 20, expiring: 10, expired: 5 },
  { month: 'Aug', compliant: 70, nonCompliant: 18, expiring: 8, expired: 4 },
  { month: 'Sep', compliant: 72, nonCompliant: 15, expiring: 9, expired: 4 },
  { month: 'Oct', compliant: 68, nonCompliant: 17, expiring: 11, expired: 4 },
  { month: 'Nov', compliant: 75, nonCompliant: 14, expiring: 7, expired: 4 },
  { month: 'Dec', compliant: 78, nonCompliant: 12, expiring: 6, expired: 4 },
];

const TREND_DATA = [
  { month: 'Jul', rate: 65 },
  { month: 'Aug', rate: 70 },
  { month: 'Sep', rate: 72 },
  { month: 'Oct', rate: 68 },
  { month: 'Nov', rate: 75 },
  { month: 'Dec', rate: 78 },
];

const QUICK_REPORTS = [
  {
    title: 'Expiration Report',
    description: 'View all policies expiring in the next 30, 60, or 90 days',
    icon: AlertTriangle,
  },
  {
    title: 'Gap Analysis',
    description: 'Identify coverage gaps across all vendors and tenants',
    icon: PieChart,
  },
  {
    title: 'Portfolio Summary',
    description: 'Complete overview of compliance across all properties',
    icon: FileText,
  },
];

export default function Reports() {
  const [entityFilter, setEntityFilter] = useState<'all' | 'vendors' | 'tenants'>('all');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Analytics and compliance reporting"
        actions={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
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
            <CardTitle>Compliance by Month</CardTitle>
            <CardDescription>Status breakdown over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="compliant" name="Compliant" fill="hsl(160, 82%, 39%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nonCompliant" name="Non-Compliant" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expiring" name="Expiring" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expired" name="Expired" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Rate Trend</CardTitle>
            <CardDescription>Overall compliance percentage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Compliance Rate"
                  stroke="hsl(160, 82%, 39%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(160, 82%, 39%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Reports</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {QUICK_REPORTS.map((report) => (
            <Card key={report.title} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-start gap-4 p-5">
                <IconContainer icon={report.icon} />
                <div>
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
