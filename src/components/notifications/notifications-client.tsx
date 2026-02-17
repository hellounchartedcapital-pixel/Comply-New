'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cancelNotification } from '@/lib/actions/notifications';
import { formatRelativeDate } from '@/lib/utils';
import {
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Mail,
  AlertTriangle,
  Repeat,
  ShieldAlert,
} from 'lucide-react';
import type { Notification, NotificationStatus, NotificationType } from '@/types';

// ============================================================================
// Props
// ============================================================================

interface NotificationsClientProps {
  notifications: Notification[];
  entityNameMap: Record<string, string>;
}

// ============================================================================
// Config
// ============================================================================

type TabKey = 'all' | 'scheduled' | 'sent' | 'failed';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'sent', label: 'Sent' },
  { key: 'failed', label: 'Failed' },
];

const STATUS_BADGE: Record<NotificationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Bell }> = {
  scheduled: { label: 'Scheduled', variant: 'secondary', icon: Clock },
  sent: { label: 'Sent', variant: 'default', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: Ban },
};

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: typeof Bell }> = {
  expiration_warning: { label: 'Expiration Warning', icon: AlertTriangle },
  gap_notification: { label: 'Gap Notification', icon: ShieldAlert },
  follow_up_reminder: { label: 'Follow-Up Reminder', icon: Repeat },
  escalation: { label: 'Escalation', icon: Mail },
};

// ============================================================================
// Main Component
// ============================================================================

export function NotificationsClient({
  notifications,
  entityNameMap,
}: NotificationsClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter((n) => n.status === activeTab);

  const counts = {
    all: notifications.length,
    scheduled: notifications.filter((n) => n.status === 'scheduled').length,
    sent: notifications.filter((n) => n.status === 'sent').length,
    failed: notifications.filter((n) => n.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage compliance notifications sent to vendors and tenants.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({counts[tab.key]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Bell className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              No notifications
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTab === 'all'
                ? 'Notifications will appear here once entities are tracked and certificates expire.'
                : `No ${activeTab} notifications.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => (
            <NotificationRow
              key={notif.id}
              notification={notif}
              entityName={entityNameMap[notif.vendor_id ?? notif.tenant_id ?? ''] ?? 'Unknown'}
              entityType={notif.vendor_id ? 'vendor' : 'tenant'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Notification Row
// ============================================================================

function NotificationRow({
  notification,
  entityName,
  entityType,
}: {
  notification: Notification;
  entityName: string;
  entityType: 'vendor' | 'tenant';
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const statusConfig = STATUS_BADGE[notification.status];
  const typeConfig = TYPE_CONFIG[notification.type];
  const StatusIcon = statusConfig.icon;
  const TypeIcon = typeConfig.icon;

  const entityId = notification.vendor_id ?? notification.tenant_id;
  const entityLink = entityId ? `/dashboard/${entityType}s/${entityId}` : null;

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelNotification(notification.id);
      toast.success('Notification cancelled');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <TypeIcon className="h-4 w-4 text-slate-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {typeConfig.label}
            </p>
            <Badge variant={statusConfig.variant} className="text-[10px]">
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              To:{' '}
              {entityLink ? (
                <Link href={entityLink} className="font-medium text-foreground hover:underline">
                  {entityName}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{entityName}</span>
              )}
            </span>
            <span>Subject: {notification.email_subject}</span>
          </div>

          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Scheduled: {formatRelativeDate(notification.scheduled_date)}</span>
            {notification.sent_date && (
              <span>Sent: {formatRelativeDate(notification.sent_date)}</span>
            )}
          </div>
        </div>

        {notification.status === 'scheduled' && (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
