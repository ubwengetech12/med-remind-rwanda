'use client';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, Pill, Activity, Calendar,
  MessageSquare, Bell, LogOut, Menu, X, ChevronRight, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/',                      icon: LayoutDashboard, label: 'Overview' },
  { href: '/patients',              icon: Users,           label: 'Patients' },
  { href: '/medications',           icon: Pill,            label: 'Medications' },
  { href: '/monitoring',            icon: Activity,        label: 'Monitoring' },
  { href: '/appointments',          icon: Calendar,        label: 'Appointments' },
  { href: '/hospital-prescription', icon: Building2,       label: 'Hospital Rx' },
  { href: '/sms-viewer',            icon: Bell,            label: 'SMS Reminders' },
  { href: '/sms-settings',          icon: MessageSquare,   label: 'SMS Settings' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, pharmacy, pharmacist, signOut } = useAuthStore() as any;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    signOut?.();
    router.replace('/login');
  };

  const displayName = pharmacist?.name || pharmacy?.name || user?.full_name || 'Pharmacist';
  const displaySub = pharmacy?.name || 'MedWise Dashboard';

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={cn(
          'fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-border z-50 flex flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
            <div className="w-9 h-9 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💊</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{displaySub}</p>
              <p className="text-muted text-xs truncate">{displayName}</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-muted hover:text-white">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = router.pathname === href;
              return (
                <button key={href} onClick={() => { router.push(href); setSidebarOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                    active
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                      : 'text-muted hover:text-white hover:bg-white/5'
                  )}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border">
            <button onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-red-400 hover:bg-red-900/10 transition-all">
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>
      </>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur border-b border-border px-5 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted hover:text-white">
            <Menu size={22} />
          </button>
          <h1 className="text-white font-semibold text-lg">{title}</h1>
        </header>

        <main className="flex-1 p-5">
          {children}
        </main>
      </div>
    </div>
  );
}