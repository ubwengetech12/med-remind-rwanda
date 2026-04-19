'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMedicationsStore } from '@/store/medicationsStore';
import type { FoodInstruction } from '@/types';

const FOOD_OPTIONS: { value: FoodInstruction; label: string }[] = [
  { value: 'before_food', label: 'Before Food' },
  { value: 'after_food', label: 'After Food' },
  { value: 'with_food', label: 'With Food' },
  { value: 'empty_stomach', label: 'Empty Stomach' },
];

export function AddMedicationModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const { medicationDb, addMedication } = useMedicationsStore();
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedMedId, setSelectedMedId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    dosage: '',
    food_instruction: 'with_food' as FoodInstruction,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  });
  const [times, setTimes] = useState(['08:00']);
  const [loading, setLoading] = useState(false);

  const filtered = medicationDb.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const addTime = () => setTimes((prev) => [...prev, '12:00']);
  const removeTime = (i: number) => setTimes((prev) => prev.filter((_, idx) => idx !== i));
  const updateTime = (i: number, val: string) =>
    setTimes((prev) => prev.map((t, idx) => (idx === i ? val : t)));

  const handleSubmit = async () => {
    if (!selectedMedId || !form.dosage || times.length === 0 || !user) return;
    setLoading(true);
    try {
      await addMedication({
        user_id: user.id,
        medication_id: selectedMedId,
        dosage: form.dosage,
        schedule_times: times,
        food_instruction: form.food_instruction,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        is_active: true,
        notes: form.notes,
      });
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
          <div>
            <h2 className="text-white text-xl font-display font-bold">
              {step === 'select' ? 'Choose Medication' : 'Configure Dosage'}
            </h2>
            {step === 'configure' && (
              <p className="text-primary-400 text-sm">
                {medicationDb.find((m) => m.id === selectedMedId)?.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-5">
          {step === 'select' ? (
            <>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medications..."
                className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-primary-500 placeholder:text-muted mb-4" />
              <div className="space-y-2">
                {filtered.map((med) => (
                  <button key={med.id} onClick={() => { setSelectedMedId(med.id); setStep('configure'); }}
                    className="w-full bg-surface hover:bg-border/30 border border-border rounded-2xl p-4 text-left transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold">{med.name}</p>
                        {med.generic_name && <p className="text-muted text-sm">{med.generic_name}</p>}
                        {med.category && <p className="text-primary-400 text-xs mt-1">{med.category}</p>}
                      </div>
                      <span className={`text-xs font-medium rounded-lg px-2 py-1 ${
                        med.safety_level === 'green' ? 'bg-green-900/40 text-green-400' :
                        med.safety_level === 'yellow' ? 'bg-yellow-900/40 text-yellow-400' :
                        'bg-red-900/40 text-red-400'
                      }`}>
                        {med.safety_level === 'green' ? 'Safe' : med.safety_level === 'yellow' ? 'Caution' : 'High Risk'}
                      </span>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-muted py-8">No medications found. Ask your pharmacist to add it.</p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-muted text-sm mb-2">Dosage *</label>
                <input value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
                  placeholder="e.g. 500mg, 1 tablet" className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-primary-500 placeholder:text-muted" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-muted text-sm">Schedule Times *</label>
                  <button onClick={addTime} className="text-primary-400 text-sm flex items-center gap-1 hover:text-primary-300">
                    <Plus size={14} /> Add Time
                  </button>
                </div>
                <div className="space-y-2">
                  {times.map((t, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-3">
                        <Clock size={16} className="text-muted" />
                        <input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)}
                          className="flex-1 bg-transparent text-white text-sm outline-none" />
                      </div>
                      {times.length > 1 && (
                        <button onClick={() => removeTime(i)} className="text-red-400 hover:text-red-300 p-2">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-muted text-sm mb-2">Food Instruction</label>
                <div className="grid grid-cols-2 gap-2">
                  {FOOD_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setForm((f) => ({ ...f, food_instruction: opt.value }))}
                      className={`rounded-2xl py-3 text-sm font-medium transition-all border ${
                        form.food_instruction === opt.value
                          ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                          : 'bg-surface border-border text-muted hover:text-white'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted text-sm mb-2">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-2xl px-3 py-3 text-white text-sm outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-2">End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-2xl px-3 py-3 text-white text-sm outline-none focus:border-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-muted text-sm mb-2">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Additional notes..." className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-primary-500 placeholder:text-muted resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('select')} className="flex-1 bg-surface border border-border text-white rounded-2xl h-14 font-semibold hover:border-primary-600 transition-colors">
                  ← Back
                </button>
                <button onClick={handleSubmit} disabled={loading || !form.dosage}
                  className="flex-1 bg-primary-500 disabled:opacity-50 text-white rounded-2xl h-14 font-semibold shadow-glow">
                  {loading ? 'Adding...' : 'Add Medication'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
