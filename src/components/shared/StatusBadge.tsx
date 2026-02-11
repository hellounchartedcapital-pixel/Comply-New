import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG } from '@/constants';
import type { ComplianceStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ComplianceStatus | 'not-required';
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  const variantMap: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
    compliant: 'success',
    'non-compliant': 'danger',
    expiring: 'warning',
    expired: 'danger',
    'not-required': 'secondary',
  };

  return (
    <Badge variant={variantMap[status] ?? 'secondary'} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      <span>{config.label}</span>
    </Badge>
  );
}
