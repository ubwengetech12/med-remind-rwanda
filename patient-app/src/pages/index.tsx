'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, parseISO } from 'date-fns';
import { Bell, AlertCircle, CheckCircle2, Clock, Calendar, TrendingUp, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMedicationsStore } from '@/store/medicationsStore';
import { useAppointmentsStore } from '@/store/appointmentsStore';
import { useNotifications } from '@/hooks/useNotifications';
import { MedCard } from '@/components/MedCard';
import { AppointmentCard } from '@/components/AppointmentCard';
import { EmergencyButton } from '@/components/EmergencyButton';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { user } = useAuthStore();
  const { medications, todayLogs, fetchMyMedications, fetchTodayLogs, logMedication } = useMedicationsStore();
  const { appointments, fetchAppointments } = useAppointmentsStore();
  const { scheduleReminders, scheduleAppointmentReminders } = useNotifications();
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMyMedications(user.id);
    fetchTodayLogs(user.id);
    fetchAppointments(user.id);
  }, [user]);

  useEffect(() => {
    if (medications.length) {
      scheduleReminders(medications);
    }
  }, [medications]);

  useEffect(() => {
    if (appointments.length) {
      scheduleAppointmentReminders(appointments);
    }
  }, [appointments]);

  const todayMeds = medications.filter((m) => m.is_active);
  const upcomingAppts = appointments.slice(0, 3);
  const takenCount = todayLogs.filter((l) => l.status === 'taken').length;
  const skippedCount = todayLogs.filter((l) => l.status === 'skipped').length;
  const adherenceRate =
    todayLogs.length > 0
      ? Math.round((takenCount / todayLogs.length) * 100)
      : 100;

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 px-5 pt-14 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between"
        >
          <div>
            <p className="text-primary-200 text-sm font-medium">{greeting},</p>
            <h1 className="text-white text-2xl font-display font-bold mt-0.5">
              {user?.full_name?.split(' ')[0] || 'Patient'}
            </h1>
            <p className="text-primary-300 text-sm mt-1">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          <button className="bg-primary-600/50 rounded-2xl p-3 relative">
            <Bell size={22} className="text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full" />
          </button>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'Taken', value: takenCount, color: 'text-green-300' },
            { label: 'Skipped', value: skippedCount, color: 'text-red-300' },
            { label: 'Adherence', value: `${adherenceRate}%`, color: 'text-yellow-300' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-2xl p-3 text-center">
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
              <p className="text-primary-200 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-6 mt-6">
        {/* Emergency Button */}
        <EmergencyButton userId={user?.id} />

        {/* Today's Medications */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-display font-semibold">Today's Medications</h2>
            <span className="text-primary-400 text-sm">{todayMeds.length} total</span>
          </div>

          {todayMeds.length === 0 ? (
            <div className="bg-card rounded-3xl p-6 text-center">
              <CheckCircle2 size={40} className="text-primary-500 mx-auto mb-2" />
              <p className="text-white font-medium">All clear!</p>
              <p className="text-muted text-sm">No medications scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMeds.map((med, i) => (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <MedCard
                    med={med}
                    logs={todayLogs}
                    onLog={(status, scheduledTime) =>
                      logMedication({
                        userId: user!.id,
                        medicationId: med.medication_id,
                        patientMedId: med.id,
                        status,
                        scheduledTime,
                      })
                    }
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Appointments */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-display font-semibold">Upcoming Appointments</h2>
            <Calendar size={18} className="text-muted" />
          </div>

          {upcomingAppts.length === 0 ? (
            <div className="bg-card rounded-3xl p-5 text-center">
              <p className="text-muted text-sm">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppts.map((appt) => (
                <AppointmentCard key={appt.id} appointment={appt} />
              ))}
            </div>
          )}
        </section>

        {/* Adherence Trend */}
        <section className="bg-card rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-400" />
            <h2 className="text-white font-semibold">Today's Progress</h2>
          </div>
          <div className="relative h-3 bg-border rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${adherenceRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-muted text-xs">{takenCount} taken</span>
            <span className="text-primary-400 text-xs font-semibold">{adherenceRate}%</span>
            <span className="text-muted text-xs">{todayMeds.length * 2} total doses</span>
          </div>
        </section>
      </div>
    </div>
  );
}
