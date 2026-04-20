'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Plus, Search, X, ChevronRight, Shield, AlertTriangle, CheckCircle, Edit2, Trash2, UserPlus, Clock, Pill } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { buildSmsMessage } from '@/lib/smsTemplates';
import { loadSmsSettings } from '@/lib/smsScheduler';

interface Medication {
  id: string; name: string; generic_name?: string; description?: string;
  category?: string; restrictions?: string[]; warnings?: string[];
  interactions?: string[]; safety_level: 'red'|'yellow'|'green'; manufacturer?: string;
}

interface Patient { id: string; full_name?: string; phone: string; }

const SAFETY_OPTIONS = [
  { value: 'green', label: 'Safe', color: 'text-green-400 bg-green-900/30' },
  { value: 'yellow', label: 'Caution', color: 'text-yellow-400 bg-yellow-900/30' },
  { value: 'red', label: 'High Risk', color: 'text-red-400 bg-red-900/30' },
];

const safetyConfig: Record<string, { label: string; className: string }> = {
  green: { label: 'Safe', className: 'text-green-400 bg-green-900/30' },
  yellow: { label: 'Caution', className: 'text-yellow-400 bg-yellow-900/30' },
  red: { label: 'High Risk', className: 'text-red-400 bg-red-900/30' },
};

const FOOD_OPTIONS = [
  { value: 'before_food', label: 'Before Food' },
  { value: 'after_food', label: 'After Food' },
  { value: 'with_food', label: 'With Food' },
  { value: 'empty_stomach', label: 'Empty Stomach' },
];

const EMPTY_FORM = {
  name: '', generic_name: '', description: '', category: '',
  restrictions: '', warnings: '', interactions: '',
  safety_level: 'green' as 'red'|'yellow'|'green', manufacturer: '',
};

const EMPTY_ASSIGN = {
  user_id: '',
  dosage: '',
  food_instruction: 'with_food',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  notes: '',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function MedicationsPage() {
  const { user, pharmacy, pharmacist } = useAuthStore();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [selected, setSelected] = useState<Medication | null>(null);
  const [assignMed, setAssignMed] = useState<Medication | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [assign, setAssign] = useState(EMPTY_ASSIGN);
  const [times, setTimes] = useState(['08:00']);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [filterSafety, setFilterSafety] = useState<string>('all');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [medsRes, patientsRes] = await Promise.all([
      supabase.from('medications').select('*').order('name'),
      supabase.from('users').select('id, full_name, phone').eq('role', 'patient'),
    ]);
    setMeds(medsRes.data || []);
    setPatients(patientsRes.data || []);
    setLoading(false);
  };

  const openEdit = (med: Medication, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(med);
    setForm({
      name: med.name, generic_name: med.generic_name || '',
      description: med.description || '', category: med.category || '',
      restrictions: (med.restrictions || []).join('\n'),
      warnings: (med.warnings || []).join('\n'),
      interactions: (med.interactions || []).join('\n'),
      safety_level: med.safety_level, manufacturer: med.manufacturer || '',
    });
    setShowForm(true);
  };

  const openAssign = (med: Medication, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignMed(med);
    setAssign(EMPTY_ASSIGN);
    setTimes(['08:00']);
    setShowAssign(true);
    setSelected(null);
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const parseLines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, generic_name: form.generic_name || null,
        description: form.description || null, category: form.category || null,
        restrictions: parseLines(form.restrictions), warnings: parseLines(form.warnings),
        interactions: parseLines(form.interactions), safety_level: form.safety_level,
        manufacturer: form.manufacturer || null, created_by: user?.id,
      };
      if (editing) {
        const { error } = await supabase.from('medications').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Medication updated!');
      } else {
        const { error } = await supabase.from('medications').insert(payload);
        if (error) throw error;
        toast.success('Medication added!');
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assign.user_id || !assign.dosage || times.length === 0 || !assignMed) {
      toast.error('Patient, dosage and at least one time required'); return;
    }
    setAssigning(true);
    try {
      // 1. Save to patient_medications
      const { error } = await supabase.from('patient_medications').insert({
        user_id: assign.user_id,
        medication_id: assignMed.id,
        dosage: assign.dosage,
        schedule_times: times,
        food_instruction: assign.food_instruction,
        start_date: assign.start_date,
        end_date: assign.end_date || null,
        days_of_week: ['mon','tue','wed','thu','fri','sat','sun'],
        is_active: true,
        notes: assign.notes || null,
      });
      if (error) throw error;

      // 2. Schedule SMS for each dose time (5 min before)
      const patient = patients.find(p => p.id === assign.user_id);
      const smsSettings = loadSmsSettings();
      const pharmacyName = pharmacy?.name || 'MedWise Pharmacy';
      const supportNumber = pharmacy?.phone || pharmacist?.phone || '';

      if (patient?.phone) {
        const smsTasks = times.map((time, idx) => {
          const [h, m] = time.split(':').map(Number);
          const sendMinutes = h * 60 + m - smsSettings.minutesBefore;
          const sendH = Math.floor(((sendMinutes % 1440) + 1440) % 1440 / 60);
          const sendM = ((sendMinutes % 60) + 60) % 60;
          const sendAt = `${String(sendH).padStart(2,'0')}:${String(sendM).padStart(2,'0')}`;

          const message = buildSmsMessage(smsSettings.language, {
            patientName: patient.full_name || patient.phone,
            pharmacyName,
            medicineName: assignMed.name + (assign.dosage ? ` ${assign.dosage}` : ''),
            doseNumber: idx + 1,
            totalDoses: times.length,
            exactTime: formatTime(time),
            supportNumber,
          });

          return supabase.from('sms_schedules').insert({
            user_id: assign.user_id,
            phone: patient.phone,
            medication_name: assignMed.name,
            dose_time: time,
            send_at: sendAt,
            message,
            language: smsSettings.language,
            status: 'pending',
          });
        });

        await Promise.allSettled(smsTasks);
      }

      toast.success(`${assignMed.name} assigned to ${patient?.full_name || 'patient'} with SMS reminders!`);
      setShowAssign(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign medication');
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this medication?')) return;
    const { error } = await supabase.from('medications').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    setMeds(m => m.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = meds
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || (m.category || '').toLowerCase().includes(search.toLowerCase()))
    .filter(m => filterSafety === 'all' || m.safety_level === filterSafety);

  return (
    <DashboardLayout title="Medication Database">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
            <Search size={16} className="text-muted flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medications..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted" />
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
          </div>
          <div className="flex gap-2">
            {['all','green','yellow','red'].map(s => (
              <button key={s} onClick={() => setFilterSafety(s)}
                className={cn('px-3 h-10 rounded-xl text-sm font-medium capitalize transition-colors border',
                  filterSafety === s ? 'bg-primary-500 border-primary-500 text-white' : 'border-border text-muted hover:text-white')}>
                {s === 'all' ? 'All' : safetyConfig[s]?.label}
              </button>
            ))}
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 h-10 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Add Medication
          </button>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-border animate-pulse" />
                  <div className="h-4 w-40 bg-border rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted py-12">No medications found</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(med => {
                const sc = safetyConfig[med.safety_level];
                return (
                  <div key={med.id} onClick={() => setSelected(med)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer">
                    <span className={cn('text-xs font-medium rounded-lg px-2 py-0.5 flex-shrink-0', sc.className)}>{sc.label}</span>
                    <span className="flex-1 text-white text-sm font-medium">{med.name}</span>
                    {med.category && <span className="text-muted text-xs hidden sm:block">{med.category}</span>}
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={e => openAssign(med, e)} title="Assign to patient"
                        className="p-1.5 text-muted hover:text-primary-400 transition-colors rounded-lg hover:bg-white/5">
                        <UserPlus size={14} />
                      </button>
                      <button onClick={e => openEdit(med, e)}
                        className="p-1.5 text-muted hover:text-primary-400 transition-colors rounded-lg hover:bg-white/5">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={e => handleDelete(med.id, e)}
                        className="p-1.5 text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <ChevronRight size={16} className="text-muted flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold text-lg">{selected.name}</h3>
                  <span className={cn('text-xs font-medium rounded-lg px-2 py-0.5', safetyConfig[selected.safety_level].className)}>
                    {safetyConfig[selected.safety_level].label}
                  </span>
                </div>
                {selected.generic_name && <p className="text-muted text-sm">{selected.generic_name}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white mt-1"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {selected.category && (
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-muted text-xs mb-1">Category</p>
                    <p className="text-white text-sm font-medium">{selected.category}</p>
                  </div>
                )}
                {selected.manufacturer && (
                  <div className="bg-surface rounded-xl p-3">
                    <p className="text-muted text-xs mb-1">Manufacturer</p>
                    <p className="text-white text-sm font-medium">{selected.manufacturer}</p>
                  </div>
                )}
              </div>
              {selected.description && (
                <div>
                  <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-2">Description</p>
                  <p className="text-white text-sm leading-relaxed">{selected.description}</p>
                </div>
              )}
              {(selected.restrictions || []).length > 0 && (
                <div>
                  <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-2">Restrictions</p>
                  <ul className="space-y-1">
                    {selected.restrictions!.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white">
                        <span className="text-yellow-400 mt-0.5">•</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(selected.warnings || []).length > 0 && (
                <div className="bg-yellow-900/10 border border-yellow-900/30 rounded-xl p-4">
                  <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Warnings
                  </p>
                  <ul className="space-y-1">
                    {selected.warnings!.map((w, i) => (
                      <li key={i} className="text-sm text-yellow-100/80 flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5">•</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(selected.interactions || []).length > 0 && (
                <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4">
                  <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Shield size={12} /> Drug Interactions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.interactions!.map((x, i) => (
                      <span key={i} className="bg-red-900/30 text-red-300 text-xs rounded-lg px-2 py-0.5">{x}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Assign button inside detail modal */}
              <button onClick={e => openAssign(selected, e)}
                className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-white rounded-xl h-10 text-sm font-semibold transition-colors">
                <UserPlus size={16} /> Assign to Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && assignMed && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg my-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white text-lg font-semibold">Assign to Patient</h3>
                <p className="text-primary-400 text-sm mt-0.5 flex items-center gap-1">
                  <Pill size={13} />{assignMed.name}
                </p>
              </div>
              <button onClick={() => setShowAssign(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Patient */}
              <div>
                <label className="block text-muted text-sm mb-1.5">Patient *</label>
                <select value={assign.user_id} onChange={e => setAssign(a => ({...a, user_id: e.target.value}))}
                  className="dash-input w-full">
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name || p.phone}</option>)}
                </select>
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-muted text-sm mb-1.5">Dosage *</label>
                <input value={assign.dosage} onChange={e => setAssign(a => ({...a, dosage: e.target.value}))}
                  placeholder="e.g. 500mg, 1 tablet" className="dash-input w-full" />
              </div>

              {/* Dose times */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-muted text-sm">Dose Times * <span className="text-xs">(SMS sent {loadSmsSettings().minutesBefore} min before each)</span></label>
                  <button onClick={() => setTimes(t => [...t, '12:00'])}
                    className="text-primary-400 text-xs flex items-center gap-1 hover:text-primary-300">
                    <Plus size={13} /> Add time
                  </button>
                </div>
                <div className="space-y-2">
                  {times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-xl px-3 h-10">
                        <Clock size={14} className="text-muted" />
                        <input type="time" value={t} onChange={e => setTimes(ts => ts.map((x, idx) => idx === i ? e.target.value : x))}
                          className="flex-1 bg-transparent text-white text-sm outline-none" />
                      </div>
                      {times.length > 1 && (
                        <button onClick={() => setTimes(ts => ts.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-300 p-2">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Food instruction */}
              <div>
                <label className="block text-muted text-sm mb-1.5">Food Instruction</label>
                <div className="grid grid-cols-2 gap-2">
                  {FOOD_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setAssign(a => ({...a, food_instruction: opt.value}))}
                      className={cn('rounded-xl py-2 text-sm font-medium border transition-all',
                        assign.food_instruction === opt.value
                          ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                          : 'bg-surface border-border text-muted hover:text-white')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-sm mb-1.5">Start Date</label>
                  <input type="date" value={assign.start_date} onChange={e => setAssign(a => ({...a, start_date: e.target.value}))}
                    className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">End Date</label>
                  <input type="date" value={assign.end_date} onChange={e => setAssign(a => ({...a, end_date: e.target.value}))}
                    className="dash-input w-full" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-muted text-sm mb-1.5">Notes</label>
                <textarea value={assign.notes} onChange={e => setAssign(a => ({...a, notes: e.target.value}))}
                  rows={2} className="dash-input w-full resize-none" placeholder="Special instructions..." />
              </div>

              {/* SMS notice */}
              <div className="bg-primary-900/20 border border-primary-900/40 rounded-xl p-3 text-xs text-primary-300">
                💬 SMS reminders will be scheduled automatically {loadSmsSettings().minutesBefore} min before each dose time.
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAssign(false)} className="flex-1 border border-border text-muted rounded-xl h-10 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleAssign} disabled={assigning}
                className="flex-1 bg-primary-500 text-white rounded-xl h-10 font-semibold text-sm hover:bg-primary-400 transition-colors disabled:opacity-50">
                {assigning ? 'Assigning...' : 'Assign + Schedule SMS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl my-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">{editing ? 'Edit Medication' : 'Add Medication'}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Name *', key: 'name', placeholder: 'Metformin' },
                { label: 'Generic Name', key: 'generic_name', placeholder: 'Metformin HCl' },
                { label: 'Category', key: 'category', placeholder: 'Antidiabetic' },
                { label: 'Manufacturer', key: 'manufacturer', placeholder: 'Pharma Co.' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-muted text-sm mb-1.5">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                    placeholder={f.placeholder} className="dash-input w-full" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-muted text-sm mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={2} className="dash-input w-full resize-none" placeholder="Brief description..." />
              </div>
              <div className="col-span-2">
                <label className="block text-muted text-sm mb-1.5">Safety Level</label>
                <div className="flex gap-3">
                  {SAFETY_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm(f => ({...f, safety_level: opt.value as any}))}
                      className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl h-10 text-sm font-medium border transition-all',
                        form.safety_level === opt.value ? opt.color + ' border-current' : 'border-border text-muted hover:text-white')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">Restrictions (one per line)</label>
                <textarea value={form.restrictions} onChange={e => setForm(f => ({...f, restrictions: e.target.value}))}
                  rows={4} className="dash-input w-full resize-none text-sm" placeholder={"Avoid alcohol\nTake with food"} />
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">Warnings (one per line)</label>
                <textarea value={form.warnings} onChange={e => setForm(f => ({...f, warnings: e.target.value}))}
                  rows={4} className="dash-input w-full resize-none text-sm" placeholder={"May cause drowsiness\nMonitor blood pressure"} />
              </div>
              <div className="col-span-2">
                <label className="block text-muted text-sm mb-1.5">Drug Interactions (one per line)</label>
                <textarea value={form.interactions} onChange={e => setForm(f => ({...f, interactions: e.target.value}))}
                  rows={2} className="dash-input w-full resize-none text-sm" placeholder={"Alcohol\nWarfarin"} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-border text-muted rounded-xl h-10 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-primary-500 text-white rounded-xl h-10 font-semibold text-sm hover:bg-primary-400 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update Medication' : 'Add Medication'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}