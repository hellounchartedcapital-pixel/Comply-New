import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconContainerProps {
  icon: LucideIcon;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function IconContainer({ icon: Icon, size = 'default', className }: IconContainerProps) {
  const sizeMap = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizeMap = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-accent',
        sizeMap[size],
        className
      )}
    >
      <Icon className={cn('text-primary', iconSizeMap[size])} aria-hidden="true" />
    </div>
  );
}
