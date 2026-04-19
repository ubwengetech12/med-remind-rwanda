import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      fetchProfile: async () => {
        // If we already have a user from local login, just clear loading
        const current = get().user;
        if (current) {
          set({ loading: false });
          return;
        }
        // Otherwise try Supabase
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            set({ user: null, loading: false });
            return;
          }
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (error) throw error;
          set({ user: data, loading: false });
        } catch (err) {
          set({ loading: false });
        }
      },

      signOut: async () => {
        try { await supabase.auth.signOut(); } catch {}
        set({ user: null, session: null });
      },
    }),
    {
      name: 'medwise-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);