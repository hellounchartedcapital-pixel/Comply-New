import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const userName = user?.user_metadata?.full_name as string | undefined ?? user?.email?.split('@')[0] ?? 'User';
  const userEmail = user?.email ?? '';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <TopBar
            userName={userName}
            userEmail={userEmail}
            onSignOut={signOut}
          />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
