import { CONFIDENCE_THRESHOLDS } from '@/constants';
import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  score: number;
  className?: string;
}

export function ConfidenceIndicator({ score, className }: ConfidenceIndicatorProps) {
  const level =
    score >= CONFIDENCE_THRESHOLDS.high
      ? 'high'
      : score >= CONFIDENCE_THRESHOLDS.medium
        ? 'medium'
        : 'low';

  const colorMap = {
    high: 'text-success bg-success/15',
    medium: 'text-warning bg-warning/15',
    low: 'text-destructive bg-destructive/15',
  };

  const labelMap = {
    high: 'High confidence',
    medium: 'Verify',
    low: 'Low confidence',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        colorMap[level],
        className
      )}
      title={`${score}% confidence`}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-success': level === 'high',
          'bg-warning': level === 'medium',
          'bg-destructive': level === 'low',
        })}
        aria-hidden="true"
      />
      {labelMap[level]} ({score}%)
    </span>
  );
}
