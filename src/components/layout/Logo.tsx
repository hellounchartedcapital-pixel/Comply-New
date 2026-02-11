import { cn } from '@/lib/utils';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/logo-icon.svg"
        alt="SmartCOI"
        className={cn('shrink-0', collapsed ? 'h-8 w-8' : 'h-10 w-10')}
      />
      {!collapsed && (
        <span className="text-lg font-bold text-white">
          Smart<span className="text-gradient-primary">COI</span>
        </span>
      )}
    </div>
  );
}
