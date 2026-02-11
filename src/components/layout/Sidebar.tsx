
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Truck,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/properties', label: 'Properties', icon: Building2 },
  { path: '/vendors', label: 'Vendors', icon: Truck },
  { path: '/tenants', label: 'Tenants', icon: Users },
  { path: '/requirements', label: 'Requirements', icon: ClipboardCheck },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();

  const sidebarContent = (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        <Logo collapsed={collapsed} />
        {mobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="rounded-lg p-1 text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="Main navigation">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onMobileClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'gradient-primary text-white shadow-sm'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', collapsed && 'mx-auto')} aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden border-t border-sidebar-border p-2 md:block">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
