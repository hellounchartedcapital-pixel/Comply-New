import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplianceResult } from '@/types';
import { generateComplianceInsight } from '@/services/compliance';

interface ComplianceInsightProps {
  result: ComplianceResult;
  className?: string;
}

const STATUS_STYLES = {
  compliant: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: CheckCircle2 },
  non_compliant: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: XCircle },
  expired: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: Clock },
} as const;

export function ComplianceInsight({ result, className }: ComplianceInsightProps) {
  const insight = generateComplianceInsight(result);
  const style = STATUS_STYLES[result.overall_status] ?? STATUS_STYLES['non_compliant'];
  const Icon = style.icon;

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-4', style.bg, className)}>
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', style.text)} />
      <p className={cn('text-sm', style.text)}>{insight}</p>
    </div>
  );
}
