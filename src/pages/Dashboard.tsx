import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  ChevronRight,
  Eye,
  Link2,
  Truck,
  Users,
  Building2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { fetchVendors } from '@/services/vendors';
import { fetchTenants } from '@/services/tenants';
import { generatePortalLink } from '@/services/portal-links';
import { formatDate, cn } from '@/lib/utils';
import type { Vendor, Tenant, ComplianceStatus } from '@/types';

// ============================================
// TYPES
// ============================================

interface UnifiedEntity {
  id: string;
  name: string;
  type: 'vendor' | 'tenant';
  status: ComplianceStatus;
  email?: string;
  propertyName?: string;
  expirationDate?: string;
  raw: Vendor | Tenant;
}

type DashboardFilter = 'all' | 'vendors' | 'tenants' | 'non-compliant' | 'expiring' | 'expired';

// ============================================
// HERO NUMBER CARDS
// ============================================

function HeroNumbers({
  compliant,
  nonCompliant,
  expiring,
  total,
  onFilter,
}: {
  compliant: number;
  nonCompliant: number;
  expiring: number;
  total: number;
  onFilter: (filter: DashboardFilter) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <button onClick={() => onFilter('all')} className="text-left">
        <Card className="border-emerald-200 bg-emerald-50/50 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Compliant</p>
                <p className="mt-1 text-3xl font-bold text-emerald-800">{compliant}</p>
                <p className="mt-0.5 text-xs text-emerald-600">of {total} total entities</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </button>

      <button onClick={() => onFilter('non-compliant')} className="text-left">
        <Card className="border-red-200 bg-red-50/50 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Non-Compliant</p>
                <p className="mt-1 text-3xl font-bold text-red-800">{nonCompliant}</p>
                <p className="mt-0.5 text-xs text-red-600">need updated COI</p>
              </div>
              <div className="rounded-full bg-red-100 p-2.5">
                <ShieldX className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </button>

      <button onClick={() => onFilter('expiring')} className="text-left">
        <Card className="border-amber-200 bg-amber-50/50 hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Expiring Soon</p>
                <p className="mt-1 text-3xl font-bold text-amber-800">{expiring}</p>
                <p className="mt-0.5 text-xs text-amber-600">within 30 days</p>
              </div>
              <div className="rounded-full bg-amber-100 p-2.5">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}

// ============================================
// FILTER TABS
// ============================================

const FILTERS: { value: DashboardFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'tenants', label: 'Tenants' },
  { value: 'non-compliant', label: 'Non-Compliant' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
];

// ============================================
// ENTITY ROW
// ============================================

function EntityRow({
  entity,
  onView,
  onCopyLink,
}: {
  entity: UnifiedEntity;
  onView: () => void;
  onCopyLink: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
          entity.type === 'vendor' ? 'bg-blue-50' : 'bg-purple-50'
        )}>
          {entity.type === 'vendor' ? (
            <Truck className="h-4 w-4 text-blue-600" />
          ) : (
            <Users className="h-4 w-4 text-purple-600" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{entity.name}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {entity.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {entity.propertyName ?? 'No property'}{entity.email ? ` \u00B7 ${entity.email}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-2">
        {entity.expirationDate && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            Exp: {formatDate(entity.expirationDate)}
          </span>
        )}
        <StatusBadge status={entity.status} />
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onView}
            title="View details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCopyLink}
            title="Copy portal link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// NEEDS ATTENTION ALERTS
// ============================================

function NeedsAttention({
  expired,
  expiring,
  nonCompliantCount,
}: {
  expired: number;
  expiring: number;
  nonCompliantCount: number;
}) {
  if (expired === 0 && expiring === 0 && nonCompliantCount === 0) return null;

  const alerts: { icon: typeof AlertTriangle; text: string; color: string; bg: string }[] = [];
  if (expired > 0) {
    alerts.push({
      icon: ShieldX,
      text: `${expired} ${expired === 1 ? 'entity has' : 'entities have'} expired coverage`,
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
    });
  }
  if (expiring > 0) {
    alerts.push({
      icon: Clock,
      text: `${expiring} COI${expiring === 1 ? '' : 's'} expiring in the next 30 days`,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    });
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const Icon = alert.icon;
        return (
          <div key={i} className={cn('flex items-center gap-3 rounded-lg border p-3', alert.bg)}>
            <Icon className={cn('h-4 w-4 shrink-0', alert.color)} />
            <span className={cn('text-sm', alert.color)}>{alert.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// SKELETON
// ============================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');

  const { data: vendorData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'dashboard'],
    queryFn: () => fetchVendors({ pageSize: 200 }),
  });

  const { data: tenantData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', 'dashboard'],
    queryFn: () => fetchTenants({ pageSize: 200 }),
  });

  const isLoading = vendorsLoading || tenantsLoading;
  const vendors = useMemo(() => vendorData?.data ?? [], [vendorData]);
  const tenants = useMemo(() => tenantData?.data ?? [], [tenantData]);

  // Build unified entity list
  const allEntities = useMemo<UnifiedEntity[]>(() => {
    const vendorEntities: UnifiedEntity[] = vendors.map((v) => ({
      id: v.id,
      name: v.name,
      type: 'vendor' as const,
      status: v.status,
      email: v.contact_email,
      propertyName: v.property?.name,
      expirationDate: v.expiration_date,
      raw: v,
    }));

    const tenantEntities: UnifiedEntity[] = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      type: 'tenant' as const,
      status: t.insurance_status,
      email: t.email,
      propertyName: t.property?.name,
      expirationDate: t.expiration_date,
      raw: t,
    }));

    return [...vendorEntities, ...tenantEntities];
  }, [vendors, tenants]);

  // Stats
  const stats = useMemo(() => {
    const total = allEntities.length;
    const compliant = allEntities.filter((e) => e.status === 'compliant').length;
    const nonCompliant = allEntities.filter((e) => e.status === 'non-compliant').length;
    const expiring = allEntities.filter((e) => e.status === 'expiring').length;
    const expired = allEntities.filter((e) => e.status === 'expired').length;
    return { total, compliant, nonCompliant, expiring, expired };
  }, [allEntities]);

  // Filter entities
  const filteredEntities = useMemo(() => {
    let filtered = allEntities;

    switch (activeFilter) {
      case 'vendors':
        filtered = allEntities.filter((e) => e.type === 'vendor');
        break;
      case 'tenants':
        filtered = allEntities.filter((e) => e.type === 'tenant');
        break;
      case 'non-compliant':
        filtered = allEntities.filter((e) => e.status === 'non-compliant');
        break;
      case 'expiring':
        filtered = allEntities.filter((e) => e.status === 'expiring');
        break;
      case 'expired':
        filtered = allEntities.filter((e) => e.status === 'expired');
        break;
    }

    // Sort: non-compliant/expired first, then expiring, then compliant
    const statusOrder: Record<string, number> = {
      expired: 0,
      'non-compliant': 1,
      expiring: 2,
      compliant: 3,
    };

    return filtered.sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));
  }, [allEntities, activeFilter]);

  const handleCopyPortalLink = async (entity: UnifiedEntity) => {
    try {
      const link = await generatePortalLink(entity.type, entity.id);
      await navigator.clipboard.writeText(link);
      toast.success(`Portal link for ${entity.name} copied to clipboard`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate portal link');
    }
  };

  const handleViewEntity = (entity: UnifiedEntity) => {
    navigate(entity.type === 'vendor' ? '/vendors' : '/tenants', {
      state: { openDetailId: entity.id },
    });
  };

  if (isLoading) return <DashboardSkeleton />;

  // Empty state — no entities at all
  if (allEntities.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Your compliance command center" />
        <EmptyState
          icon={Building2}
          title="Welcome to SmartCOI"
          description="Get started by adding a property, then add vendors and tenants to track their insurance compliance."
          actionLabel="Add Property"
          onAction={() => navigate('/properties')}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/vendors/add')}>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-full bg-blue-50 p-2">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Add Vendor</p>
                <p className="text-xs text-muted-foreground">Upload a vendor's COI to get started</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/tenants/add')}>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-full bg-purple-50 p-2">
                <Plus className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Add Tenant</p>
                <p className="text-xs text-muted-foreground">Upload a lease or start from a template</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your compliance command center"
        actions={
          <div className="flex gap-2">
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

      {/* Hero Numbers */}
      <HeroNumbers
        compliant={stats.compliant}
        nonCompliant={stats.nonCompliant + stats.expired}
        expiring={stats.expiring}
        total={stats.total}
        onFilter={setActiveFilter}
      />

      {/* Alerts */}
      <NeedsAttention
        expired={stats.expired}
        expiring={stats.expiring}
        nonCompliantCount={stats.nonCompliant}
      />

      {/* Entity List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Entities</CardTitle>
            <span className="text-xs text-muted-foreground">{filteredEntities.length} shown</span>
          </div>
          {/* Filter Tabs */}
          <div className="flex gap-1 overflow-x-auto pt-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  activeFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {f.label}
                {f.value === 'non-compliant' && stats.nonCompliant > 0 && (
                  <span className="ml-1 text-[10px]">({stats.nonCompliant})</span>
                )}
                {f.value === 'expiring' && stats.expiring > 0 && (
                  <span className="ml-1 text-[10px]">({stats.expiring})</span>
                )}
                {f.value === 'expired' && stats.expired > 0 && (
                  <span className="ml-1 text-[10px]">({stats.expired})</span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEntities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <ShieldCheck className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No entities match this filter</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEntities.map((entity) => (
                <EntityRow
                  key={`${entity.type}-${entity.id}`}
                  entity={entity}
                  onView={() => handleViewEntity(entity)}
                  onCopyLink={() => handleCopyPortalLink(entity)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
