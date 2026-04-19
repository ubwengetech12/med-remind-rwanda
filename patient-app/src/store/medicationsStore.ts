import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { PatientMedication, Log, Medication } from '@/types';
import toast from 'react-hot-toast';

interface MedicationsState {
  medications: PatientMedication[];
  medicationDb: Medication[];
  todayLogs: Log[];
  loading: boolean;
  error: string | null;

  fetchMyMedications: (userId: string) => Promise<void>;
  fetchMedicationDb: () => Promise<void>;
  fetchTodayLogs: (userId: string) => Promise<void>;
  addMedication: (med: Omit<PatientMedication, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  logMedication: (params: {
    userId: string;
    medicationId: string;
    patientMedId: string;
    status: 'taken' | 'skipped';
    scheduledTime: string;
  }) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
}

export const useMedicationsStore = create<MedicationsState>()((set, get) => ({
  medications: [],
  medicationDb: [],
  todayLogs: [],
  loading: false,
  error: null,

  fetchMyMedications: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('patient_medications')
        .select(`*, medication:medications(*)`)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ medications: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      toast.error('Failed to load medications');
    }
  },

  fetchMedicationDb: async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .order('name');
      if (error) throw error;
      set({ medicationDb: data || [] });
    } catch (err: any) {
      console.error('fetchMedicationDb error:', err);
    }
  },

  fetchTodayLogs: async (userId) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    try {
      const { data, error } = await supabase
        .from('logs')
        .select(`*, medication:medications(name)`)
        .eq('user_id', userId)
        .gte('scheduled_time', startOfDay)
        .lte('scheduled_time', endOfDay);

      if (error) throw error;
      set({ todayLogs: data || [] });
    } catch (err: any) {
      console.error('fetchTodayLogs error:', err);
    }
  },

  addMedication: async (med) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('patient_medications')
        .insert(med)
        .select(`*, medication:medications(*)`)
        .single();

      if (error) throw error;
      set((state) => ({
        medications: [data, ...state.medications],
        loading: false,
      }));
      toast.success('Medication added!');
    } catch (err: any) {
      set({ loading: false });
      toast.error(err.message || 'Failed to add medication');
      throw err;
    }
  },

  logMedication: async ({ userId, medicationId, patientMedId, status, scheduledTime }) => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .upsert(
          {
            user_id: userId,
            medication_id: medicationId,
            patient_medication_id: patientMedId,
            status,
            scheduled_time: scheduledTime,
            actual_time: status === 'taken' ? new Date().toISOString() : undefined,
          },
          { onConflict: 'user_id,medication_id,scheduled_time' }
        )
        .select()
        .single();

      if (error) throw error;
      set((state) => {
        const existingIdx = state.todayLogs.findIndex(
          (l) => l.medication_id === medicationId && l.scheduled_time === scheduledTime
        );
        const newLogs = [...state.todayLogs];
        if (existingIdx >= 0) {
          newLogs[existingIdx] = data;
        } else {
          newLogs.push(data);
        }
        return { todayLogs: newLogs };
      });

      if (status === 'taken') {
        toast.success('✅ Medication logged as taken!');
      } else {
        toast('❌ Logged as skipped', { icon: '⚠️' });
      }
    } catch (err: any) {
      toast.error('Failed to log medication');
      throw err;
    }
  },

  deleteMedication: async (id) => {
    try {
      const { error } = await supabase
        .from('patient_medications')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      set((state) => ({
        medications: state.medications.filter((m) => m.id !== id),
      }));
      toast.success('Medication removed');
    } catch (err: any) {
      toast.error('Failed to remove medication');
    }
  },
}));