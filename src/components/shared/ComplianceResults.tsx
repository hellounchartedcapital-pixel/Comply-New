import { CheckCircle2, XCircle, AlertTriangle, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComplianceResult, ComplianceItem } from '@/types';
import { cn } from '@/lib/utils';

interface ComplianceResultsProps {
  result: ComplianceResult;
  propertyName?: string;
  noRequirementsMessage?: string;
  className?: string;
}

export function ComplianceResults({
  result,
  propertyName,
  noRequirementsMessage,
  className,
}: ComplianceResultsProps) {
  if (result.items.length === 0 && noRequirementsMessage) {
    return (
      <Card className={className}>
        <CardContent className="flex items-start gap-3 p-6">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{noRequirementsMessage}</p>
            {propertyName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Set up requirements for {propertyName} to enable compliance tracking.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    compliant: { label: 'Compliant', icon: CheckCircle2, variant: 'success' as const, color: 'text-success' },
    non_compliant: { label: 'Non-Compliant', icon: XCircle, variant: 'danger' as const, color: 'text-destructive' },
    expired: { label: 'Expired', icon: Clock, variant: 'danger' as const, color: 'text-destructive' },
  };

  const overallConfig = statusConfig[result.overall_status];

  // Compute compliance percentage from items
  const totalItems = result.items.length;
  const passItems = result.items.filter(i => i.status === 'pass' || i.status === 'expiring').length;
  const compliancePercentage = totalItems > 0 ? Math.round((passItems / totalItems) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compliance Results</CardTitle>
            <CardDescription className="mt-1">
              {compliancePercentage}% compliant — {result.items.filter(f => f.status === 'pass').length} of {result.items.length} requirements met
            </CardDescription>
          </div>
          <Badge variant={overallConfig.variant} className="gap-1.5 px-3 py-1">
            <overallConfig.icon className="h-3.5 w-3.5" />
            {overallConfig.label}
          </Badge>
        </div>

        {/* Summary bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              compliancePercentage === 100
                ? 'bg-success'
                : compliancePercentage >= 50
                  ? 'bg-warning'
                  : 'bg-destructive'
            )}
            style={{ width: `${compliancePercentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.items.map((item, i) => (
          <ComplianceItemRow key={i} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}

function ComplianceItemRow({ item }: { item: ComplianceItem }) {
  const iconMap = {
    pass: { icon: CheckCircle2, color: 'text-success' },
    fail: { icon: XCircle, color: 'text-destructive' },
    not_found: { icon: XCircle, color: 'text-destructive' },
    expiring: { icon: AlertTriangle, color: 'text-warning' },
    expired: { icon: Clock, color: 'text-destructive' },
  };

  const config = iconMap[item.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
        <div>
          <p className="text-sm font-medium">{item.display_name}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Required: {item.required}</span>
            <span>Found: {item.actual ?? 'Missing'}</span>
          </div>
        </div>
      </div>
      {item.reason && (
        <span className="text-xs text-muted-foreground max-w-[200px] text-right">
          {item.status === 'expiring' ? 'Expiring soon' : item.status === 'expired' ? 'Expired' : ''}
        </span>
      )}
    </div>
  );
}
