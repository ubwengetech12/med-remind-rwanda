'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, MapPin, Clock, Stethoscope, ChevronRight, CheckCircle } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useAppointmentsStore } from '@/store/appointmentsStore';
import { AddAppointmentModal } from '@/components/AddAppointmentModal';
import type { Appointment } from '@/types';
import { cn } from '@/lib/utils';

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const { appointments, fetchAppointments, updateAppointment, loading } = useAppointmentsStore();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (user) fetchAppointments(user.id);
  }, [user]);

  const getDateLabel = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEE, MMM d');
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'text-blue-400 bg-blue-900/30',
      completed: 'text-green-400 bg-green-900/30',
      cancelled: 'text-red-400 bg-red-900/30',
      missed: 'text-yellow-400 bg-yellow-900/30',
    };
    return map[status] || '';
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="bg-card px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-display font-bold">Appointments</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary-500 text-white rounded-2xl px-4 py-2 flex items-center gap-2 text-sm font-semibold shadow-glow"
          >
            <Plus size={18} />
            Schedule
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-card rounded-3xl h-28 animate-pulse" />)}
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="text-muted mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-1">No appointments</p>
            <p className="text-muted text-sm">Schedule your next doctor visit</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 bg-primary-500 text-white rounded-2xl px-6 py-3 font-semibold shadow-glow"
            >
              Schedule Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt, i) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-3xl p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{appt.title}</h3>
                    {appt.doctor_name && (
                      <p className="text-primary-400 text-sm flex items-center gap-1 mt-0.5">
                        <Stethoscope size={13} />
                        {appt.doctor_name}
                        {appt.specialty && ` · ${appt.specialty}`}
                      </p>
                    )}
                  </div>
                  <span className={cn('text-xs font-medium rounded-xl px-2 py-1', getStatusColor(appt.status))}>
                    {appt.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <span className="flex items-center gap-1.5 text-muted text-sm">
                    <Calendar size={14} className="text-primary-400" />
                    {getDateLabel(appt.appointment_date)}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted text-sm">
                    <Clock size={14} className="text-primary-400" />
                    {formatApptTime(appt.appointment_time)}
                  </span>
                  {appt.location && (
                    <span className="flex items-center gap-1.5 text-muted text-sm">
                      <MapPin size={14} className="text-primary-400" />
                      {appt.location}
                    </span>
                  )}
                </div>

                {appt.status === 'scheduled' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => updateAppointment(appt.id, { status: 'completed' })}
                      className="flex-1 bg-primary-900/50 text-primary-300 rounded-2xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary-800/50 transition-colors"
                    >
                      <CheckCircle size={15} />
                      Mark Done
                    </button>
                    <button
                      onClick={() => updateAppointment(appt.id, { status: 'cancelled' })}
                      className="flex-1 bg-red-900/30 text-red-400 rounded-2xl py-2.5 text-sm font-medium hover:bg-red-900/50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {appt.notes && (
                  <p className="text-muted text-xs mt-3 bg-surface rounded-2xl p-3">{appt.notes}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddAppointmentModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}

function formatApptTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}
