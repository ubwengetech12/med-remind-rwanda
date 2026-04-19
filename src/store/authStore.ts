import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phone: string;
  role: string;
  full_name?: string;
}

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  setUser: (u: User | null) => void;
  setSession: (s: any) => void;
  setLoading: (l: boolean) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
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
        const { supabase } = await import('@/lib/supabase');

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { set({ loading: false, user: null }); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, phone, role, full_name')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          set({ user: profile, loading: false });
        } else {
          set({ user: null, loading: false });
        }
      },

      signOut: async () => {
        const { supabase } = await import('@/lib/supabase');
        await supabase.auth.signOut();
        set({ user: null, session: null });
      },
    }),
    { name: 'medwise-dashboard-auth', partialize: (s) => ({ user: s.user }) }
  )
);