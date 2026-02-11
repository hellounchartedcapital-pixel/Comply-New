import { SOURCE_CONFIG } from '@/constants';
import type { RequirementSource } from '@/types';
import { cn } from '@/lib/utils';

interface SourceTagProps {
  source: RequirementSource;
  className?: string;
}

export function SourceTag({ source, className }: SourceTagProps) {
  const config = SOURCE_CONFIG[source];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
