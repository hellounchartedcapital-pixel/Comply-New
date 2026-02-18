import { Badge } from '@/components/ui/badge';
import type { ComplianceStatus } from '@/types';

const STATUS_CONFIG: Record<
  ComplianceStatus,
  { label: string; className: string }
> = {
  compliant: {
    label: 'Compliant',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  non_compliant: {
    label: 'Non-Compliant',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-500 text-white font-bold border-red-600',
  },
  pending: {
    label: 'Pending',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`text-[11px] ${config.className}`}>
      {config.label}
    </Badge>
  );
}
