import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/types';
import toast from 'react-hot-toast';

interface AppointmentsState {
  appointments: Appointment[];
  loading: boolean;

  fetchAppointments: (userId: string) => Promise<void>;
  addAppointment: (appt: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'reminder_sent_day_before' | 'reminder_sent_hour_before'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
}

export const useAppointmentsStore = create<AppointmentsState>()((set) => ({
  appointments: [],
  loading: false,

  fetchAppointments: async (userId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      set({ appointments: data || [], loading: false });
    } catch (err: any) {
      set({ loading: false });
      toast.error('Failed to load appointments');
    }
  },

  addAppointment: async (appt) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appt)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        appointments: [...state.appointments, data].sort(
          (a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
        ),
        loading: false,
      }));
      toast.success('Appointment scheduled!');
    } catch (err: any) {
      set({ loading: false });
      toast.error(err.message || 'Failed to add appointment');
      throw err;
    }
  },

  updateAppointment: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? data : a)),
      }));
    } catch (err: any) {
      toast.error('Failed to update appointment');
    }
  },

  deleteAppointment: async (id) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        appointments: state.appointments.filter((a) => a.id !== id),
      }));
      toast.success('Appointment cancelled');
    } catch (err: any) {
      toast.error('Failed to cancel appointment');
    }
  },
}));
