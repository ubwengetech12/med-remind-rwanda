'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Calendar, Clock, ChevronRight, X, CheckCircle, User, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time?: string;
  notes?: string;
  visit: {
    id: string;
    patient: { full_name?: string; phone: string };
  };
}

const statusOf = (dateStr: string) => {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'today';
  if (isFuture(d)) return 'upcoming';
  return 'past';
};

const statusStyle: Record<string, string> = {
  today:    'bg-primary-900/30 text-primary-400',
  upcoming: 'bg-blue-900/30 text-blue-400',
  past:     'bg-gray-800 text-muted',
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('upcoming');
  const [selected, setSelected] = useState<Appointment | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    // Get visit IDs for this pharmacy only
    const { data: visitRows } = await supabase
      .from('patient_visits')
      .select('id')
      .eq('pharmacy_id', user?.id);
    const visitIds = (visitRows || []).map((v: any) => v.id);

    if (visitIds.length === 0) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('visit_appointments')
      .select(`
        id, appointment_date, appointment_time, notes,
        visit:patient_visits(id, patient:users(full_name, phone))
      `)
      .in('visit_id', visitIds)
      .order('appointment_date', { ascending: true });
    setAppointments((data || []) as any);
    setLoading(false);
  };

  const filtered = appointments.filter(a => {
    const s = statusOf(a.appointment_date);
    if (filter === 'all') return true;
    return s === filter;
  });

  return (
    <DashboardLayout title="Appointments">
      <div className="space-y-4">

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'today', 'upcoming', 'past'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 h-9 rounded-xl text-sm font-medium capitalize border transition-colors',
                filter === f ? 'bg-primary-500 border-primary-500 text-white' : 'border-border text-muted hover:text-white')}>
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-border animate-pulse" />
                  <div className="h-4 w-40 bg-border rounded animate-pulse flex-1" />
                  <div className="h-4 w-20 bg-border rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Calendar size={28} className="text-muted mx-auto" />
              <p className="text-muted text-sm">No appointments found</p>
              <p className="text-muted text-xs">Appointments are scheduled during patient registration</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(a => {
                const patient = (a.visit as any)?.patient;
                const name = patient?.full_name || patient?.phone || 'Unknown';
                const status = statusOf(a.appointment_date);
                return (
                  <button key={a.id} onClick={() => setSelected(a)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-primary-900/40 flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">
                      {name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{name}</p>
                      <p className="text-muted text-xs flex items-center gap-1">
                        <Calendar size={10} />
                        {format(parseISO(a.appointment_date), 'MMM d, yyyy')}
                        {a.appointment_time && <><Clock size={10} className="ml-1" />{a.appointment_time}</>}
                      </p>
                    </div>
                    <span className={cn('text-xs font-medium rounded-lg px-2 py-0.5 capitalize flex-shrink-0', statusStyle[status])}>
                      {status}
                    </span>
                    <ChevronRight size={16} className="text-muted flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-border">
              <h3 className="text-white font-semibold">Appointment Details</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {(() => {
                const patient = (selected.visit as any)?.patient;
                const name = patient?.full_name || patient?.phone || 'Unknown';
                const status = statusOf(selected.appointment_date);
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-900/40 flex items-center justify-center text-primary-400 font-bold text-lg">
                        {name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{name}</p>
                        {patient?.phone && (
                          <p className="text-muted text-xs flex items-center gap-1"><Phone size={10} />{patient.phone}</p>
                        )}
                      </div>
                      <span className={cn('ml-auto text-xs font-medium rounded-lg px-2 py-0.5 capitalize', statusStyle[status])}>
                        {status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface rounded-xl p-3">
                        <p className="text-muted text-xs mb-1 flex items-center gap-1"><Calendar size={11} /> Date</p>
                        <p className="text-white text-sm font-medium">
                          {format(parseISO(selected.appointment_date), 'MMM d, yyyy')}
                        </p>
                        {isToday(parseISO(selected.appointment_date)) && (
                          <p className="text-primary-400 text-xs font-medium mt-0.5">Today</p>
                        )}
                      </div>
                      <div className="bg-surface rounded-xl p-3">
                        <p className="text-muted text-xs mb-1 flex items-center gap-1"><Clock size={11} /> Time</p>
                        <p className="text-white text-sm font-medium">{selected.appointment_time || '—'}</p>
                      </div>
                    </div>

                    {selected.notes && (
                      <div className="bg-surface rounded-xl p-3">
                        <p className="text-muted text-xs mb-1">Notes</p>
                        <p className="text-white text-sm leading-relaxed">{selected.notes}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}