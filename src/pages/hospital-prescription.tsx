'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { buildSmsMessage } from '@/lib/smsTemplates';
import type { Language } from '@/lib/smsTemplates';
import { loadSmsSettings } from '@/lib/smsScheduler';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Plus, X, Check, Building2, Loader } from 'lucide-react';

interface RxRow {
  medicine_name: string;
  dosage: string;
  times_per_day: string;
  schedule_times: string[];
  duration_days: string;
  food_instruction: 'before_food' | 'after_food' | 'with_food' | 'empty_stomach';
}

const EMPTY_RX: RxRow = {
  medicine_name: '', dosage: '', times_per_day: '1',
  schedule_times: ['08:00'], duration_days: '', food_instruction: 'with_food',
};

const FOOD_OPTIONS = [
  { value: 'before_food',   label: 'Before Food' },
  { value: 'after_food',    label: 'After Food' },
  { value: 'with_food',     label: 'With Food' },
  { value: 'empty_stomach', label: 'Empty Stomach' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'english',    label: 'English' },
  { value: 'kinyarwanda', label: 'Kinyarwanda' },
  { value: 'french',     label: 'French' },
  { value: 'kiswahili',  label: 'Kiswahili' },
];

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function HospitalPrescriptionPage() {
  const { user, pharmacy, pharmacist } = useAuthStore() as any;
  const pharmacyId = user?.id || 'unknown';

  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [refNumber, setRefNumber]   = useState('');
  const [fullName, setFullName]     = useState('');
  const [phone, setPhone]           = useState('');
  const [hospital, setHospital]     = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [language, setLanguage]     = useState<Language>('english');
  const [diagnosis, setDiagnosis]   = useState('');
  const [rxList, setRxList]         = useState<RxRow[]>([{ ...EMPTY_RX }]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !phone.trim() || !refNumber.trim()) {
      toast.error('Reference number, patient name and phone are required');
      return;
    }
    if (rxList.every(r => !r.medicine_name.trim())) {
      toast.error('Add at least one medicine');
      return;
    }
    setSaving(true);
    try {
      const { data: patientData, error: uErr } = await supabase
        .from('users')
        .upsert({
          id: `pat_${Date.now()}`,
          phone: phone.trim(),
          full_name: fullName.trim(),
          role: 'patient',
        }, { onConflict: 'phone' })
        .select()
        .single();
      if (uErr) throw uErr;
      const patientId = patientData.id;

      const { data: visitData, error: vErr } = await supabase
        .from('patient_visits')
        .insert({ patient_id: patientId, pharmacy_id: pharmacyId, status: 'active' })
        .select()
        .single();
      if (vErr) throw vErr;
      const visitId = visitData.id;

      if (diagnosis.trim()) {
        await supabase.from('visit_diseases').insert({
          visit_id: visitId,
          found_by_doctor: diagnosis.trim(),
          reported_by_patient: null,
        });
      }

      const validRx = rxList.filter(r => r.medicine_name.trim());
      if (validRx.length > 0) {
        await supabase.from('visit_prescriptions').insert(
          validRx.map(r => ({
            visit_id: visitId,
            medicine_name: r.medicine_name.trim(),
            type: 'medicine',
            dosage: r.dosage || null,
            times_per_day: Number(r.times_per_day) || 1,
            schedule_times: r.schedule_times,
            duration_days: r.duration_days ? Number(r.duration_days) : null,
            food_instruction: r.food_instruction,
          }))
        );

        const smsSettings = loadSmsSettings();
        const pharmacyName = pharmacy?.name || 'MedWise Pharmacy';
        const supportNumber = pharmacy?.phone || pharmacist?.phone || '';

        const smsTasks = validRx.flatMap(r =>
          r.schedule_times.map((time, tIdx) => {
            const [h, m] = time.split(':').map(Number);
            const sendMin = h * 60 + m - smsSettings.minutesBefore;
            const sH = Math.floor(((sendMin % 1440) + 1440) % 1440 / 60);
            const sM = ((sendMin % 60) + 60) % 60;
            const sendAt = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
            const message = buildSmsMessage(language, {
              patientName: fullName.trim(),
              pharmacyName,
              medicineName: r.medicine_name.trim() + (r.dosage ? ` ${r.dosage}` : ''),
              doseNumber: tIdx + 1,
              totalDoses: r.schedule_times.length,
              exactTime: formatTime(time),
              supportNumber,
            });
            return supabase.from('sms_schedules').insert({
              user_id: patientId,
              phone: phone.trim(),
              medication_name: r.medicine_name.trim(),
              dose_time: time,
              send_at: sendAt,
              message,
              language,
              status: 'pending',
            });
          })
        );
        await Promise.allSettled(smsTasks);
      }

      toast.success(`Prescription registered & SMS scheduled for ${fullName}!`);
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to register prescription');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRefNumber(''); setFullName(''); setPhone('');
    setHospital(''); setDoctorName(''); setLanguage('english');
    setDiagnosis(''); setRxList([{ ...EMPTY_RX }]); setDone(false);
  };

  return (
    <DashboardLayout title="Hospital Prescription">
      <div className="max-w-2xl mx-auto space-y-6">

        {done ? (
          <div className="bg-card border border-green-900/40 rounded-2xl p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} className="text-green-400" />
            </div>
            <h2 className="text-white text-xl font-semibold">Prescription Registered</h2>
            <p className="text-muted text-sm">SMS reminders scheduled for <span className="text-white font-medium">{fullName}</span></p>
            <button onClick={handleReset}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-6 h-10 rounded-xl text-sm font-semibold transition-colors mx-auto">
              <Plus size={15} /> New Prescription
            </button>
          </div>
        ) : (
          <>
            <div className="bg-primary-900/20 border border-primary-900/40 rounded-xl px-4 py-3 text-primary-300 text-sm flex items-center gap-2">
              <Building2 size={15} />
              Enter hospital prescription — SMS reminders created instantly without full registration.
            </div>

            {/* Reference */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <p className="text-white font-semibold text-sm">Prescription Reference</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-sm mb-1.5">Reference Number *</label>
                  <input value={refNumber} onChange={e => setRefNumber(e.target.value)}
                    placeholder="HOSP-2026-00123" className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Hospital / Clinic Name</label>
                  <input value={hospital} onChange={e => setHospital(e.target.value)}
                    placeholder="King Faisal Hospital" className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Doctor Name</label>
                  <input value={doctorName} onChange={e => setDoctorName(e.target.value)}
                    placeholder="Dr. Mugisha" className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Diagnosis (optional)</label>
                  <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                    placeholder="e.g. Malaria, Hypertension..." className="dash-input w-full" />
                </div>
              </div>
            </div>

            {/* Patient */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <p className="text-white font-semibold text-sm">Patient Info</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-sm mb-1.5">Full Name *</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Jean Baptiste" className="dash-input w-full" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5">Phone Number *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+250 7XX XXX XXX" className="dash-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5">SMS Language</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LANGUAGE_OPTIONS.map(l => (
                    <button key={l.value} onClick={() => setLanguage(l.value)}
                      className={cn('py-2 rounded-xl text-sm font-medium border transition-all',
                        language === l.value
                          ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                          : 'border-border text-muted hover:text-white')}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Medicines */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <p className="text-white font-semibold text-sm">Medicines</p>
              {rxList.map((rx, i) => (
                <div key={i} className="bg-gray-800/50 border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">Medicine {i + 1}</span>
                    {rxList.length > 1 && (
                      <button onClick={() => setRxList(l => l.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-300 p-1"><X size={14} /></button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-muted text-sm mb-1.5">Medicine Name *</label>
                      <input value={rx.medicine_name}
                        onChange={e => setRxList(l => l.map((r, idx) => idx === i ? { ...r, medicine_name: e.target.value } : r))}
                        placeholder="e.g. Amoxicillin" className="dash-input w-full" />
                    </div>
                    <div>
                      <label className="block text-muted text-sm mb-1.5">Dosage</label>
                      <input value={rx.dosage}
                        onChange={e => setRxList(l => l.map((r, idx) => idx === i ? { ...r, dosage: e.target.value } : r))}
                        placeholder="500mg" className="dash-input w-full" />
                    </div>
                    <div>
                      <label className="block text-muted text-sm mb-1.5">Duration (days)</label>
                      <input type="number" value={rx.duration_days}
                        onChange={e => setRxList(l => l.map((r, idx) => idx === i ? { ...r, duration_days: e.target.value } : r))}
                        placeholder="7" className="dash-input w-full" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-muted text-sm mb-1.5">Take with food / water</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FOOD_OPTIONS.map(opt => (
                        <button key={opt.value}
                          onClick={() => setRxList(l => l.map((r, idx) => idx === i ? { ...r, food_instruction: opt.value as any } : r))}
                          className={cn('py-2 rounded-xl text-sm font-medium border transition-all',
                            rx.food_instruction === opt.value
                              ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                              : 'border-border text-muted hover:text-white')}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-muted text-sm">Times per day</label>
                      <button onClick={() => setRxList(l => l.map((r, idx) => idx === i ? { ...r, schedule_times: [...r.schedule_times, '08:00'] } : r))}
                        className="text-primary-400 text-xs hover:text-primary-300 flex items-center gap-1">
                        <Plus size={12} /> Add time
                      </button>
                    </div>
                    <div className="space-y-2">
                      {rx.schedule_times.map((t, ti) => (
                        <div key={ti} className="flex items-center gap-2">
                          <input type="time" value={t}
                            onChange={e => setRxList(l => l.map((r, idx) => idx === i
                              ? { ...r, schedule_times: r.schedule_times.map((x, xi) => xi === ti ? e.target.value : x) }
                              : r))}
                            className="dash-input flex-1" />
                          {rx.schedule_times.length > 1 && (
                            <button onClick={() => setRxList(l => l.map((r, idx) => idx === i
                              ? { ...r, schedule_times: r.schedule_times.filter((_, xi) => xi !== ti) }
                              : r))}
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
                <Plus size={16} /> Add Another Medicine
              </button>
            </div>

            <button onClick={handleSubmit} disabled={saving}
              className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              {saving
                ? <><Loader size={18} className="animate-spin" /> Registering...</>
                : <><Check size={18} /> Register & Schedule SMS</>}
            </button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}