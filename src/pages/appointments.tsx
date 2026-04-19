'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Plus, Calendar, Clock, MapPin, Search, X, CheckCircle, XCircle } from 'lucide-react';
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

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all'|'today'|'upcoming'|'past'>('upcoming');
  const [form, setForm] = useState({
    user_id: '', title: '', doctor_name: '', specialty: '',
    appointment_date: '', appointment_time: '', location: '', address: '', notes: '',
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
      toast.error('Patient, title, date and time are required');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        ...form, status: 'scheduled', created_by: user?.id,
      });
      if (error) throw error;
      toast.success('Appointment scheduled!');
      setShowAdd(false);
      setForm({ user_id:'', title:'', doctor_name:'', specialty:'', appointment_date:'', appointment_time:'', location:'', address:'', notes:'' });
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

  const statusConfig: Record<string, string> = {
    scheduled: 'bg-blue-900/30 text-blue-400',
    completed: 'bg-green-900/30 text-green-400',
    cancelled: 'bg-red-900/30 text-red-400',
    missed: 'bg-yellow-900/30 text-yellow-400',
  };

  return (
    <DashboardLayout title="Appointments">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            {['all','today','upcoming','past'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)}
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

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Patient','Title / Doctor','Date & Time','Location','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-muted text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_,i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-border rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted py-12">No appointments found</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{a.user?.full_name || 'Unknown'}</p>
                    <p className="text-muted text-xs">{a.user?.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium">{a.title}</p>
                    {a.doctor_name && <p className="text-muted text-xs">{a.doctor_name}{a.specialty && ` · ${a.specialty}`}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{format(parseISO(a.appointment_date), 'MMM d, yyyy')}</p>
                    <p className="text-muted text-xs flex items-center gap-1"><Clock size={10} />{a.appointment_time}</p>
                  </td>
                  <td className="px-4 py-3 text-muted text-sm">
                    {a.location ? <span className="flex items-center gap-1"><MapPin size={11} />{a.location}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium rounded-lg px-2 py-1 capitalize', statusConfig[a.status] || '')}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'scheduled' && (
                      <div className="flex gap-1">
                        <button onClick={() => updateStatus(a.id, 'completed')}
                          className="p-1.5 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors" title="Mark complete">
                          <CheckCircle size={15} />
                        </button>
                        <button onClick={() => updateStatus(a.id, 'cancelled')}
                          className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors" title="Cancel">
                          <XCircle size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
