import { AlertTriangle, Clock } from 'lucide-react';
import { getDaysUntil } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ExpirationWarningProps {
  date: string;
  className?: string;
}

export function ExpirationWarning({ date, className }: ExpirationWarningProps) {
  const daysUntil = getDaysUntil(date);

  if (daysUntil > 30) return null;

  const isExpired = daysUntil < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isExpired ? 'text-destructive' : 'text-warning',
        className
      )}
    >
      {isExpired ? (
        <>
          <Clock className="h-3 w-3" aria-hidden="true" />
          Expired {Math.abs(daysUntil)} days ago
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Expires in {daysUntil} days
        </>
      )}
    </span>
  );
}
