'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Stethoscope, FileText } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppointmentsStore } from '@/store/appointmentsStore';

export function AddAppointmentModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const { addAppointment } = useAppointmentsStore();
  const [form, setForm] = useState({
    title: '',
    doctor_name: '',
    specialty: '',
    appointment_date: '',
    appointment_time: '',
    location: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title || !form.appointment_date || !form.appointment_time || !user) return;
    setLoading(true);
    try {
      await addAppointment({
        user_id: user.id,
        title: form.title,
        doctor_name: form.doctor_name || undefined,
        specialty: form.specialty || undefined,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        location: form.location || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        status: 'scheduled',
      } as any);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30 }}
        className="w-full bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="text-white text-xl font-display font-bold">Schedule Appointment</h2>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={24} /></button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Title *" icon={<FileText size={16} />}>
            <input value={form.title} onChange={e => update('title', e.target.value)}
              placeholder="e.g. Annual Checkup, Follow-up visit" className="input-field" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Doctor Name" icon={<Stethoscope size={16} />}>
              <input value={form.doctor_name} onChange={e => update('doctor_name', e.target.value)}
                placeholder="Dr. Smith" className="input-field" />
            </Field>
            <Field label="Specialty">
              <input value={form.specialty} onChange={e => update('specialty', e.target.value)}
                placeholder="Cardiology" className="input-field" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *" icon={<Calendar size={16} />}>
              <input type="date" value={form.appointment_date} onChange={e => update('appointment_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input-field" />
            </Field>
            <Field label="Time *" icon={<Clock size={16} />}>
              <input type="time" value={form.appointment_time} onChange={e => update('appointment_time', e.target.value)}
                className="input-field" />
            </Field>
          </div>

          <Field label="Location" icon={<MapPin size={16} />}>
            <input value={form.location} onChange={e => update('location', e.target.value)}
              placeholder="Hospital / Clinic name" className="input-field" />
          </Field>

          <Field label="Address">
            <input value={form.address} onChange={e => update('address', e.target.value)}
              placeholder="Full address" className="input-field" />
          </Field>

          <Field label="Notes">
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
              rows={2} placeholder="Reason for visit, bring insurance card, etc."
              className="input-field resize-none" />
          </Field>

          <button onClick={handleSubmit} disabled={loading || !form.title || !form.appointment_date || !form.appointment_time}
            className="w-full bg-primary-500 disabled:opacity-50 text-white h-14 rounded-2xl font-bold text-base shadow-glow mt-2">
            {loading ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-muted text-sm mb-1.5">
        {icon && <span className="text-primary-400">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

// Add input-field to globals.css equivalent inline
// (Real implementation would use @layer components)
