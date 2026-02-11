import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  text?: string;
}

export function LoadingSpinner({ className, size = 'default', text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeMap[size])} aria-hidden="true" />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}
