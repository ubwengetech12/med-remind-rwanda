'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Plus, Calendar, Clock, MapPin, X, CheckCircle, XCircle, ChevronRight, User } from 'lucide-react';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string; title: string; doctor_name?: string; specialty?: string;
  appointment_date: string; appointment_time: string; location?: string;
  status: string; notes?: string;
  user?: { full_name?: string; phone: string };
}

interface Patient { id: string; full_name?: string; phone: string; }

const statusConfig: Record<string, string> = {
  scheduled: 'bg-blue-900/30 text-blue-400',
  completed: 'bg-green-900/30 text-green-400',
  cancelled: 'bg-red-900/30 text-red-400',
  missed: 'bg-yellow-900/30 text-yellow-400',
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<'all'|'today'|'upcoming'|'past'>('upcoming');
  const [form, setForm] = useState({
    user_id: '', title: '', doctor_name: '', specialty: '',
    appointment_date: '', appointment_time: '', location: '', notes: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [apptRes, patientRes] = await Promise.all([
      supabase.from('appointments').select('*, user:users(full_name, phone)').order('appointment_date', { ascending: true }),
      supabase.from('users').select('id, full_name, phone').eq('role', 'patient'),
    ]);
    setAppointments(apptRes.data || []);
    setPatients(patientRes.data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.user_id || !form.title || !form.appointment_date || !form.appointment_time) {
      toast.error('Patient, title, date and time are required'); return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('appointments').insert({ ...form, status: 'scheduled', created_by: user?.id });
      if (error) throw error;
      toast.success('Appointment scheduled!');
      setShowAdd(false);
      setForm({ user_id:'', title:'', doctor_name:'', specialty:'', appointment_date:'', appointment_time:'', location:'', notes:'' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (!error) {
      setAppointments(a => a.map(x => x.id === id ? { ...x, status } : x));
      if (selected?.id === id) setSelected(s => s ? { ...s, status } : s);
      toast.success(`Marked as ${status}`);
    }
  };

  const filtered = appointments.filter(a => {
    const d = parseISO(a.appointment_date);
    if (filter === 'today') return isToday(d);
    if (filter === 'upcoming') return isFuture(d) || isToday(d);
    if (filter === 'past') return !isFuture(d) && !isToday(d);
    return true;
  });

  return (
    <DashboardLayout title="Appointments">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            {(['all','today','upcoming','past'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-3 h-9 rounded-xl text-sm font-medium capitalize border transition-colors',
                  filter === f ? 'bg-primary-500 border-primary-500 text-white' : 'border-border text-muted hover:text-white')}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAdd(true)}
            className="ml-auto flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 h-9 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Schedule Appointment
          </button>
        </div>

        {/* Name-only list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-border animate-pulse" />
                  <div className="h-4 w-40 bg-border rounded animate-pulse" />
                  <div className="h-4 w-24 bg-border rounded animate-pulse ml-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted py-12">No appointments found</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(a => (
                <button key={a.id} onClick={() => setSelected(a)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-primary-900/40 flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">
                    {(a.user?.full_name || 'P')[0].toUpperCase()}
                  </div>
                  <span className="flex-1 text-white text-sm font-medium">{a.user?.full_name || a.user?.phone || 'Unknown'}</span>
                  <span className={cn('text-xs font-medium rounded-lg px-2 py-0.5 capitalize flex-shrink-0', statusConfig[a.status] || '')}>
                    {a.status}
                  </span>
                  <ChevronRight size={16} className="text-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-900/40 flex items-center justify-center text-primary-400 font-bold">
                  {(selected.user?.full_name || 'P')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{selected.user?.full_name || selected.user?.phone || 'Unknown'}</h3>
                  <p className="text-muted text-xs">{selected.user?.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white mt-1"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title + status */}
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold text-base">{selected.title}</h4>
                <span className={cn('text-xs font-medium rounded-lg px-2 py-1 capitalize', statusConfig[selected.status] || '')}>
                  {selected.status}
                </span>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-muted text-xs mb-1 flex items-center gap-1"><Calendar size={11} /> Date</p>
                  <p className="text-white text-sm font-medium">
                    {format(parseISO(selected.appointment_date), 'MMM d, yyyy')}
                  </p>
                  {isToday(parseISO(selected.appointment_date)) && (
                    <span className="text-xs text-primary-400 font-medium">Today</span>
                  )}
                </div>
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-muted text-xs mb-1 flex items-center gap-1"><Clock size={11} /> Time</p>
                  <p className="text-white text-sm font-medium">{selected.appointment_time}</p>
                </div>
              </div>

              {/* Doctor & Location */}
              {(selected.doctor_name || selected.location) && (
                <div className="grid grid-cols-2 gap-3">
                  {selected.doctor_name && (
                    <div className="bg-surface rounded-xl p-3">
                      <p className="text-muted text-xs mb-1 flex items-center gap-1"><User size={11} /> Doctor</p>
                      <p className="text-white text-sm font-medium">{selected.doctor_name}</p>
                      {selected.specialty && <p className="text-muted text-xs">{selected.specialty}</p>}
                    </div>
                  )}
                  {selected.location && (
                    <div className="bg-surface rounded-xl p-3">
                      <p className="text-muted text-xs mb-1 flex items-center gap-1"><MapPin size={11} /> Location</p>
                      <p className="text-white text-sm font-medium">{selected.location}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div className="bg-surface rounded-xl p-3">
                  <p className="text-muted text-xs mb-1">Notes</p>
                  <p className="text-white text-sm leading-relaxed">{selected.notes}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'scheduled' && (
                <div className="flex gap-3 pt-1">
                  <button onClick={() => updateStatus(selected.id, 'completed')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded-xl h-10 text-sm font-medium transition-colors border border-green-900/50">
                    <CheckCircle size={15} /> Mark Complete
                  </button>
                  <button onClick={() => updateStatus(selected.id, 'cancelled')}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl h-10 text-sm font-medium transition-colors border border-red-900/50">
                    <XCircle size={15} /> Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">Schedule Appointment</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-muted text-sm mb-1.5">Patient *</label>
                <select value={form.user_id} onChange={e => setForm(f => ({...f, user_id: e.target.value}))} className="dash-input w-full">
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name || p.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  placeholder="e.g. Annual Checkup" className="dash-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-sm mb-1.5">Doctor Name</label>
                  <input value={form.doctor_name} onChange={e => setForm(f => ({...f, doctor_name: e.target.value}))}
                    placeholder="Dr. Smith" className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Specialty</label>
                  <input value={form.specialty} onChange={e => setForm(f => ({...f, specialty: e.target.value}))}
                    placeholder="Cardiology" className="dash-input w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-sm mb-1.5">Date *</label>
                  <input type="date" value={form.appointment_date} min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({...f, appointment_date: e.target.value}))} className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Time *</label>
                  <input type="time" value={form.appointment_time}
                    onChange={e => setForm(f => ({...f, appointment_time: e.target.value}))} className="dash-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">Location</label>
                <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))}
                  placeholder="Clinic name or hospital" className="dash-input w-full" />
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  rows={2} className="dash-input w-full resize-none" placeholder="Instructions for the patient..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-border text-muted rounded-xl h-10 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 bg-primary-500 text-white rounded-xl h-10 font-semibold text-sm hover:bg-primary-400 disabled:opacity-50 transition-colors">
                {creating ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}