'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  Plus, Search, X, ChevronRight, Phone, MapPin,
  ShieldCheck, Activity, Pill, Calendar, FlaskConical,
  AlertTriangle, UserPlus, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

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
  visit_prescriptions?: { medicine_name: string; type: string; dosage?: string; times_per_day?: number }[];
  visit_avoidances?: { avoidance: string }[];
  visit_appointments?: { appointment_date: string; appointment_time?: string; notes?: string }[];
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'patient')
      .order('created_at', { ascending: false });
    setPatients(data || []);
    setLoading(false);
  };

  const openDetail = async (p: Patient) => {
    setSelected(p);
    setVisits([]);
    setExpandedVisit(null);
    setLoadingDetail(true);
    const { data } = await supabase
      .from('patient_visits')
      .select(`
        id, visit_date, status,
        visit_diseases(reported_by_patient, found_by_doctor),
        visit_tests(has_test, test_name),
        visit_prescriptions(medicine_name, type, dosage, times_per_day),
        visit_avoidances(avoidance),
        visit_appointments(appointment_date, appointment_time, notes)
      `)
      .eq('patient_id', p.id)
      .order('visit_date', { ascending: false });
    setVisits(data || []);
    setSelected({ ...p, _visitCount: data?.length || 0 });
    setLoadingDetail(false);
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
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-900/40 flex items-center justify-center text-primary-400 text-xl font-bold">
                  {(selected.full_name || 'P')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{selected.full_name || 'Unnamed'}</h3>
                  <p className="text-muted text-sm flex items-center gap-1"><Phone size={12} />{selected.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-white mt-1"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'ID Number', val: selected.id_number },
                  { label: 'Insurance', val: selected.insurance },
                  { label: 'Village', val: selected.village },
                  { label: 'Cell', val: selected.cell },
                  { label: 'Sector', val: selected.sector },
                  { label: 'District', val: selected.district },
                ].filter(f => f.val).map(f => (
                  <div key={f.label} className="bg-surface rounded-xl p-3">
                    <p className="text-muted text-xs mb-0.5">{f.label}</p>
                    <p className="text-white text-sm font-medium">{f.val}</p>
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="flex gap-3">
                <div className="flex-1 bg-surface rounded-xl p-3 text-center">
                  <p className="text-muted text-xs mb-1">Total Visits</p>
                  <p className="text-white font-semibold">{selected._visitCount ?? 0}</p>
                </div>
                <div className="flex-1 bg-surface rounded-xl p-3 text-center">
                  <p className="text-muted text-xs mb-1">Registered</p>
                  <p className="text-white font-semibold text-xs">
                    {format(parseISO(selected.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Visit History */}
              <div>
                <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock size={12} /> Visit History
                </p>

                {loadingDetail ? (
                  <div className="space-y-2">
                    {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-border rounded-xl animate-pulse" />)}
                  </div>
                ) : visits.length === 0 ? (
                  <p className="text-muted text-sm">No visits recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {visits.map(v => {
                      const isOpen = expandedVisit === v.id;
                      const disease = v.visit_diseases?.[0];
                      const rx = v.visit_prescriptions || [];
                      const appts = v.visit_appointments || [];
                      const tests = v.visit_tests || [];
                      const avoids = v.visit_avoidances || [];

                      return (
                        <div key={v.id} className="border border-border rounded-xl overflow-hidden">
                          <button
                            onClick={() => setExpandedVisit(isOpen ? null : v.id)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-primary-400" />
                              <span className="text-white text-sm font-medium">
                                {format(parseISO(v.visit_date), 'MMM d, yyyy')}
                              </span>
                              {rx.length > 0 && (
                                <span className="text-xs bg-primary-900/30 text-primary-400 border border-primary-900/40 px-2 py-0.5 rounded-lg">
                                  {rx.length} med{rx.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <ChevronRight size={14} className={cn('text-muted transition-transform', isOpen && 'rotate-90')} />
                          </button>

                          {isOpen && (
                            <div className="border-t border-border px-4 pb-4 pt-3 space-y-4 bg-surface/40">

                              {/* Diseases */}
                              {(disease?.reported_by_patient || disease?.found_by_doctor) && (
                                <div>
                                  <p className="text-muted text-xs font-semibold mb-1.5 flex items-center gap-1"><Activity size={11} /> Diseases</p>
                                  {disease.reported_by_patient && (
                                    <p className="text-white text-sm"><span className="text-muted text-xs">Patient: </span>{disease.reported_by_patient}</p>
                                  )}
                                  {disease.found_by_doctor && (
                                    <p className="text-white text-sm mt-0.5"><span className="text-muted text-xs">Doctor: </span>{disease.found_by_doctor}</p>
                                  )}
                                </div>
                              )}

                              {/* Tests */}
                              {tests.some(t => t.has_test) && (
                                <div>
                                  <p className="text-muted text-xs font-semibold mb-1.5 flex items-center gap-1"><FlaskConical size={11} /> Tests</p>
                                  {tests.filter(t => t.has_test).map((t, i) => (
                                    <p key={i} className="text-white text-sm">{t.test_name || 'Test ordered'}</p>
                                  ))}
                                </div>
                              )}

                              {/* Prescriptions */}
                              {rx.length > 0 && (
                                <div>
                                  <p className="text-muted text-xs font-semibold mb-1.5 flex items-center gap-1"><Pill size={11} /> Prescriptions</p>
                                  <div className="space-y-1">
                                    {rx.map((r, i) => (
                                      <div key={i} className="bg-card rounded-lg px-3 py-2">
                                        <p className="text-white text-sm font-medium">{r.medicine_name}</p>
                                        <p className="text-muted text-xs">
                                          {r.type} {r.dosage && `· ${r.dosage}`} {r.times_per_day && `· ${r.times_per_day}x/day`}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Avoidances */}
                              {avoids.length > 0 && (
                                <div>
                                  <p className="text-muted text-xs font-semibold mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Avoidances</p>
                                  {avoids.map((a, i) => (
                                    <p key={i} className="text-white text-sm">• {a.avoidance}</p>
                                  ))}
                                </div>
                              )}

                              {/* Appointments */}
                              {appts.length > 0 && (
                                <div>
                                  <p className="text-muted text-xs font-semibold mb-1.5 flex items-center gap-1"><Calendar size={11} /> Appointments</p>
                                  {appts.map((a, i) => (
                                    <div key={i} className="bg-card rounded-lg px-3 py-2">
                                      <p className="text-white text-sm">{format(parseISO(a.appointment_date), 'MMM d, yyyy')}{a.appointment_time && ` at ${a.appointment_time}`}</p>
                                      {a.notes && <p className="text-muted text-xs mt-0.5">{a.notes}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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