import { useRouter } from 'next/router';
import { Home, Pill, Calendar, FolderOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/medications', icon: Pill, label: 'Meds' },
  { href: '/appointments', icon: Calendar, label: 'Appts' },
  { href: '/records', icon: FolderOpen, label: 'Records' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = router.pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all min-w-[60px]',
                active ? 'text-primary-400' : 'text-muted hover:text-white'
              )}
            >
              <div className={cn('p-1.5 rounded-xl transition-all', active && 'bg-primary-500/20')}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={cn('text-xs font-medium transition-all', active && 'text-primary-400')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
