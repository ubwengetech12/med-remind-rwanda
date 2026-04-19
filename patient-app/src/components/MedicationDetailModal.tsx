// MedicationDetailModal.tsx
'use client';
import { motion } from 'framer-motion';
import { X, Trash2, AlertTriangle, ShieldAlert, Zap, Info } from 'lucide-react';
import { useMedicationsStore } from '@/store/medicationsStore';
import { SafetyBadge } from './SafetyBadge';
import type { PatientMedication } from '@/types';

export function MedicationDetailModal({ med, onClose }: { med: PatientMedication; onClose: () => void }) {
  const { deleteMedication } = useMedicationsStore();
  const m = med.medication;

  const handleDelete = async () => {
    if (!confirm('Remove this medication?')) return;
    await deleteMedication(med.id);
    onClose();
  };

  function formatTime(t: string) {
    const [h, min] = t.split(':').map(Number);
    const p = h >= 12 ? 'PM' : 'AM';
    const hr = h > 12 ? h - 12 : h || 12;
    return `${hr}:${min.toString().padStart(2, '0')} ${p}`;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30 }}
        className="w-full bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl font-display font-bold">{m?.name}</h2>
              {m && <SafetyBadge level={m.safety_level} />}
            </div>
            {m?.generic_name && <p className="text-muted text-sm">{m.generic_name}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={24} /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Dosage" value={med.dosage} />
            <InfoCard label="Schedule" value={med.schedule_times.map(formatTime).join(', ')} />
            <InfoCard label="Food" value={med.food_instruction.replace('_', ' ')} />
            <InfoCard label="Start Date" value={med.start_date} />
          </div>

          {m?.description && (
            <div className="bg-surface rounded-2xl p-4 flex gap-3">
              <Info size={16} className="text-primary-400 flex-shrink-0 mt-0.5" />
              <p className="text-muted text-sm leading-relaxed">{m.description}</p>
            </div>
          )}

          {m?.restrictions && m.restrictions.length > 0 && (
            <Section icon={<AlertTriangle size={16} className="text-yellow-400" />} title="Restrictions" color="yellow">
              {m.restrictions.map((r, i) => <Item key={i} text={r} />)}
            </Section>
          )}

          {m?.warnings && m.warnings.length > 0 && (
            <Section icon={<ShieldAlert size={16} className="text-red-400" />} title="Warnings" color="red">
              {m.warnings.map((w, i) => <Item key={i} text={w} />)}
            </Section>
          )}

          {m?.interactions && m.interactions.length > 0 && (
            <Section icon={<Zap size={16} className="text-orange-400" />} title="Interactions" color="orange">
              {m.interactions.map((x, i) => <Item key={i} text={x} />)}
            </Section>
          )}

          {med.notes && (
            <div className="bg-surface rounded-2xl p-4">
              <p className="text-muted text-xs uppercase tracking-wider mb-2">Notes</p>
              <p className="text-white text-sm">{med.notes}</p>
            </div>
          )}

          <button onClick={handleDelete}
            className="w-full bg-red-900/30 border border-red-900/50 text-red-400 rounded-2xl h-12 flex items-center justify-center gap-2 hover:bg-red-900/50 transition-colors">
            <Trash2 size={16} />
            Remove Medication
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-2xl p-3">
      <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  const bgMap: Record<string, string> = {
    yellow: 'border-yellow-800/50 bg-yellow-900/10',
    red: 'border-red-800/50 bg-red-900/10',
    orange: 'border-orange-800/50 bg-orange-900/10',
  };
  return (
    <div className={`rounded-2xl border p-4 ${bgMap[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-white text-sm font-semibold">{title}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Item({ text }: { text: string }) {
  return <p className="text-muted text-sm">• {text}</p>;
}
