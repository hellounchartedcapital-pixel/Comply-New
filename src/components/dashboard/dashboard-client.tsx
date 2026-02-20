'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { sendManualFollowUp } from '@/lib/actions/notifications';
import { useUpgradeModal } from '@/components/dashboard/upgrade-modal';
import { handleActionError } from '@/lib/handle-action-error';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeDate } from '@/lib/utils';
import {
  Building2,
  Users,
  ShieldCheck,
  Clock,
  Upload,
  Eye,
  Mail,
  CheckCircle2,
  FileCheck,
  Bell,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import type {
  DashboardStats,
  StatusDistribution,
  ActionItem,
  PropertyOverview,
  ActivityEntry,
} from '@/app/(dashboard)/dashboard/page';
import type { ActivityAction } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface DashboardClientProps {
  stats: DashboardStats;
  statusDistribution: StatusDistribution;
  actionItems: ActionItem[];
  propertyOverviews: PropertyOverview[];
  activity: ActivityEntry[];
}

// ============================================================================
// Status configuration
// ============================================================================

const STATUS_CONFIG: Record<
  keyof StatusDistribution,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  compliant: {
    label: 'Compliant',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-l-emerald-500',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    color: 'text-amber-700',
    bgColor: 'bg-amber-400',
    borderColor: 'border-l-amber-400',
  },
  non_compliant: {
    label: 'Non-Compliant',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    borderColor: 'border-l-red-500',
  },
  expired: {
    label: 'Expired',
    color: 'text-red-800',
    bgColor: 'bg-red-800',
    borderColor: 'border-l-red-800',
  },
  pending: {
    label: 'Pending',
    color: 'text-slate-500',
    bgColor: 'bg-slate-400',
    borderColor: 'border-l-slate-400',
  },
  under_review: {
    label: 'Under Review',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    borderColor: 'border-l-blue-500',
  },
};

const ACTIVITY_ICONS: Partial<Record<ActivityAction, typeof Upload>> = {
  coi_uploaded: Upload,
  coi_processed: FileCheck,
  coi_review_confirmed: CheckCircle2,
  compliance_checked: ShieldCheck,
  notification_sent: Bell,
  vendor_created: PlusCircle,
  tenant_created: PlusCircle,
};

// ============================================================================
// Main component
// ============================================================================

export function DashboardClient({
  stats,
  statusDistribution,
  actionItems,
  propertyOverviews,
  activity,
}: DashboardClientProps) {
  return (
    <div className="space-y-6">
      {/* ---- Page Header with primary action ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Compliance snapshot across all properties
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/certificates/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload COI
          </Link>
        </Button>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Properties"
          value={String(stats.propertyCount)}
          icon={<Building2 className="h-5 w-5 text-slate-400" />}
          href="/dashboard/properties"
        />
        <StatCard
          label="Tracked Entities"
          value={String(stats.entityCount)}
          icon={<Users className="h-5 w-5 text-slate-400" />}
          sub="Vendors &amp; Tenants"
        />
        <ComplianceRateCard rate={stats.complianceRate} />
        <StatCard
          label="Expiring in 30 Days"
          value={String(stats.expiringSoonCount)}
          icon={<Clock className="h-5 w-5 text-slate-400" />}
          valueColor={
            stats.expiringSoonCount > 0 ? 'text-amber-600' : 'text-emerald-600'
          }
        />
      </div>

      {/* ---- Compliance Overview Bar ---- */}
      <ComplianceBar distribution={statusDistribution} />

      {/* ---- Main content: Action Queue + Activity ---- */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Priority Action Queue */}
          <ActionQueue items={actionItems} />

          {/* Properties Overview */}
          <PropertiesSection properties={propertyOverviews} />
        </div>

        {/* Recent Activity sidebar */}
        <ActivitySidebar entries={activity} />
      </div>
    </div>
  );
}

// ============================================================================
// Stats Cards
// ============================================================================

function StatCard({
  label,
  value,
  icon,
  href,
  sub,
  valueColor = 'text-foreground',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  href?: string;
  sub?: string;
  valueColor?: string;
}) {
  const content = (
    <Card className={href ? 'transition-shadow hover:shadow-md' : ''}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          {sub && (
            <p
              className="text-[10px] text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: sub }}
            />
          )}
        </div>
        {href && <ArrowRight className="ml-auto h-4 w-4 text-slate-300" />}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

function ComplianceRateCard({ rate }: { rate: number | null }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-slate-100"
            />
            {rate != null && (
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(rate / 100) * 97.4} 97.4`}
                strokeLinecap="round"
                className="text-emerald-500"
              />
            )}
          </svg>
          <span className="absolute text-[10px] font-bold text-foreground">
            {rate != null ? `${rate}%` : '—'}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Compliance Rate</p>
          {rate != null ? (
            <p className="text-2xl font-bold text-foreground">{rate}%</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Upload your first COI to start tracking
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compliance Overview Bar
// ============================================================================

function ComplianceBar({ distribution }: { distribution: StatusDistribution }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const segments: { key: keyof StatusDistribution; count: number }[] = (
    ['compliant', 'expiring_soon', 'non_compliant', 'expired', 'pending', 'under_review'] as const
  )
    .map((key) => ({ key, count: distribution[key] }))
    .filter((s) => s.count > 0);

  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Compliance Overview
        </p>

        {/* Bar */}
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className={`${STATUS_CONFIG[seg.key].bgColor} transition-all`}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${STATUS_CONFIG[seg.key].label}: ${seg.count}`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[seg.key].bgColor}`} />
              <span className="text-xs text-muted-foreground">
                {STATUS_CONFIG[seg.key].label}
              </span>
              <span className={`text-xs font-semibold ${STATUS_CONFIG[seg.key].color}`}>
                {seg.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Priority Action Queue
// ============================================================================

function ActionQueue({ items }: { items: ActionItem[] }) {
  const displayItems = items.slice(0, 20);
  const hasMore = items.length > 20;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Needs Attention</h2>
            {items.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {items.length}
              </Badge>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">All caught up!</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your portfolio is looking good.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {displayItems.map((item) => (
              <ActionItemRow key={`${item.entityType}-${item.id}`} item={item} />
            ))}
            {hasMore && (
              <div className="pt-2 text-center">
                <Link
                  href="/dashboard/properties"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View all {items.length} items
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionItemRow({ item }: { item: ActionItem }) {
  const config = STATUS_CONFIG[item.status as keyof StatusDistribution] ?? STATUS_CONFIG.pending;
  const [sending, setSending] = useState(false);
  const { showUpgradeModal } = useUpgradeModal();

  const handleFollowUp = useCallback(async () => {
    setSending(true);
    try {
      await sendManualFollowUp(item.entityType as 'vendor' | 'tenant', item.id);
      toast.success(`Follow-up sent to ${item.name}`);
    } catch (err) {
      handleActionError(err, 'Failed to send follow-up', showUpgradeModal);
    } finally {
      setSending(false);
    }
  }, [item.entityType, item.id, item.name, showUpgradeModal]);

  let description = '';
  switch (item.status) {
    case 'expired':
      description = item.earliestExpiration
        ? `Certificate expired on ${item.earliestExpiration}`
        : 'Certificate expired';
      break;
    case 'non_compliant':
      description = item.gapCount > 0
        ? `${item.gapCount} coverage gap${item.gapCount !== 1 ? 's' : ''}`
        : 'Non-compliant';
      break;
    case 'expiring_soon':
      description = item.daysUntilExpiration != null
        ? `Expires in ${item.daysUntilExpiration} day${item.daysUntilExpiration !== 1 ? 's' : ''}`
        : 'Expiring soon';
      break;
    case 'pending':
      description = 'No COI on file';
      break;
    case 'under_review':
      description = 'COI awaiting review';
      break;
    default:
      description = item.status;
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-l-4 ${config.borderColor} bg-white p-3`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${config.color}`}
          >
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {item.propertyName && <>{item.propertyName} &middot; </>}
          {description}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
          <Link
            href={`/dashboard/certificates/upload?${item.entityType}Id=${item.id}`}
          >
            <Upload className="mr-1 h-3 w-3" />
            Upload
          </Link>
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
          <Link href={`/dashboard/${item.entityType}s/${item.id}`}>
            <Eye className="mr-1 h-3 w-3" />
            View
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={sending}
          onClick={handleFollowUp}
        >
          <Mail className="mr-1 h-3 w-3" />
          {sending ? 'Sending...' : 'Follow-up'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Properties Overview
// ============================================================================

function PropertiesSection({ properties }: { properties: PropertyOverview[] }) {
  if (properties.length === 0) return null;

  const displayProperties = properties.slice(0, 6);
  const hasMore = properties.length > 6;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Properties</h2>
          {hasMore && (
            <Link
              href="/dashboard/properties"
              className="text-xs font-medium text-primary hover:underline"
            >
              View All Properties
            </Link>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayProperties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PropertyCard({ property }: { property: PropertyOverview }) {
  const compliantCount = property.compliant;
  const total = property.total;

  // Build mini compliance bar segments
  const segments: { key: keyof StatusDistribution; count: number }[] = (
    ['compliant', 'expiring_soon', 'non_compliant', 'expired', 'pending', 'under_review'] as const
  )
    .map((key) => ({ key, count: property[key] }))
    .filter((s) => s.count > 0);

  return (
    <Link href={`/dashboard/properties/${property.id}`} className="group block">
      <div className="rounded-lg border p-3 transition-shadow hover:shadow-md">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {property.name}
        </p>

        {total > 0 ? (
          <>
            {/* Mini compliance bar */}
            <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              {segments.map((seg) => (
                <div
                  key={seg.key}
                  className={`${STATUS_CONFIG[seg.key].bgColor}`}
                  style={{ width: `${(seg.count / total) * 100}%` }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {compliantCount} of {total} compliant
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No entities yet</p>
        )}
      </div>
    </Link>
  );
}

// ============================================================================
// Recent Activity Sidebar
// ============================================================================

function ActivitySidebar({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card className="h-fit">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>

        {entries.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="mt-3 space-y-0">
            {entries.map((entry, i) => {
              const Icon = ACTIVITY_ICONS[entry.action] ?? FileCheck;
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 py-2.5"
                >
                  <div className="relative flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
                      <Icon className="h-3 w-3 text-slate-500" />
                    </div>
                    {i < entries.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-slate-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-xs leading-snug text-foreground">
                      {entry.description}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatRelativeDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
