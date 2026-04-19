import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { Calendar, Clock, MapPin, Stethoscope } from 'lucide-react';
import type { Appointment } from '@/types';
import { cn } from '@/lib/utils';

export function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  const date = parseISO(a.appointment_date);
  const dateLabel = isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEE, MMM d');
  const [h, m] = a.appointment_time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h || 12;
  const timeLabel = `${hour}:${m.toString().padStart(2, '0')} ${period}`;

  const urgency = isToday(date) ? 'border-yellow-700/60 bg-yellow-900/10' : 'border-border';

  return (
    <div className={cn('bg-card rounded-3xl border p-4', urgency)}>
      <div className="flex items-start gap-3">
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0',
          isToday(date) ? 'bg-yellow-900/40' : 'bg-surface')}>
          <Calendar size={20} className={isToday(date) ? 'text-yellow-400' : 'text-muted'} />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{a.title}</p>
          {a.doctor_name && (
            <p className="text-primary-400 text-sm flex items-center gap-1 mt-0.5">
              <Stethoscope size={12} />{a.doctor_name}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-muted text-xs flex items-center gap-1">
              <Clock size={11} />{dateLabel} · {timeLabel}
            </span>
            {a.location && (
              <span className="text-muted text-xs flex items-center gap-1">
                <MapPin size={11} />{a.location}
              </span>
            )}
          </div>
        </div>
        {isToday(date) && (
          <span className="bg-yellow-900/40 text-yellow-400 text-xs rounded-xl px-2 py-1 flex-shrink-0">Today</span>
        )}
      </div>
    </div>
  );
}
