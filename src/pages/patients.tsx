'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  Plus, Search, X, ChevronRight, ChevronDown, ChevronUp, Phone, MapPin,
  ShieldCheck, Activity, Pill, Calendar, FlaskConical,
  AlertTriangle, UserPlus, Clock, Trash2, CheckCircle, Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface Patient {
  id: string; phone: string; full_name?: string;
  id_number?: string; village?: string; cell?: string;
  sector?: string; district?: string; insurance?: string;
  created_at: string; _visitCount?: number;
}

interface Visit {
  id: string; visit_date: string; status: string;
  visit_diseases?: { reported_by_patient?: string; found_by_doctor?: string }[];
  visit_tests?: { has_test: boolean; test_name?: string }[];
  visit_prescriptions?: { medicine_name: string; type: string; dosage?: string; times_per_day?: number; quantity_given?: number }[];
  visit_avoidances?: { avoidance: string }[];
  visit_appointments?: { appointment_date: string; appointment_time?: string; notes?: string }[];
}

interface PatientMedication {
  id: string;
  medication_id: string;
  dosage: string;
  schedule_times: string[];
  food_instruction: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  medication?: { name: string; category?: string; safety_level: string };
}

const FOOD_LABELS: Record<string, string> = {
  before_food: 'Before Food',
  after_food: 'After Food',
  with_food: 'With Food',
  empty_stomach: 'Empty Stomach',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export default function PatientsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patientMeds, setPatientMeds] = useState<PatientMedication[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTab, setDetailTab] = useState<'visits' | 'medications'>('visits');

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setLoading(true);
    const { data: visitRows } = await supabase
      .from('patient_visits')
      .select('patient_id')
      .eq('pharmacy_id', user?.id);

    const patientIds = Array.from(new Set((visitRows || []).map((v: any) => v.patient_id).filter(Boolean)));

    if (patientIds.length === 0) {
      setPatients([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'patient')
      .in('id', patientIds)
      .order('created_at', { ascending: false });

    setPatients(data || []);
    setLoading(false);
  };

  const openDetail = async (p: Patient) => {
    setSelected(p);
    setVisits([]);
    setPatientMeds([]);
    setExpandedVisit(null);
    setDetailTab('visits');
    setLoadingDetail(true);

    const [visitsRes, medsRes] = await Promise.all([
      supabase
        .from('patient_visits')
        .select(`
          id, visit_date, status,
          visit_diseases(reported_by_patient, found_by_doctor),
          visit_tests(has_test, test_name),
          visit_prescriptions(medicine_name, type, dosage, times_per_day, quantity_given),
          visit_avoidances(avoidance),
          visit_appointments(appointment_date, appointment_time, notes)
        `)
        .eq('patient_id', p.id)
        .eq('pharmacy_id', user?.id)
        .order('visit_date', { ascending: false }),

      supabase
        .from('patient_medications')
        .select(`
          id, medication_id, dosage, schedule_times, food_instruction,
          start_date, end_date, is_active, notes, created_at,
          medication:medications(name, category, safety_level)
        `)
        .eq('user_id', p.id)
        .order('created_at', { ascending: false }),
    ]);

    setVisits(visitsRes.data || []);
    setPatientMeds((medsRes.data || []) as any);
    setSelected({ ...p, _visitCount: visitsRes.data?.length || 0 });
    setLoadingDetail(false);
  };

  const deletePatient = async (p: Patient) => {
    if (!confirm(`Delete ${p.full_name || 'this patient'}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await supabase.from('patient_visits').delete().eq('patient_id', p.id).eq('pharmacy_id', user?.id);
      const { error } = await supabase.from('users').delete().eq('id', p.id);
      if (error) throw error;
      toast.success('Patient deleted');
      setSelected(null);
      fetchPatients();
    } catch {
      toast.error('Failed to delete patient');
    } finally {
      setDeleting(false);
    }
  };

  const safetyColor: Record<string, string> = {
    green: 'text-green-400 bg-green-900/30',
    yellow: 'text-yellow-400 bg-yellow-900/30',
    red: 'text-red-400 bg-red-900/30',
  };

  const filtered = patients.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search) ||
    (p.id_number || '').includes(search)
  );

  return (
    <DashboardLayout title="Patients">
      <div className="space-y-4">

        {/* Toolbar */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
            <Search size={16} className="text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted" />
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
          </div>
          <button
            onClick={() => router.push('/patients/register')}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 rounded-xl text-sm font-semibold transition-colors h-10 whitespace-nowrap">
            <UserPlus size={16} /> Register Patient
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-muted text-sm">
          <Activity size={14} />
          <span>{patients.length} patient{patients.length !== 1 ? 's' : ''} registered</span>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-border animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-40 bg-border rounded animate-pulse" />
                    <div className="h-3 w-28 bg-border rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <UserPlus size={32} className="text-muted mx-auto" />
              <p className="text-muted text-sm">No patients found</p>
              <button onClick={() => router.push('/patients/register')}
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                <Plus size={14} /> Register First Patient
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(p => (
                <button key={p.id} onClick={() => openDetail(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400 text-sm font-bold flex-shrink-0">
                    {(p.full_name || 'P')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.full_name || 'Unnamed Patient'}</p>
                    <p className="text-muted text-xs truncate flex items-center gap-1">
                      <Phone size={10} />{p.phone}
                      {p.district && <><span className="mx-1">·</span><MapPin size={10} />{p.district}</>}
                    </p>
                  </div>
                  {p.insurance && (
                    <span className="text-xs bg-green-900/30 text-green-400 border border-green-900/40 px-2 py-0.5 rounded-lg hidden sm:block">
                      {p.insurance}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-900/40 flex items-center justify-center text-primary-400 text-xl font-bold">
                  {(selected.full_name || 'P')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{selected.full_name || 'Unnamed'}</h3>
                  <p className="text-muted text-sm flex items-center gap-1"><Phone size={12} />{selected.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deletePatient(selected)} disabled={deleting}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5 rounded-lg transition-colors disabled:opacity-50">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-white p-1.5"><X size={20} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">

              {/* Registration info */}
              <div>
                <p className="text-white text-sm font-semibold mb-2">Registration Info</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: 'ID Number', val: selected.id_number },
                    { label: 'Insurance', val: selected.insurance },
                    { label: 'Village', val: selected.village },
                    { label: 'Cell', val: selected.cell },
                    { label: 'Sector', val: selected.sector },
                    { label: 'District', val: selected.district },
                    { label: 'Registered', val: selected.created_at ? format(parseISO(selected.created_at), 'dd MMM yyyy') : null },
                    { label: 'Total Visits', val: selected._visitCount != null ? String(selected._visitCount) : null },
                  ].filter(f => f.val).map(f => (
                    <div key={f.label} className="bg-surface rounded-xl p-3">
                      <p className="text-muted text-xs mb-0.5">{f.label}</p>
                      <p className="text-white text-sm font-medium">{f.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SMS send box */}
              <PatientSmsBox patient={selected} />

              {/* Tabs */}
              <div className="flex gap-1 border-b border-border">
                {(['visits', 'medications'] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)}
                    className={cn('px-4 py-2 text-sm font-medium capitalize transition-colors',
                      detailTab === t ? 'text-primary-400 border-b-2 border-primary-400' : 'text-muted hover:text-white')}>
                    {t}
                  </button>
                ))}
              </div>

              {loadingDetail ? (
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-border/30 rounded-xl animate-pulse" />)}
                </div>
              ) : detailTab === 'visits' ? (
                <div className="space-y-3">
                  {visits.length === 0 ? (
                    <p className="text-muted text-sm text-center py-6">No visits recorded</p>
                  ) : visits.map(v => (
                    <div key={v.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedVisit(expandedVisit === v.id ? null : v.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors">
                        <div>
                          <p className="text-white text-sm font-medium">
                            Visit — {v.visit_date ? format(parseISO(v.visit_date), 'dd MMM yyyy') : 'Date unknown'}
                          </p>
                          <p className="text-muted text-xs">{v.status}</p>
                        </div>
                        {expandedVisit === v.id
                          ? <ChevronUp size={16} className="text-muted" />
                          : <ChevronDown size={16} className="text-muted" />}
                      </button>

                      {expandedVisit === v.id && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">

                          {(v.visit_diseases || []).length > 0 && (
                            <div>
                              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Diagnosis</p>
                              {v.visit_diseases!.map((d, i) => (
                                <div key={i} className="text-sm text-white">
                                  {d.found_by_doctor && <p>Doctor: <span className="text-primary-300">{d.found_by_doctor}</span></p>}
                                  {d.reported_by_patient && <p>Patient reported: <span className="text-yellow-300">{d.reported_by_patient}</span></p>}
                                </div>
                              ))}
                            </div>
                          )}

                          {(v.visit_tests || []).length > 0 && (
                            <div>
                              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Tests</p>
                              {v.visit_tests!.map((t, i) => (
                                <p key={i} className="text-sm text-white">{t.test_name || (t.has_test ? 'Test ordered' : 'No test')}</p>
                              ))}
                            </div>
                          )}

                          {(v.visit_prescriptions || []).length > 0 && (
                            <div>
                              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Prescriptions</p>
                              <div className="space-y-1">
                                {v.visit_prescriptions!.map((rx, i) => (
                                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-sm">
                                    <p className="text-white font-medium">{rx.medicine_name} {rx.dosage ? `· ${rx.dosage}` : ''}</p>
                                    <p className="text-muted text-xs">{rx.times_per_day}x/day · qty: {rx.quantity_given ?? '—'}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(v.visit_avoidances || []).length > 0 && (
                            <div>
                              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Avoidances</p>
                              {v.visit_avoidances!.map((a, i) => (
                                <p key={i} className="text-sm text-yellow-300">{a.avoidance}</p>
                              ))}
                            </div>
                          )}

                          {(v.visit_appointments || []).length > 0 && (
                            <div>
                              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Appointments</p>
                              {v.visit_appointments!.map((a, i) => (
                                <div key={i} className="bg-gray-800 rounded-lg px-3 py-2 text-sm">
                                  <p className="text-white">{format(parseISO(a.appointment_date), 'dd MMM yyyy')} {a.appointment_time || ''}</p>
                                  {a.notes && <p className="text-muted text-xs">{a.notes}</p>}
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {patientMeds.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <Pill size={24} className="text-muted mx-auto" />
                      <p className="text-muted text-sm">No medications assigned yet</p>
                      <p className="text-muted text-xs">Go to Medications → Assign to Patient</p>
                    </div>
                  ) : patientMeds.map(med => (
                    <div key={med.id} className={cn(
                      'border rounded-xl p-4',
                      med.is_active ? 'border-primary-900/40 bg-primary-900/10' : 'border-border bg-surface/40'
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium text-sm truncate">
                              {(med.medication as any)?.name || 'Unknown Medicine'}
                            </p>
                            {med.medication && (
                              <span className={cn(
                                'text-xs px-1.5 py-0.5 rounded flex-shrink-0',
                                safetyColor[(med.medication as any).safety_level] || 'text-muted bg-surface'
                              )}>
                                {(med.medication as any).safety_level}
                              </span>
                            )}
                          </div>
                          {med.dosage && (
                            <p className="text-muted text-xs mb-1">Dosage: <span className="text-white/80">{med.dosage}</span></p>
                          )}
                          {med.food_instruction && (
                            <p className="text-muted text-xs mb-1">
                              Food: <span className="text-white/80">{FOOD_LABELS[med.food_instruction] || med.food_instruction}</span>
                            </p>
                          )}
                          {med.schedule_times && med.schedule_times.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1.5">
                              <Clock size={11} className="text-primary-400" />
                              {med.schedule_times.map((t, i) => (
                                <span key={i} className="text-xs bg-primary-900/30 text-primary-300 border border-primary-900/40 px-1.5 py-0.5 rounded">
                                  {formatTime(t)}
                                </span>
                              ))}
                            </div>
                          )}
                          {(med.start_date || med.end_date) && (
                            <p className="text-muted text-xs mt-1.5">
                              {med.start_date && <span>From {format(parseISO(med.start_date), 'MMM d, yyyy')}</span>}
                              {med.end_date && <span> → {format(parseISO(med.end_date), 'MMM d, yyyy')}</span>}
                            </p>
                          )}
                          {med.notes && (
                            <p className="text-muted text-xs mt-1 italic">{med.notes}</p>
                          )}
                        </div>
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0',
                          med.is_active ? 'bg-green-900/30 text-green-400' : 'bg-surface text-muted'
                        )}>
                          {med.is_active ? 'Active' : 'Ended'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New Visit button */}
              <button
                onClick={() => { setSelected(null); router.push('/patients/register'); }}
                className="w-full border border-dashed border-border text-muted hover:text-white hover:border-primary-500 rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
                <Plus size={14} /> New Visit for this Patient
              </button>

            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


const DEFAULT_TEMPLATES = [
  {
    label: 'Medication Reminder',
    text: (p: any) => `Dear ${p.full_name || 'Patient'}, this is a reminder to take your medication as prescribed. Please follow your dosage schedule. Contact us if you have any questions.`,
  },
  {
    label: 'Appointment Reminder',
    text: (p: any) => `Dear ${p.full_name || 'Patient'}, you have an upcoming appointment at our pharmacy. Please come on time and bring your prescription. Thank you.`,
  },
  {
    label: 'Refill Ready',
    text: (p: any) => `Dear ${p.full_name || 'Patient'}, your medication refill is ready for pickup. Please visit us at your earliest convenience. Thank you.`,
  },
  {
    label: 'Follow-up',
    text: (p: any) => `Dear ${p.full_name || 'Patient'}, please remember your follow-up visit. Taking your medication consistently is important for your recovery. We are here to help.`,
  },
  {
    label: 'Custom Message',
    text: (_: any) => '',
  },
];

function PatientSmsBox({ patient }: { patient: any }) {
  const { user } = useAuthStore();
  const [msg, setMsg] = useState(() => DEFAULT_TEMPLATES[0].text(patient));
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [doseTime, setDoseTime] = useState('08:00');
  const [medicationName, setMedicationName] = useState('General Reminder');
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const [editDoseTime, setEditDoseTime] = useState('');
  const [editMedName, setEditMedName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadReminders(); }, [patient.id]);

  const loadReminders = async () => {
    setLoadingReminders(true);
    const { data } = await supabase
      .from('sms_schedules')
      .select('*')
      .eq('user_id', patient.id)
      .order('created_at', { ascending: false });
    setReminders(data || []);
    setLoadingReminders(false);
  };

  const applyTemplate = (index: number) => {
    setSelectedTemplate(index);
    setMsg(DEFAULT_TEMPLATES[index].text(patient));
  };

  const save = async () => {
    if (!msg.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('sms_schedules').insert({
      user_id: patient.id,
      phone: patient.phone,
      medication_name: medicationName,
      dose_time: doseTime,
      send_at: doseTime,
      message: msg.trim(),
      status: 'pending',
      language: 'english',
      pharmacy_id: user?.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Reminder saved — will send daily at ' + doseTime);
      setMsg(DEFAULT_TEMPLATES[0].text(patient));
      setSelectedTemplate(0);
      setMedicationName('General Reminder');
      setDoseTime('08:00');
      loadReminders();
    }
    setSaving(false);
  };

  const startEdit = (r: any) => {
    setEditing(r);
    setEditMsg(r.message);
    setEditDoseTime(r.dose_time);
    setEditMedName(r.medication_name);
  };

  const saveEdit = async () => {
    if (!editMsg.trim()) return;
    setEditSaving(true);
    const { error } = await supabase.from('sms_schedules').update({
      message: editMsg.trim(),
      dose_time: editDoseTime,
      send_at: editDoseTime,
      medication_name: editMedName,
    }).eq('id', editing.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Reminder updated');
      setEditing(null);
      loadReminders();
    }
    setEditSaving(false);
  };

  const deleteReminder = async (id: string) => {
    if (!confirm('Delete this reminder?')) return;
    await supabase.from('sms_schedules').delete().eq('id', id);
    toast.success('Deleted');
    loadReminders();
  };

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-900/30',
    sent: 'text-green-400 bg-green-900/30',
    failed: 'text-red-400 bg-red-900/30',
  };

  return (
    <div className="space-y-4">

      {/* New reminder form */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <p className="text-white text-sm font-semibold">Schedule SMS Reminder for {patient.full_name}</p>

        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => applyTemplate(i)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                selectedTemplate === i
                  ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                  : 'border-border text-muted hover:text-white hover:border-white/20'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-muted text-xs mb-1 block">Medicine / Reason</label>
            <input value={medicationName} onChange={e => setMedicationName(e.target.value)}
              className="w-full bg-gray-800 border border-border rounded-xl px-3 py-2 text-white text-sm outline-none"
              placeholder="e.g. Paracetamol" />
          </div>
          <div>
            <label className="text-muted text-xs mb-1 block">Send Time (daily)</label>
            <input type="time" value={doseTime} onChange={e => setDoseTime(e.target.value)}
              className="w-full bg-gray-800 border border-border rounded-xl px-3 py-2 text-white text-sm outline-none" />
          </div>
        </div>

        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
          placeholder="Select a template above or type a custom message..."
          className="w-full bg-gray-800 border border-border rounded-xl px-3 py-2 text-white text-sm outline-none resize-none placeholder:text-muted" />

        <div className="flex items-center justify-between">
          <p className="text-muted text-xs">{msg.length} chars · sends daily at {doseTime}</p>
          <button onClick={save} disabled={saving || !msg.trim()}
            className="bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            {saving ? 'Saving...' : 'Save Reminder'}
          </button>
        </div>
      </div>

      {/* Saved reminders list */}
      <div className="space-y-2">
        <p className="text-white text-sm font-semibold">Saved Reminders ({reminders.length})</p>

        {loadingReminders ? (
          <div className="space-y-2">
            {Array(2).fill(0).map((_, i) => <div key={i} className="h-16 bg-border/30 rounded-xl animate-pulse" />)}
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-muted text-xs text-center py-4">No reminders saved yet</p>
        ) : reminders.map(r => (
          <div key={r.id} className="bg-surface border border-border rounded-xl p-3">
            {editing?.id === r.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted text-xs mb-1 block">Medicine / Reason</label>
                    <input value={editMedName} onChange={e => setEditMedName(e.target.value)}
                      className="w-full bg-gray-800 border border-border rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-muted text-xs mb-1 block">Send Time</label>
                    <input type="time" value={editDoseTime} onChange={e => setEditDoseTime(e.target.value)}
                      className="w-full bg-gray-800 border border-border rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                  </div>
                </div>
                <textarea value={editMsg} onChange={e => setEditMsg(e.target.value)} rows={3}
                  className="w-full bg-gray-800 border border-border rounded-lg px-3 py-2 text-white text-sm outline-none resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)}
                    className="flex-1 border border-border text-muted rounded-xl py-1.5 text-sm">Cancel</button>
                  <button onClick={saveEdit} disabled={editSaving}
                    className="flex-1 bg-primary-500 text-white rounded-xl py-1.5 text-sm font-semibold">
                    {editSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white text-sm font-medium">{r.medication_name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor[r.status] || 'text-muted bg-gray-700')}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-muted text-xs">Daily at {r.dose_time}</p>
                  <p className="text-muted text-xs truncate mt-0.5">{r.message}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(r)}
                    className="text-primary-400 hover:text-primary-300 p-1.5"><Edit2 size={14} /></button>
                  <button onClick={() => deleteReminder(r.id)}
                    className="text-red-400 hover:text-red-300 p-1.5"><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
































