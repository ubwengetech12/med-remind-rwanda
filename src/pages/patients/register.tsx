'use client';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { buildSmsMessage } from '@/lib/smsTemplates';
import { loadSmsSettings } from '@/lib/smsScheduler';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  User, MapPin, Activity, FlaskConical, Pill, AlertTriangle,
  Calendar, Plus, X, ChevronRight, ChevronLeft, Check
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Step1 {
  full_name: string; id_number: string; phone: string;
  village: string; cell: string; sector: string; district: string; insurance: string;
}
interface Step2 { patient_says: string; doctor_found: string; }
interface Step3 { has_test: boolean; test_name: string; test_notes: string; }
interface PrescriptionRow { medicine_name: string; type: 'medicine' | 'vaccine'; dosage: string; times_per_day: string; schedule_times: string[]; duration_days: string; from_stock: boolean; stock_id: string; }
interface AppointmentRow { appointment_date: string; appointment_time: string; notes: string; }

const EMPTY_STEP1: Step1 = { full_name: '', id_number: '', phone: '', village: '', cell: '', sector: '', district: '', insurance: '' };
const EMPTY_STEP2: Step2 = { patient_says: '', doctor_found: '' };
const EMPTY_STEP3: Step3 = { has_test: false, test_name: '', test_notes: '' };
const EMPTY_RX: PrescriptionRow = { medicine_name: '', type: 'medicine', dosage: '', times_per_day: '1', schedule_times: ['08:00'], duration_days: '', from_stock: false, stock_id: '' };
const EMPTY_APPT: AppointmentRow = { appointment_date: '', appointment_time: '', notes: '' };

const STEPS = [
  { label: 'Patient Info',   icon: User },
  { label: 'Diseases',       icon: Activity },
  { label: 'Tests',          icon: FlaskConical },
  { label: 'Prescriptions',  icon: Pill },
  { label: 'Avoidances',     icon: AlertTriangle },
  { label: 'Appointments',   icon: Calendar },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegisterPatientPage() {
  const router = useRouter();
  const { user, pharmacy, pharmacist } = useAuthStore() as any;

  const [step, setStep]           = useState(0);
  const [saving, setSaving]       = useState(false);

  const [s1, setS1]               = useState<Step1>(EMPTY_STEP1);
  const [s2, setS2]               = useState<Step2>(EMPTY_STEP2);
  const [s3, setS3]               = useState<Step3>(EMPTY_STEP3);
  const [rxList, setRxList]       = useState<PrescriptionRow[]>([{ ...EMPTY_RX }]);
  const [avoidList, setAvoidList] = useState<string[]>(['']);
  const [apptList, setApptList]   = useState<AppointmentRow[]>([{ ...EMPTY_APPT }]);
  const [stock, setStock]         = useState<any[]>([]);
  const [stockLoaded, setStockLoaded] = useState(false);

  // Load stock once when step 4 opens
  const loadStock = async () => {
    if (stockLoaded) return;
    const pharmacyId = pharmacy?.id || user?.id;
    const { data } = await supabase.from('pharmacy_stock').select('*, medication:medications(name)').eq('pharmacy_id', pharmacyId).gt('quantity', 0);
    setStock(data || []);
    setStockLoaded(true);
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return s1.full_name.trim() && s1.phone.trim();
    if (step === 1) return s2.patient_says.trim() || s2.doctor_found.trim();
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const pharmacyId = pharmacy?.id || user?.id;

      // 1. Upsert patient in users table
      const { data: patientData, error: uErr } = await supabase
        .from('users')
        .upsert({
          id: `pat_${Date.now()}`,
          phone: s1.phone,
          full_name: s1.full_name,
          id_number: s1.id_number,
          village: s1.village,
          cell: s1.cell,
          sector: s1.sector,
          district: s1.district,
          insurance: s1.insurance,
          role: 'patient',
        }, { onConflict: 'phone' })
        .select()
        .single();
      if (uErr) throw uErr;
      const patientId = patientData.id;

      // 2. Create visit
      const { data: visitData, error: vErr } = await supabase
        .from('patient_visits')
        .insert({ patient_id: patientId, pharmacy_id: pharmacyId })
        .select()
        .single();
      if (vErr) throw vErr;
      const visitId = visitData.id;

      // 3. Diseases
      await supabase.from('visit_diseases').insert({
        visit_id: visitId,
        reported_by_patient: s2.patient_says || null,
        found_by_doctor: s2.doctor_found || null,
      });

      // 4. Tests
      if (s3.has_test) {
        await supabase.from('visit_tests').insert({
          visit_id: visitId,
          has_test: true,
          test_name: s3.test_name || null,
          test_notes: s3.test_notes || null,
        });
      }

      // 5. Prescriptions
      const validRx = rxList.filter(r => r.medicine_name.trim());
      if (validRx.length > 0) {
        await supabase.from('visit_prescriptions').insert(
          validRx.map(r => ({
            visit_id: visitId,
            medicine_name: r.medicine_name,
            type: r.type,
            dosage: r.dosage || null,
            times_per_day: Number(r.times_per_day) || 1,
            schedule_times: r.schedule_times,
            duration_days: r.duration_days ? Number(r.duration_days) : null,
          }))
        );

        // Deduct stock if selected from stock
        for (const r of validRx) {
          if (r.from_stock && r.stock_id) {
            const item = stock.find(s => s.id === r.stock_id);
            if (item) {
              await supabase.from('pharmacy_stock')
                .update({ quantity: Math.max(0, item.quantity - 1) })
                .eq('id', r.stock_id);
            }
          }
        }

        // 6. Schedule SMS for each prescription
        const smsSettings = loadSmsSettings();
        const pharmacyName = pharmacy?.name || 'MedWise Pharmacy';
        const supportNumber = pharmacy?.phone || pharmacist?.phone || '';

        const smsTasks = validRx.flatMap((r, rIdx) =>
          r.schedule_times.map((time, tIdx) => {
            const [h, m] = time.split(':').map(Number);
            const sendMin = h * 60 + m - smsSettings.minutesBefore;
            const sH = Math.floor(((sendMin % 1440) + 1440) % 1440 / 60);
            const sM = ((sendMin % 60) + 60) % 60;
            const sendAt = `${String(sH).padStart(2,'0')}:${String(sM).padStart(2,'0')}`;
            const message = buildSmsMessage(smsSettings.language, {
              patientName: s1.full_name,
              pharmacyName,
              medicineName: r.medicine_name + (r.dosage ? ` ${r.dosage}` : ''),
              doseNumber: tIdx + 1,
              totalDoses: r.schedule_times.length,
              exactTime: formatTime(time),
              supportNumber,
            });
            return supabase.from('sms_schedules').insert({
              user_id: patientId,
              phone: s1.phone,
              medication_name: r.medicine_name,
              dose_time: time,
              send_at: sendAt,
              message,
              language: smsSettings.language,
              status: 'pending',
            });
          })
        );
        await Promise.allSettled(smsTasks);
      }

      // 7. Avoidances
      const validAvoid = avoidList.filter(a => a.trim());
      if (validAvoid.length > 0) {
        await supabase.from('visit_avoidances').insert(
          validAvoid.map(a => ({ visit_id: visitId, avoidance: a }))
        );
      }

      // 8. Appointments
      const validAppts = apptList.filter(a => a.appointment_date.trim());
      if (validAppts.length > 0) {
        await supabase.from('visit_appointments').insert(
          validAppts.map(a => ({
            visit_id: visitId,
            appointment_date: a.appointment_date,
            appointment_time: a.appointment_time || null,
            notes: a.notes || null,
          }))
        );
      }

      toast.success(`${s1.full_name} registered successfully!`);
      router.push('/patients');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Step renders ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // STEP 1 — Patient Info
      case 0: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Full Name *', key: 'full_name', placeholder: 'Jean Baptiste' },
              { label: 'Phone *', key: 'phone', placeholder: '+250 7XX XXX XXX' },
              { label: 'ID Number', key: 'id_number', placeholder: '1 XXXX X XXXXXXX X XX' },
              { label: 'Insurance', key: 'insurance', placeholder: 'RAMA / MMI / None' },
              { label: 'Village', key: 'village', placeholder: 'Kimisagara' },
              { label: 'Cell', key: 'cell', placeholder: 'Biryogo' },
              { label: 'Sector', key: 'sector', placeholder: 'Nyarugenge' },
              { label: 'District', key: 'district', placeholder: 'Kigali' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-muted text-sm mb-1.5">{f.label}</label>
                <input
                  value={(s1 as any)[f.key]}
                  onChange={e => setS1(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="dash-input w-full"
                />
              </div>
            ))}
          </div>
        </div>
      );

      // STEP 2 — Diseases
      case 1: return (
        <div className="space-y-4">
          <div>
            <label className="block text-muted text-sm mb-1.5">Diseases said by patient</label>
            <textarea
              value={s2.patient_says}
              onChange={e => setS2(p => ({ ...p, patient_says: e.target.value }))}
              rows={3} className="dash-input w-full resize-none"
              placeholder="What the patient reports feeling..."
            />
          </div>
          <div>
            <label className="block text-muted text-sm mb-1.5">Diseases found by doctor</label>
            <textarea
              value={s2.doctor_found}
              onChange={e => setS2(p => ({ ...p, doctor_found: e.target.value }))}
              rows={3} className="dash-input w-full resize-none"
              placeholder="Diagnosis after examination..."
            />
          </div>
        </div>
      );

      // STEP 3 — Tests
      case 2: return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setS3(p => ({ ...p, has_test: !p.has_test }))}
              className={cn('w-12 h-6 rounded-full transition-colors relative flex-shrink-0',
                s3.has_test ? 'bg-primary-500' : 'bg-gray-700')}>
              <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-all',
                s3.has_test ? 'left-7' : 'left-1')} />
            </button>
            <span className="text-white text-sm">Patient needs a test</span>
          </div>
          {s3.has_test && (
            <>
              <div>
                <label className="block text-muted text-sm mb-1.5">Test Name</label>
                <input value={s3.test_name} onChange={e => setS3(p => ({ ...p, test_name: e.target.value }))}
                  placeholder="e.g. Blood test, Malaria RDT, X-Ray..." className="dash-input w-full" />
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">Test Notes</label>
                <textarea value={s3.test_notes} onChange={e => setS3(p => ({ ...p, test_notes: e.target.value }))}
                  rows={3} className="dash-input w-full resize-none" placeholder="Additional instructions..." />
              </div>
            </>
          )}
          {!s3.has_test && (
            <div className="bg-gray-800/50 rounded-xl p-6 text-center text-muted text-sm">
              No test required for this visit
            </div>
          )}
        </div>
      );

      // STEP 4 — Prescriptions
      case 3: return (
        <div className="space-y-4">
          {rxList.map((rx, i) => (
            <div key={i} className="bg-gray-800/50 border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">Prescription {i + 1}</span>
                {rxList.length > 1 && (
                  <button onClick={() => setRxList(l => l.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-300 p-1"><X size={14} /></button>
                )}
              </div>

              {/* Type toggle */}
              <div className="flex gap-2">
                {(['medicine', 'vaccine'] as const).map(t => (
                  <button key={t} onClick={() => setRxList(l => l.map((r, idx) => idx === i ? { ...r, type: t } : r))}
                    className={cn('flex-1 py-1.5 rounded-xl text-sm font-medium border capitalize transition-all',
                      rx.type === t ? 'bg-primary-500/20 border-primary-500 text-primary-300' : 'border-border text-muted hover:text-white')}>
                    {t}
                  </button>
                ))}
              </div>

              {/* From stock toggle */}
              <div className="flex items-center gap-2">
                <button onClick={() => { setRxList(l => l.map((r, idx) => idx === i ? { ...r, from_stock: !r.from_stock, medicine_name: '', stock_id: '' } : r)); loadStock(); }}
                  className={cn('w-10 h-5 rounded-full transition-colors relative flex-shrink-0', rx.from_stock ? 'bg-primary-500' : 'bg-gray-700')}>
                  <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all', rx.from_stock ? 'left-5' : 'left-0.5')} />
                </button>
                <span className="text-muted text-xs">Select from pharmacy stock</span>
              </div>

              {rx.from_stock ? (
                <div>
                  <label className="block text-muted text-sm mb-1.5">Select from Stock</label>
                  <select
                    value={rx.stock_id}
                    onChange={e => {
                      const item = stock.find(s => s.id === e.target.value);
                      setRxList(l => l.map((r, idx) => idx === i ? { ...r, stock_id: e.target.value, medicine_name: item?.medicine_name || item?.medication?.name || '' } : r));
                    }}
                    className="dash-input w-full">
                    <option value="">-- Choose medicine --</option>
                    {stock.map(s => (
                      <option key={s.id} value={s.id}>{s.medicine_name} (qty: {s.quantity})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-muted text-sm mb-1.5">Medicine / Vaccine Name</label>
                  <input value={rx.medicine_name} onChange={e => setRxList(l => l.map((r, idx) => idx === i ? { ...r, medicine_name: e.target.value } : r))}
                    placeholder="e.g. Amoxicillin, Paracetamol..." className="dash-input w-full" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-sm mb-1.5">Dosage</label>
                  <input value={rx.dosage} onChange={e => setRxList(l => l.map((r, idx) => idx === i ? { ...r, dosage: e.target.value } : r))}
                    placeholder="e.g. 500mg" className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Duration (days)</label>
                  <input type="number" value={rx.duration_days} onChange={e => setRxList(l => l.map((r, idx) => idx === i ? { ...r, duration_days: e.target.value } : r))}
                    placeholder="7" className="dash-input w-full" />
                </div>
              </div>

              {/* Times */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-muted text-sm">Times to take per day</label>
                  <button onClick={() => setRxList(l => l.map((r, idx) => idx === i ? { ...r, schedule_times: [...r.schedule_times, '08:00'] } : r))}
                    className="text-primary-400 text-xs hover:text-primary-300 flex items-center gap-1">
                    <Plus size={12} /> Add time
                  </button>
                </div>
                <div className="space-y-2">
                  {rx.schedule_times.map((t, ti) => (
                    <div key={ti} className="flex items-center gap-2">
                      <input type="time" value={t}
                        onChange={e => setRxList(l => l.map((r, idx) => idx === i ? { ...r, schedule_times: r.schedule_times.map((x, xi) => xi === ti ? e.target.value : x) } : r))}
                        className="dash-input flex-1" />
                      {rx.schedule_times.length > 1 && (
                        <button onClick={() => setRxList(l => l.map((r, idx) => idx === i ? { ...r, schedule_times: r.schedule_times.filter((_, xi) => xi !== ti) } : r))}
                          className="text-red-400 hover:text-red-300 p-1"><X size={12} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => setRxList(l => [...l, { ...EMPTY_RX }])}
            className="w-full border border-dashed border-border text-muted hover:text-white hover:border-primary-500 rounded-2xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} /> Add Another Prescription
          </button>
        </div>
      );

      // STEP 5 — Avoidances
      case 4: return (
        <div className="space-y-3">
          <p className="text-muted text-sm">What must the patient avoid after taking the medicine?</p>
          {avoidList.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={a} onChange={e => setAvoidList(l => l.map((x, idx) => idx === i ? e.target.value : x))}
                placeholder={`e.g. Avoid alcohol, Do not drive...`} className="dash-input flex-1" />
              {avoidList.length > 1 && (
                <button onClick={() => setAvoidList(l => l.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-300 p-1.5"><X size={14} /></button>
              )}
            </div>
          ))}
          <button onClick={() => setAvoidList(l => [...l, ''])}
            className="w-full border border-dashed border-border text-muted hover:text-white hover:border-primary-500 rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
            <Plus size={14} /> Add Another
          </button>
        </div>
      );

      // STEP 6 — Appointments
      case 5: return (
        <div className="space-y-4">
          {apptList.map((a, i) => (
            <div key={i} className="bg-gray-800/50 border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">Appointment {i + 1}</span>
                {apptList.length > 1 && (
                  <button onClick={() => setApptList(l => l.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-300 p-1"><X size={14} /></button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-sm mb-1.5">Date</label>
                  <input type="date" value={a.appointment_date}
                    onChange={e => setApptList(l => l.map((x, idx) => idx === i ? { ...x, appointment_date: e.target.value } : x))}
                    className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Time</label>
                  <input type="time" value={a.appointment_time}
                    onChange={e => setApptList(l => l.map((x, idx) => idx === i ? { ...x, appointment_time: e.target.value } : x))}
                    className="dash-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">Notes</label>
                <input value={a.notes}
                  onChange={e => setApptList(l => l.map((x, idx) => idx === i ? { ...x, notes: e.target.value } : x))}
                  placeholder="Optional notes..." className="dash-input w-full" />
              </div>
            </div>
          ))}
          <button onClick={() => setApptList(l => [...l, { ...EMPTY_APPT }])}
            className="w-full border border-dashed border-border text-muted hover:text-white hover:border-primary-500 rounded-2xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            <Plus size={16} /> Add Another Appointment
          </button>
        </div>
      );
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <DashboardLayout title="Register Patient">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                  done ? 'bg-green-500' : active ? 'bg-primary-500' : 'bg-gray-800 border border-border'
                )}>
                  {done ? <Check size={14} className="text-white" /> : <Icon size={14} className={active ? 'text-white' : 'text-muted'} />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-1 rounded transition-colors', done ? 'bg-green-500' : 'bg-gray-800')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step label */}
        <div>
          <h2 className="text-white font-semibold text-lg">Step {step + 1}: {STEPS[step].label}</h2>
          <p className="text-muted text-sm mt-0.5">{step + 1} of {STEPS.length}</p>
        </div>

        {/* Step content */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 border border-border text-muted hover:text-white rounded-xl px-5 h-11 text-sm transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <button
            onClick={isLastStep ? handleSubmit : () => { if (canNext() || step > 1) { if (step === 3) loadStock(); setStep(s => s + 1); } else toast.error('Please fill required fields'); }}
            disabled={saving}
            className="flex-1 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white h-11 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
            {saving ? 'Saving...' : isLastStep ? <><Check size={16} /> Complete Registration</> : <>Next <ChevronRight size={16} /></>}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}