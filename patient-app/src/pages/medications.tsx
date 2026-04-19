'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Pill, X, ChevronRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMedicationsStore } from '@/store/medicationsStore';
import { AddMedicationModal } from '@/components/AddMedicationModal';
import { MedicationDetailModal } from '@/components/MedicationDetailModal';
import { SafetyBadge } from '@/components/SafetyBadge';
import type { PatientMedication } from '@/types';
import { cn } from '@/lib/utils';

export default function MedicationsPage() {
  const { user } = useAuthStore();
  const { medications, fetchMyMedications, fetchMedicationDb, loading } = useMedicationsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<PatientMedication | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchMyMedications(user.id);
    fetchMedicationDb();
  }, [user]);

  const filtered = medications.filter((m) =>
    m.medication?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="bg-card px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-2xl font-display font-bold">My Medications</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary-500 text-white rounded-2xl px-4 py-2 flex items-center gap-2 text-sm font-semibold shadow-glow"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        <div className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 h-11">
          <Search size={18} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medications..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={16} className="text-muted" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-3xl h-24 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Pill size={48} className="text-muted mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-1">No medications yet</p>
            <p className="text-muted text-sm">Add your first medication to get started</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 bg-primary-500 text-white rounded-2xl px-6 py-3 font-semibold shadow-glow"
            >
              Add Medication
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((med, i) => (
              <motion.button
                key={med.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(med)}
                className="w-full bg-card rounded-3xl p-4 text-left border border-border hover:border-primary-600 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-base">
                        {med.medication?.name}
                      </h3>
                      <SafetyBadge level={med.medication?.safety_level || 'green'} />
                    </div>
                    <p className="text-muted text-sm">{med.dosage}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {med.schedule_times.map((time) => (
                        <span
                          key={time}
                          className="bg-primary-900/50 text-primary-300 text-xs rounded-lg px-2 py-0.5"
                        >
                          {formatTime(time)}
                        </span>
                      ))}
                      <span className="bg-surface text-muted text-xs rounded-lg px-2 py-0.5">
                        {foodInstructionLabel(med.food_instruction)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted mt-1 flex-shrink-0" />
                </div>

                {med.medication?.warnings && med.medication.warnings.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 bg-yellow-900/20 rounded-2xl p-3">
                    <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-300 text-xs">{med.medication.warnings[0]}</p>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddMedicationModal onClose={() => setShowAdd(false)} />}
        {selected && (
          <MedicationDetailModal med={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function foodInstructionLabel(instr: string): string {
  const map: Record<string, string> = {
    before_food: 'Before food',
    after_food: 'After food',
    with_food: 'With food',
    empty_stomach: 'Empty stomach',
  };
  return map[instr] || instr;
}
