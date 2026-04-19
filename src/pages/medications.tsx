'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Plus, Search, X, Shield, AlertTriangle, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Medication {
  id: string; name: string; generic_name?: string; description?: string;
  category?: string; restrictions?: string[]; warnings?: string[];
  interactions?: string[]; safety_level: 'red'|'yellow'|'green'; manufacturer?: string;
}

const SAFETY_OPTIONS = [
  { value: 'green', label: 'Safe', icon: <CheckCircle size={14} />, color: 'text-green-400 bg-green-900/30' },
  { value: 'yellow', label: 'Caution', icon: <AlertTriangle size={14} />, color: 'text-yellow-400 bg-yellow-900/30' },
  { value: 'red', label: 'High Risk', icon: <Shield size={14} />, color: 'text-red-400 bg-red-900/30' },
];

const EMPTY_FORM = {
  name: '', generic_name: '', description: '', category: '',
  restrictions: '', warnings: '', interactions: '',
  safety_level: 'green' as 'red'|'yellow'|'green', manufacturer: '',
};

export default function MedicationsPage() {
  const { user } = useAuthStore();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterSafety, setFilterSafety] = useState<string>('all');

  useEffect(() => { fetchMeds(); }, []);

  const fetchMeds = async () => {
    setLoading(true);
    const { data } = await supabase.from('medications').select('*').order('name');
    setMeds(data || []);
    setLoading(false);
  };

  const openEdit = (med: Medication) => {
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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const parseLines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, generic_name: form.generic_name || null,
        description: form.description || null, category: form.category || null,
        restrictions: parseLines(form.restrictions),
        warnings: parseLines(form.warnings),
        interactions: parseLines(form.interactions),
        safety_level: form.safety_level,
        manufacturer: form.manufacturer || null,
        created_by: user?.id,
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
      fetchMeds();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this medication? This cannot be undone.')) return;
    const { error } = await supabase.from('medications').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    setMeds(m => m.filter(x => x.id !== id));
  };

  const safetyConfig: Record<string, { label: string; className: string }> = {
    green: { label: 'Safe', className: 'text-green-400 bg-green-900/30' },
    yellow: { label: 'Caution', className: 'text-yellow-400 bg-yellow-900/30' },
    red: { label: 'High Risk', className: 'text-red-400 bg-red-900/30' },
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
            {['all', 'green', 'yellow', 'red'].map(s => (
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

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Category', 'Safety', 'Restrictions', 'Warnings', 'Actions'].map(h => (
                  <th key={h} className="text-left text-muted text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-border rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted py-12">No medications found</td></tr>
              ) : filtered.map(med => {
                const sc = safetyConfig[med.safety_level];
                return (
                  <tr key={med.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{med.name}</p>
                      {med.generic_name && <p className="text-muted text-xs">{med.generic_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted text-sm">{med.category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium rounded-lg px-2 py-1', sc.className)}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs max-w-[160px]">
                      <span className="line-clamp-2">{(med.restrictions || []).join(', ') || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs max-w-[160px]">
                      <span className="line-clamp-2">{(med.warnings || []).join(', ') || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(med)} className="text-muted hover:text-primary-400 transition-colors p-1">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(med.id)} className="text-muted hover:text-red-400 transition-colors p-1">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl my-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">{editing ? 'Edit Medication' : 'Add Medication'}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Name *" span={1}>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Metformin" className="dash-input" />
              </FormField>
              <FormField label="Generic Name" span={1}>
                <input value={form.generic_name} onChange={e => setForm(f => ({...f, generic_name: e.target.value}))} placeholder="Metformin HCl" className="dash-input" />
              </FormField>
              <FormField label="Category" span={1}>
                <input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="Antidiabetic" className="dash-input" />
              </FormField>
              <FormField label="Manufacturer" span={1}>
                <input value={form.manufacturer} onChange={e => setForm(f => ({...f, manufacturer: e.target.value}))} placeholder="Pharma Co." className="dash-input" />
              </FormField>
              <FormField label="Description" span={2}>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={2} className="dash-input resize-none" placeholder="Brief description of the medication..." />
              </FormField>
              <FormField label="Safety Level" span={2}>
                <div className="flex gap-3">
                  {SAFETY_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm(f => ({...f, safety_level: opt.value as any}))}
                      className={cn('flex-1 flex items-center justify-center gap-2 rounded-xl h-10 text-sm font-medium border transition-all',
                        form.safety_level === opt.value ? opt.color + ' border-current' : 'border-border text-muted hover:text-white')}>
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Restrictions (one per line)" span={1}>
                <textarea value={form.restrictions} onChange={e => setForm(f => ({...f, restrictions: e.target.value}))}
                  rows={4} className="dash-input resize-none text-sm" placeholder={"Avoid alcohol\nTake with food"} />
              </FormField>
              <FormField label="Warnings (one per line)" span={1}>
                <textarea value={form.warnings} onChange={e => setForm(f => ({...f, warnings: e.target.value}))}
                  rows={4} className="dash-input resize-none text-sm" placeholder={"May cause drowsiness\nMonitor blood pressure"} />
              </FormField>
              <FormField label="Drug Interactions (one per line)" span={2}>
                <textarea value={form.interactions} onChange={e => setForm(f => ({...f, interactions: e.target.value}))}
                  rows={2} className="dash-input resize-none text-sm" placeholder={"Alcohol\nWarfarin"} />
              </FormField>
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

function FormField({ label, span, children }: { label: string; span: number; children: React.ReactNode }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-muted text-sm mb-1.5">{label}</label>
      {children}
    </div>
  );
}
