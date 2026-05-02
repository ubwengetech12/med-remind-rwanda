'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Search, Edit2, Trash2, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

type Tab = 'patients' | 'medications' | 'sms' | 'pharmacy';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('patients');

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-3">
      <div className="bg-gray-900 border border-border rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest bg-red-900/30 px-2 py-0.5 rounded">Admin</span>
            <h2 className="text-white font-semibold">System Control Panel</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(['patients','medications','sms','pharmacy'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-3 text-sm font-medium capitalize transition-colors',
                tab === t ? 'text-primary-400 border-b-2 border-primary-400' : 'text-muted hover:text-white')}>
              {t === 'sms' ? 'SMS Logs' : t === 'pharmacy' ? 'Pharmacy Info' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'patients'    && <AdminPatients />}
          {tab === 'medications' && <AdminMedications />}
          {tab === 'sms'         && <AdminSMS />}
          {tab === 'pharmacy'    && <AdminPharmacy />}
        </div>
      </div>
    </div>
  );
}

/* ─── PATIENTS ─── */
function AdminPatients() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('role', 'patient').order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('users').update({
      full_name: editing.full_name,
      phone: editing.phone,
      id_number: editing.id_number,
      village: editing.village,
      cell: editing.cell,
      sector: editing.sector,
      district: editing.district,
      insurance: editing.insurance,
    }).eq('id', editing.id);
    if (error) toast.error(error.message);
    else { toast.success('Patient updated'); setEditing(null); load(); }
    setSaving(false);
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? Cannot be undone.`)) return;
    await supabase.from('patient_visits').delete().eq('patient_id', id);
    await supabase.from('users').delete().eq('id', id);
    toast.success('Deleted');
    load();
  };

  const filtered = rows.filter(r =>
    (r.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || '').includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-border rounded-xl px-3 h-9">
          <Search size={14} className="text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted" />
        </div>
        <button onClick={load} className="text-muted hover:text-white p-2"><RefreshCw size={16} /></button>
      </div>

      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-gray-800 border border-border rounded-xl p-4">
              {editing?.id === r.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['full_name','Full Name'], ['phone','Phone'], ['id_number','ID Number'],
                      ['insurance','Insurance'], ['village','Village'], ['cell','Cell'],
                      ['sector','Sector'], ['district','District'],
                    ].map(([k, label]) => (
                      <div key={k}>
                        <label className="text-muted text-xs mb-1 block">{label}</label>
                        <input value={editing[k] || ''} onChange={e => setEditing({ ...editing, [k]: e.target.value })}
                          className="w-full bg-gray-700 border border-border rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(null)} className="flex-1 border border-border text-muted rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={save} disabled={saving}
                      className="flex-1 bg-primary-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1">
                      <Save size={14} />{saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{r.full_name || 'Unnamed'}</p>
                    <p className="text-muted text-xs">{r.phone} · {r.district || 'No district'} · {r.insurance || 'No insurance'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing({ ...r })} className="text-primary-400 hover:text-primary-300 p-1.5"><Edit2 size={15} /></button>
                    <button onClick={() => del(r.id, r.full_name)} className="text-red-400 hover:text-red-300 p-1.5"><Trash2 size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── MEDICATIONS ─── */
function AdminMedications() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('visit_prescriptions')
      .select(`
        id, medicine_name, dosage, times_per_day, duration_days, food_instruction, schedule_times,
        visit:patient_visits(
          patient_id,
          patient:users(full_name, phone)
        )
      `)
      .order('id', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('visit_prescriptions').update({
      medicine_name: editing.medicine_name,
      dosage: editing.dosage,
      times_per_day: editing.times_per_day,
      duration_days: editing.duration_days,
      food_instruction: editing.food_instruction,
    }).eq('id', editing.id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); setEditing(null); load(); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this prescription entry?')) return;
    await supabase.from('visit_prescriptions').delete().eq('id', id);
    toast.success('Deleted');
    load();
  };

  const filtered = rows.filter(r =>
    (r.medicine_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.visit?.patient?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-border rounded-xl px-3 h-9">
          <Search size={14} className="text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by medicine or patient..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted" />
        </div>
        <button onClick={load} className="text-muted hover:text-white p-2"><RefreshCw size={16} /></button>
      </div>
      <p className="text-muted text-xs">{filtered.length} prescription records</p>
      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-gray-800 border border-border rounded-xl p-4">
              {editing?.id === r.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['medicine_name','Medicine Name'], ['dosage','Dosage'],
                      ['times_per_day','Times/day'], ['duration_days','Duration (days)'],
                      ['food_instruction','Food Instruction'],
                    ].map(([k, label]) => (
                      <div key={k}>
                        <label className="text-muted text-xs mb-1 block">{label}</label>
                        <input value={editing[k] || ''} onChange={e => setEditing({ ...editing, [k]: e.target.value })}
                          className="w-full bg-gray-700 border border-border rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(null)} className="flex-1 border border-border text-muted rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={save} disabled={saving}
                      className="flex-1 bg-primary-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1">
                      <Save size={14} />{saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{r.medicine_name} {r.dosage ? `· ${r.dosage}` : ''}</p>
                    <p className="text-muted text-xs">
                      Patient: {r.visit?.patient?.full_name || 'Unknown'} · {r.visit?.patient?.phone || ''}
                    </p>
                    <p className="text-muted text-xs">{r.times_per_day}x/day · {r.duration_days || '?'} days · {r.food_instruction}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing({ ...r })} className="text-primary-400 hover:text-primary-300 p-1.5"><Edit2 size={15} /></button>
                    <button onClick={() => del(r.id)} className="text-red-400 hover:text-red-300 p-1.5"><Trash2 size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SMS LOGS ─── */
function AdminSMS() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sms_schedules')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('sms_schedules').update({
      message: editing.message,
      status: editing.status,
      send_at: editing.send_at,
    }).eq('id', editing.id);
    if (error) toast.error(error.message);
    else { toast.success('SMS updated'); setEditing(null); load(); }
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this SMS record?')) return;
    await supabase.from('sms_schedules').delete().eq('id', id);
    toast.success('Deleted');
    load();
  };

  const filtered = rows.filter(r =>
    (r.phone || '').includes(search) ||
    (r.medication_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.message || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-900/30',
    sent: 'text-green-400 bg-green-900/30',
    failed: 'text-red-400 bg-red-900/30',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-border rounded-xl px-3 h-9">
          <Search size={14} className="text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SMS..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted" />
        </div>
        <button onClick={load} className="text-muted hover:text-white p-2"><RefreshCw size={16} /></button>
      </div>
      <p className="text-muted text-xs">{filtered.length} records</p>
      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-gray-800 border border-border rounded-xl p-4">
              {editing?.id === r.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-muted text-xs mb-1 block">Message</label>
                    <textarea value={editing.message} onChange={e => setEditing({ ...editing, message: e.target.value })}
                      rows={4} className="w-full bg-gray-700 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted text-xs mb-1 block">Send At</label>
                      <input value={editing.send_at || ''} onChange={e => setEditing({ ...editing, send_at: e.target.value })}
                        className="w-full bg-gray-700 border border-border rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-muted text-xs mb-1 block">Status</label>
                      <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}
                        className="w-full bg-gray-700 border border-border rounded-lg px-3 py-1.5 text-white text-sm outline-none">
                        {['pending','sent','failed'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(null)} className="flex-1 border border-border text-muted rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={save} disabled={saving}
                      className="flex-1 bg-primary-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1">
                      <Save size={14} />{saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white text-sm font-medium">{r.phone}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor[r.status] || 'text-muted bg-gray-700')}>{r.status}</span>
                    </div>
                    <p className="text-muted text-xs">{r.medication_name} · Send at: {r.send_at}</p>
                    <p className="text-muted text-xs truncate mt-0.5">{r.message}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditing({ ...r })} className="text-primary-400 hover:text-primary-300 p-1.5"><Edit2 size={14} /></button>
                    <button onClick={() => del(r.id)} className="text-red-400 hover:text-red-300 p-1.5"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PHARMACY INFO ─── */
function AdminPharmacy() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('pharmacies').update({
      name: editing.name,
      phone: editing.phone,
      address: editing.address,
      email: editing.email,
    }).eq('id', editing.id);
    if (error) toast.error(error.message);
    else { toast.success('Pharmacy updated'); setEditing(null); load(); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={load} className="text-muted hover:text-white flex items-center gap-1 text-sm"><RefreshCw size={14} /> Refresh</button>
      {loading ? <p className="text-muted text-sm">Loading...</p> : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="bg-gray-800 border border-border rounded-xl p-4">
              {editing?.id === r.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[['name','Name'],['phone','Phone'],['address','Address'],['email','Email']].map(([k, label]) => (
                      <div key={k}>
                        <label className="text-muted text-xs mb-1 block">{label}</label>
                        <input value={editing[k] || ''} onChange={e => setEditing({ ...editing, [k]: e.target.value })}
                          className="w-full bg-gray-700 border border-border rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(null)} className="flex-1 border border-border text-muted rounded-xl py-2 text-sm">Cancel</button>
                    <button onClick={save} disabled={saving}
                      className="flex-1 bg-primary-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1">
                      <Save size={14} />{saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{r.name}</p>
                    <p className="text-muted text-xs">{r.phone} · {r.email} · {r.address}</p>
                  </div>
                  <button onClick={() => setEditing({ ...r })} className="text-primary-400 hover:text-primary-300 p-1.5"><Edit2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}