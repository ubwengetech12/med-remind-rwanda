'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Plus, Search, Phone, Heart, ChevronRight, X, User, AlertCircle, Pill } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface Patient {
  id: string; phone: string; role: string; full_name?: string;
  blood_type?: string; allergies?: string[]; created_at: string;
  _medCount?: number; _adherence?: number;
}

export default function PatientsPage() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [patientMeds, setPatientMeds] = useState<any[]>([]);
  const [newPatient, setNewPatient] = useState({ phone: '', full_name: '', blood_type: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('role', 'patient').order('created_at', { ascending: false });
    const patients = data || [];

    // Enrich with medication count + adherence
    const enriched = await Promise.all(patients.map(async (p) => {
      const [medsRes, logsRes] = await Promise.all([
        supabase.from('patient_medications').select('id', { count: 'exact' }).eq('user_id', p.id).eq('is_active', true),
        supabase.from('logs').select('status').eq('user_id', p.id).gte('scheduled_time', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      const logs = logsRes.data || [];
      const taken = logs.filter(l => l.status === 'taken').length;
      const adherence = logs.length > 0 ? Math.round((taken / logs.length) * 100) : null;
      return { ...p, _medCount: medsRes.count || 0, _adherence: adherence };
    }));
    setPatients(enriched);
    setLoading(false);
  };

  const fetchPatientMeds = async (patientId: string) => {
    const { data } = await supabase.from('patient_medications').select('*, medication:medications(*)').eq('user_id', patientId).eq('is_active', true);
    setPatientMeds(data || []);
  };

  const selectPatient = (p: Patient) => {
    setSelected(p);
    fetchPatientMeds(p.id);
  };

  const handleCreatePatient = async () => {
    if (!newPatient.phone || !newPatient.full_name) { toast.error('Name and phone required'); return; }
    setCreating(true);
    try {
      // In production this would use Supabase Admin API or invite flow
      // For demo, we insert directly (bypasses auth - use admin API in prod)
      const { error } = await supabase.from('users').insert({
        phone: newPatient.phone,
        full_name: newPatient.full_name,
        blood_type: newPatient.blood_type || null,
        role: 'patient',
      });
      if (error) throw error;
      toast.success('Patient created!');
      setShowAdd(false);
      setNewPatient({ phone: '', full_name: '', blood_type: '' });
      fetchPatients();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create patient');
    } finally {
      setCreating(false);
    }
  };

  const filtered = patients.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const adherenceColor = (n: number | null | undefined) => {
    if (n == null) return 'text-muted';
    if (n >= 80) return 'text-green-400';
    if (n >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <DashboardLayout title="Patients">
      <div className="flex gap-6 h-full">
        {/* Patient list */}
        <div className="flex-1 space-y-4">
          {/* Toolbar */}
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
              <Search size={16} className="text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted" />
              {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
            </div>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={16} /> Add Patient
            </button>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Patient', 'Phone', 'Blood Type', 'Active Meds', '7-Day Adherence', ''].map(h => (
                    <th key={h} className="text-left text-muted text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-border rounded animate-pulse" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted py-12">No patients found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} onClick={() => selectPatient(p)}
                    className={cn('cursor-pointer hover:bg-white/5 transition-colors', selected?.id === p.id && 'bg-primary-900/20')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">
                          {(p.full_name || 'P')[0].toUpperCase()}
                        </div>
                        <span className="text-white text-sm font-medium">{p.full_name || 'Unnamed Patient'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-sm">{p.phone}</td>
                    <td className="px-4 py-3">
                      {p.blood_type ? (
                        <span className="flex items-center gap-1 text-red-400 text-sm"><Heart size={12} />{p.blood_type}</span>
                      ) : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-white text-sm"><Pill size={12} className="text-primary-400" />{p._medCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-semibold', adherenceColor(p._adherence))}>
                        {p._adherence != null ? `${p._adherence}%` : 'No data'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight size={16} className="text-muted" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient detail panel */}
        {selected && (
          <div className="w-80 bg-card border border-border rounded-2xl p-5 space-y-5 self-start sticky top-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary-900/40 flex items-center justify-center text-primary-400 text-xl font-bold mb-3">
                  {(selected.full_name || 'P')[0].toUpperCase()}
                </div>
                <h3 className="text-white font-semibold">{selected.full_name || 'Unnamed'}</h3>
                <p className="text-muted text-sm flex items-center gap-1 mt-0.5"><Phone size={12} />{selected.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface rounded-xl p-3">
                <p className="text-muted text-xs mb-1">Blood Type</p>
                <p className="text-white text-sm font-medium flex items-center gap-1">
                  {selected.blood_type ? <><Heart size={12} className="text-red-400" />{selected.blood_type}</> : '—'}
                </p>
              </div>
              <div className="bg-surface rounded-xl p-3">
                <p className="text-muted text-xs mb-1">Active Meds</p>
                <p className="text-white text-sm font-medium">{selected._medCount}</p>
              </div>
            </div>

            {selected.allergies && selected.allergies.length > 0 && (
              <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-3">
                <p className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1"><AlertCircle size={12} />Allergies</p>
                <div className="flex flex-wrap gap-1">
                  {selected.allergies.map(a => (
                    <span key={a} className="bg-red-900/40 text-red-300 text-xs rounded-lg px-2 py-0.5">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-3">Current Medications</p>
              {patientMeds.length === 0 ? (
                <p className="text-muted text-sm">No active medications</p>
              ) : (
                <div className="space-y-2">
                  {patientMeds.map(m => (
                    <div key={m.id} className="bg-surface rounded-xl p-3">
                      <p className="text-white text-sm font-medium">{m.medication?.name}</p>
                      <p className="text-muted text-xs mt-0.5">{m.dosage} · {m.schedule_times.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add patient modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">Add New Patient</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Sarah Johnson' },
                { label: 'Phone Number *', key: 'phone', type: 'tel', placeholder: '+1 234 567 8900' },
                { label: 'Blood Type', key: 'blood_type', type: 'text', placeholder: 'O+' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-muted text-sm mb-1">{f.label}</label>
                  <input type={f.type} value={(newPatient as any)[f.key]}
                    onChange={e => setNewPatient(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-primary-500 placeholder:text-muted" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-border text-muted rounded-xl h-10 hover:text-white transition-colors text-sm">Cancel</button>
              <button onClick={handleCreatePatient} disabled={creating}
                className="flex-1 bg-primary-500 text-white rounded-xl h-10 font-semibold text-sm hover:bg-primary-400 transition-colors disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
