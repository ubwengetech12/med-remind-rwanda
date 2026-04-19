// StatCard.tsx
import { cn } from '@/lib/utils';

const COLOR_MAP: Record<string, { bg: string; icon: string; glow: string }> = {
  blue:   { bg: 'bg-blue-900/30',   icon: 'text-blue-400',   glow: 'border-blue-800/50' },
  green:  { bg: 'bg-green-900/30',  icon: 'text-green-400',  glow: 'border-green-800/50' },
  red:    { bg: 'bg-red-900/30',    icon: 'text-red-400',    glow: 'border-red-800/50' },
  purple: { bg: 'bg-purple-900/30', icon: 'text-purple-400', glow: 'border-purple-800/50' },
  yellow: { bg: 'bg-yellow-900/30', icon: 'text-yellow-400', glow: 'border-yellow-800/50' },
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  urgent?: boolean;
}

export function StatCard({ label, value, icon, color, loading, urgent }: StatCardProps) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className={cn(
      'bg-card rounded-2xl border p-4 col-span-1',
      urgent ? c.glow + ' animate-pulse-slow' : 'border-border'
    )}>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-8 bg-border rounded-lg animate-pulse" />
          <div className="h-7 w-16 bg-border rounded animate-pulse" />
          <div className="h-4 w-20 bg-border rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', c.bg)}>
            <span className={c.icon}>{icon}</span>
          </div>
          <p className="text-white text-2xl font-bold">{value}</p>
          <p className="text-muted text-xs mt-1">{label}</p>
        </>
      )}
    </div>
  );
}
