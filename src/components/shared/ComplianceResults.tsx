import { CheckCircle2, XCircle, AlertTriangle, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { ComplianceResult, ComplianceField } from '@/types';
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
  if (result.fields.length === 0 && noRequirementsMessage) {
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
    'non-compliant': { label: 'Non-Compliant', icon: XCircle, variant: 'danger' as const, color: 'text-destructive' },
    expiring: { label: 'Expiring Soon', icon: AlertTriangle, variant: 'warning' as const, color: 'text-warning' },
    expired: { label: 'Expired', icon: Clock, variant: 'danger' as const, color: 'text-destructive' },
  };

  const overallConfig = statusConfig[result.overall_status];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compliance Results</CardTitle>
            <CardDescription className="mt-1">
              {result.compliance_percentage}% compliant — {result.fields.filter(f => f.status === 'compliant').length} of {result.fields.length} requirements met
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
              result.compliance_percentage === 100
                ? 'bg-success'
                : result.compliance_percentage >= 50
                  ? 'bg-warning'
                  : 'bg-destructive'
            )}
            style={{ width: `${result.compliance_percentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.fields.map((field, i) => (
          <ComplianceFieldRow key={i} field={field} />
        ))}
      </CardContent>
    </Card>
  );
}

function ComplianceFieldRow({ field }: { field: ComplianceField }) {
  const iconMap = {
    compliant: { icon: CheckCircle2, color: 'text-success' },
    'non-compliant': { icon: XCircle, color: 'text-destructive' },
    expiring: { icon: AlertTriangle, color: 'text-warning' },
    expired: { icon: Clock, color: 'text-destructive' },
    'not-required': { icon: CheckCircle2, color: 'text-muted-foreground' },
  };

  const config = iconMap[field.status];
  const Icon = config.icon;

  const formatValue = (val: number | boolean | string | null) => {
    if (val === null) return 'Missing';
    if (typeof val === 'number') return formatCurrency(val);
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
        <div>
          <p className="text-sm font-medium">{field.field_name}</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Required: {formatValue(field.required_value)}</span>
            <span>Found: {formatValue(field.actual_value)}</span>
          </div>
        </div>
      </div>
      {field.expiration_date && (
        <span className="text-xs text-muted-foreground">
          Exp: {new Date(field.expiration_date).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
