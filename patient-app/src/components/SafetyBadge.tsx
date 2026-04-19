// SafetyBadge.tsx
import { cn } from '@/lib/utils';
import type { SafetyLevel } from '@/types';

const SAFETY_CONFIG: Record<SafetyLevel, { label: string; className: string }> = {
  green: { label: 'Safe', className: 'bg-green-900/40 text-green-400' },
  yellow: { label: 'Caution', className: 'bg-yellow-900/40 text-yellow-400' },
  red: { label: 'High Risk', className: 'bg-red-900/40 text-red-400' },
};

export function SafetyBadge({ level }: { level: SafetyLevel }) {
  const config = SAFETY_CONFIG[level];
  return (
    <span className={cn('text-xs font-medium rounded-lg px-1.5 py-0.5 flex-shrink-0', config.className)}>
      {config.label}
    </span>
  );
}
