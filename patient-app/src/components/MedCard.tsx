import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Pill, ChevronDown, ChevronUp } from 'lucide-react';
import { isToday } from 'date-fns';
import type { PatientMedication, Log } from '@/types';
import { SafetyBadge } from './SafetyBadge';
import { cn } from '@/lib/utils';

interface MedCardProps {
  med: PatientMedication;
  logs: Log[];
  onLog: (status: 'taken' | 'skipped', scheduledTime: string) => Promise<void>;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function getFoodLabel(instr: string): string {
  const map: Record<string, string> = {
    before_food: '🍽️ Before food',
    after_food: '🍽️ After food',
    with_food: '🍽️ With food',
    empty_stomach: '⚡ Empty stomach',
  };
  return map[instr] || instr;
}

function getScheduledTime(time: string): string {
  const now = new Date();
  const [h, m] = time.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0).toISOString();
}

export function MedCard({ med, logs, onLog }: MedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const getLogForTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return logs.find((l) => {
      if (l.medication_id !== med.medication_id) return false;
      const logDate = new Date(l.scheduled_time);
      const today = new Date();
      return (
        logDate.getFullYear() === today.getFullYear() &&
        logDate.getMonth() === today.getMonth() &&
        logDate.getDate() === today.getDate() &&
        logDate.getHours() === h &&
        logDate.getMinutes() === m
      );
    });
  };

  const handleLog = async (status: 'taken' | 'skipped', time: string) => {
    setLoading((prev) => ({ ...prev, [time]: true }));
    try {
      await onLog(status, getScheduledTime(time));
    } finally {
      setLoading((prev) => ({ ...prev, [time]: false }));
    }
  };

  const allTaken = med.schedule_times.every((t) => getLogForTime(t)?.status === 'taken');

  return (
    <div className={cn(
      'bg-card rounded-3xl border overflow-hidden transition-all',
      allTaken ? 'border-primary-800/60' : 'border-border'
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
          allTaken ? 'bg-primary-900/50' : 'bg-surface'
        )}>
          <Pill size={22} className={allTaken ? 'text-primary-400' : 'text-muted'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold truncate">{med.medication?.name}</h3>
            <SafetyBadge level={med.medication?.safety_level || 'green'} />
          </div>
          <p className="text-muted text-sm">{med.dosage} · {getFoodLabel(med.food_instruction)}</p>
        </div>
        {allTaken ? (
          <CheckCircle2 size={20} className="text-primary-400 flex-shrink-0" />
        ) : (
          expanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />
        )}
      </button>

      {/* Schedule times */}
      {!allTaken && (
        <div className="px-4 pb-4 space-y-2.5">
          {med.schedule_times.map((time) => {
            const log = getLogForTime(time);
            const isLoading = loading[time];
            const isTaken = log?.status === 'taken';
            const isSkipped = log?.status === 'skipped';

            return (
              <div key={time} className={cn(
                'flex items-center gap-3 rounded-2xl p-3 transition-all',
                isTaken ? 'bg-primary-900/30' : isSkipped ? 'bg-red-900/20' : 'bg-surface'
              )}>
                <div className="flex items-center gap-1.5 flex-1">
                  <Clock size={14} className={isTaken ? 'text-primary-400' : 'text-muted'} />
                  <span className={cn('text-sm font-medium', isTaken ? 'text-primary-300' : 'text-white')}>
                    {formatTime(time)}
                  </span>
                </div>

                {isTaken ? (
                  <span className="text-primary-400 text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} /> Taken
                  </span>
                ) : isSkipped ? (
                  <span className="text-red-400 text-xs font-medium flex items-center gap-1">
                    <XCircle size={14} /> Skipped
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLog('skipped', time)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 bg-red-900/40 text-red-400 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-red-900/60 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Skip
                    </button>
                    <button
                      onClick={() => handleLog('taken', time)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 bg-primary-500/20 text-primary-300 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-primary-500/40 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      {isLoading ? '...' : 'Taken'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded info */}
      {expanded && med.medication && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border px-4 py-4 space-y-3"
        >
          {med.medication.description && (
            <p className="text-muted text-sm">{med.medication.description}</p>
          )}
          {med.medication.restrictions && med.medication.restrictions.length > 0 && (
            <div>
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">Restrictions</p>
              {med.medication.restrictions.map((r, i) => (
                <p key={i} className="text-white text-sm py-1 border-b border-border/50 last:border-0">⚠️ {r}</p>
              ))}
            </div>
          )}
          {med.medication.warnings && med.medication.warnings.length > 0 && (
            <div>
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">Warnings</p>
              {med.medication.warnings.map((w, i) => (
                <p key={i} className="text-white text-sm py-1 border-b border-border/50 last:border-0">🚫 {w}</p>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}