import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Upload,
  Search,
  Building2,
  Truck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { fetchVendors } from '@/services/vendors';
import { fetchTenants } from '@/services/tenants';
import { fetchProperties } from '@/services/properties';
import { formatDate, formatRelativeDate, cn } from '@/lib/utils';
import type { Vendor, Tenant, ComplianceStatus } from '@/types';

// ============================================
// TYPES
// ============================================

interface UnifiedEntity {
  id: string;
  name: string;
  type: 'vendor' | 'tenant';
  status: ComplianceStatus;
  propertyId?: string;
  propertyName?: string;
  expirationDate?: string;
  updatedAt: string;
  raw: Vendor | Tenant;
}

type StatFilter = 'compliant' | 'non_compliant' | 'expiring_soon' | null;

// ============================================
// STATUS SORT ORDER — problems at top
// ============================================

const STATUS_SORT_ORDER: Record<string, number> = {
  expired: 0,
  non_compliant: 1,
  expiring_soon: 2,
  pending: 3,
  compliant: 4,
};

// ============================================
// HELPER: resolve tenant status with legacy fallback
// ============================================

function resolveTenantStatus(tenant: Tenant): ComplianceStatus {
  if (tenant.status !== 'pending') return tenant.status;
  // Legacy fallback: insurance_status
  const legacy = tenant.insurance_status;
  if (
    legacy === 'compliant' ||
    legacy === 'non_compliant' ||
    legacy === 'expired' ||
    legacy === 'expiring_soon' ||
    legacy === 'pending'
  ) {
    return legacy as ComplianceStatus;
  }
  return tenant.status;
}

// ============================================
// STAT CARD
// ============================================

function StatCard({
  label,
  count,
  subtitle,
  icon: Icon,
  accentBg,
  accentBorder,
  accentText,
  accentIconBg,
  accentIcon,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  subtitle: string;
  icon: typeof Shield;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  accentIconBg: string;
  accentIcon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left w-full">
      <Card
        className={cn(
          'hover:shadow-md transition-all cursor-pointer',
          accentBorder,
          accentBg,
          isActive && 'ring-2 ring-offset-2 ring-primary'
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className={cn('text-sm font-medium', accentText)}>{label}</p>
              <p className={cn('mt-1 text-3xl font-bold', accentText.replace(/700/, '800'))}>
                {count}
              </p>
              <p className={cn('mt-0.5 text-xs', accentText.replace(/700/, '600'))}>
                {subtitle}
              </p>
            </div>
            <div className={cn('rounded-full p-2.5', accentIconBg)}>
              <Icon className={cn('h-5 w-5', accentIcon)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

// ============================================
// LOADING SKELETON
// ============================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function Dashboard() {
  const navigate = useNavigate();

  // --- Filters state ---
  const [statFilter, setStatFilter] = useState<StatFilter>(null);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilters, setStatusFilters] = useState<ComplianceStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data fetching ---
  const {
    data: vendorData,
    isLoading: vendorsLoading,
    error: vendorsError,
  } = useQuery({
    queryKey: ['vendors', 'dashboard'],
    queryFn: () => fetchVendors({ pageSize: 500 }),
  });

  const {
    data: tenantData,
    isLoading: tenantsLoading,
    error: tenantsError,
  } = useQuery({
    queryKey: ['tenants', 'dashboard'],
    queryFn: () => fetchTenants({ pageSize: 500 }),
  });

  const {
    data: properties,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  // Show toast for fetch errors
  if (vendorsError) toast.error('Failed to load vendors');
  if (tenantsError) toast.error('Failed to load tenants');
  if (propertiesError) toast.error('Failed to load properties');

  const isLoading = vendorsLoading || tenantsLoading || propertiesLoading;

  const vendors = useMemo(() => vendorData?.data ?? [], [vendorData]);
  const tenants = useMemo(() => tenantData?.data ?? [], [tenantData]);
  const propertyList = useMemo(() => properties ?? [], [properties]);

  // --- Build unified entity list ---
  const allEntities = useMemo<UnifiedEntity[]>(() => {
    const vendorEntities: UnifiedEntity[] = vendors.map((v) => ({
      id: v.id,
      name: v.name,
      type: 'vendor' as const,
      status: v.status,
      propertyId: v.property_id,
      propertyName: v.property?.name,
      expirationDate: v.expiration_date,
      updatedAt: v.updated_at,
      raw: v,
    }));

    const tenantEntities: UnifiedEntity[] = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      type: 'tenant' as const,
      status: resolveTenantStatus(t),
      propertyId: t.property_id,
      propertyName: t.property?.name,
      expirationDate: t.expiration_date,
      updatedAt: t.updated_at,
      raw: t,
    }));

    return [...vendorEntities, ...tenantEntities];
  }, [vendors, tenants]);

  // --- Compute stats ---
  const stats = useMemo(() => {
    const compliant = allEntities.filter((e) => e.status === 'compliant').length;
    const nonCompliant = allEntities.filter(
      (e) => e.status === 'non_compliant' || e.status === 'expired'
    ).length;
    const expiringSoon = allEntities.filter((e) => e.status === 'expiring_soon').length;
    return { compliant, nonCompliant, expiringSoon };
  }, [allEntities]);

  // --- Handle stat card clicks (toggle) ---
  const handleStatClick = useCallback(
    (filter: StatFilter) => {
      setStatFilter((prev) => (prev === filter ? null : filter));
      // Clear manual status filters when using stat cards
      setStatusFilters([]);
    },
    []
  );

  // --- Toggle status in multi-select ---
  const toggleStatusFilter = useCallback((status: ComplianceStatus) => {
    setStatFilter(null); // Clear stat card filter when using manual status filter
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }, []);

  // --- Filter and sort entities ---
  const filteredEntities = useMemo(() => {
    let filtered = allEntities;

    // Stat card filter
    if (statFilter === 'compliant') {
      filtered = filtered.filter((e) => e.status === 'compliant');
    } else if (statFilter === 'non_compliant') {
      filtered = filtered.filter(
        (e) => e.status === 'non_compliant' || e.status === 'expired'
      );
    } else if (statFilter === 'expiring_soon') {
      filtered = filtered.filter((e) => e.status === 'expiring_soon');
    }

    // Property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter((e) => e.propertyId === propertyFilter);
    }

    // Status multi-select filter
    if (statusFilters.length > 0) {
      filtered = filtered.filter((e) => statusFilters.includes(e.status));
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }

    // Search by name
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(query));
    }

    // Sort: expired -> non_compliant -> expiring_soon -> pending -> compliant
    return filtered.sort(
      (a, b) => (STATUS_SORT_ORDER[a.status] ?? 5) - (STATUS_SORT_ORDER[b.status] ?? 5)
    );
  }, [allEntities, statFilter, propertyFilter, statusFilters, typeFilter, searchQuery]);

  // --- Loading state ---
  if (isLoading) return <DashboardSkeleton />;

  // --- Empty state: no data at all ---
  const hasNoData = vendors.length === 0 && tenants.length === 0 && propertyList.length === 0;

  if (hasNoData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Your compliance command center" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
            <Building2 className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Get started by adding your first property</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a property, then add vendors and tenants to track their insurance compliance.
          </p>
          <Button onClick={() => navigate('/properties')} className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Create Property
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Quick Actions */}
      <PageHeader
        title="Dashboard"
        subtitle="Your compliance command center"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/upload')}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload COI
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/vendors/add')}>
              <Truck className="mr-1.5 h-3.5 w-3.5" />
              Add Vendor
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/tenants/add')}>
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Add Tenant
            </Button>
          </div>
        }
      />

      {/* Hero Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Compliant"
          count={stats.compliant}
          subtitle={`of ${allEntities.length} total entities`}
          icon={Shield}
          accentBg="bg-emerald-50/50"
          accentBorder="border-emerald-200"
          accentText="text-emerald-700"
          accentIconBg="bg-emerald-100"
          accentIcon="text-emerald-600"
          isActive={statFilter === 'compliant'}
          onClick={() => handleStatClick('compliant')}
        />
        <StatCard
          label="Non-Compliant"
          count={stats.nonCompliant}
          subtitle="need updated COI"
          icon={ShieldAlert}
          accentBg="bg-red-50/50"
          accentBorder="border-red-200"
          accentText="text-red-700"
          accentIconBg="bg-red-100"
          accentIcon="text-red-600"
          isActive={statFilter === 'non_compliant'}
          onClick={() => handleStatClick('non_compliant')}
        />
        <StatCard
          label="Expiring Soon"
          count={stats.expiringSoon}
          subtitle="within 30 days"
          icon={AlertTriangle}
          accentBg="bg-amber-50/50"
          accentBorder="border-amber-200"
          accentText="text-amber-700"
          accentIconBg="bg-amber-100"
          accentIcon="text-amber-600"
          isActive={statFilter === 'expiring_soon'}
          onClick={() => handleStatClick('expiring_soon')}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Property dropdown */}
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {propertyList.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status multi-select (as filter chips) */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { value: 'compliant' as ComplianceStatus, label: 'Compliant' },
              { value: 'non_compliant' as ComplianceStatus, label: 'Non-Compliant' },
              { value: 'expiring_soon' as ComplianceStatus, label: 'Expiring' },
              { value: 'expired' as ComplianceStatus, label: 'Expired' },
              { value: 'pending' as ComplianceStatus, label: 'Pending' },
            ] as const
          ).map((s) => (
            <button
              key={s.value}
              onClick={() => toggleStatusFilter(s.value)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border',
                statusFilters.includes(s.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:bg-accent'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="tenant">Tenants</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entity Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Entities</CardTitle>
            <span className="text-xs text-muted-foreground">
              {filteredEntities.length} of {allEntities.length} shown
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEntities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No entities match your filters</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatFilter(null);
                  setPropertyFilter('all');
                  setStatusFilters([]);
                  setTypeFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities.map((entity) => (
                  <TableRow
                    key={`${entity.type}-${entity.id}`}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(entity.type === 'vendor' ? '/vendors' : '/tenants', {
                        state: { openDetailId: entity.id },
                      })
                    }
                  >
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {entity.type === 'vendor' ? (
                          <Truck className="h-3 w-3" />
                        ) : (
                          <Users className="h-3 w-3" />
                        )}
                        {entity.type === 'vendor' ? 'Vendor' : 'Tenant'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entity.propertyName ?? 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entity.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entity.expirationDate ? formatDate(entity.expirationDate) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entity.updatedAt ? formatRelativeDate(entity.updatedAt) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
