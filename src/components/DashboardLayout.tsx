import { useRouter } from 'next/router';
import { LayoutDashboard, Users, Pill, Activity, Calendar, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Overview' },
  { href: '/patients', icon: Users, label: 'Patients' },
  { href: '/medications', icon: Pill, label: 'Medications' },
  { href: '/monitoring', icon: Activity, label: 'Monitoring' },
  { href: '/appointments', icon: Calendar, label: 'Appointments' },
];

export function DashboardLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-border flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-border">
          <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <span className="text-lg">💊</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">MedWise</p>
            <p className="text-muted text-xs">Pharmacist Portal</p>
          </div>
          <button className="ml-auto lg:hidden text-muted" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = router.pathname === href;
            return (
              <button key={href} onClick={() => { router.push(href); setSidebarOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                  active ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20' : 'text-muted hover:text-white hover:bg-white/5'
                )}>
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* User + Sign out */}
        <div className="px-3 py-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400 text-xs font-bold">
              {(user?.full_name || 'P')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.full_name || 'Pharmacist'}</p>
              <p className="text-muted text-xs truncate">{user?.phone}</p>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted hover:text-red-400 hover:bg-red-900/10 text-sm transition-all">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b border-border flex items-center px-6 gap-4 bg-gray-900 sticky top-0 z-20">
          <button className="lg:hidden text-muted hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h1 className="text-white font-bold text-lg">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            <span className="text-muted text-sm">Live</span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
