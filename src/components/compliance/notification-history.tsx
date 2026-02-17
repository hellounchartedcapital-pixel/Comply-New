import { Badge } from '@/components/ui/badge';
import { formatRelativeDate } from '@/lib/utils';
import type { Notification, NotificationType, NotificationStatus } from '@/types';

const TYPE_LABELS: Record<NotificationType, { label: string; className: string }> = {
  expiration_warning: { label: 'Expiration Warning', className: 'bg-amber-100 text-amber-800' },
  gap_notification: { label: 'Gap Alert', className: 'bg-red-100 text-red-800' },
  follow_up_reminder: { label: 'Follow-up', className: 'bg-blue-100 text-blue-800' },
  escalation: { label: 'Escalation', className: 'bg-purple-100 text-purple-800' },
};

const STATUS_LABELS: Record<NotificationStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Sent', className: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500' },
};

interface NotificationHistoryProps {
  notifications: Notification[];
}

export function NotificationHistory({ notifications }: NotificationHistoryProps) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-foreground">Notification History</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No notifications sent yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-foreground">Notification History</h3>
      <div className="mt-3 divide-y divide-slate-100">
        {notifications.map((notif) => {
          const typeConfig = TYPE_LABELS[notif.type];
          const statusConfig = STATUS_LABELS[notif.status];
          const dateStr = notif.sent_date ?? notif.scheduled_date;

          return (
            <div key={notif.id} className="py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {formatRelativeDate(dateStr)}
                </span>
                <Badge variant="outline" className={`text-[10px] ${typeConfig.className}`}>
                  {typeConfig.label}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${statusConfig.className}`}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {notif.email_subject}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
