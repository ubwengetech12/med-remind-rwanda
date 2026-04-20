import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phone: string;
  role: string;
  full_name?: string;
}

interface Pharmacist {
  name: string;
  phone: string;
  job_card_number: string;
}

interface Pharmacy {
  name: string;
  email: string;
  phone: string;
  password: string;
  is_setup_complete: boolean;
}

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  pharmacy: Pharmacy | null;
  pharmacist: Pharmacist | null;
  setUser: (u: User | null) => void;
  setSession: (s: any) => void;
  setLoading: (l: boolean) => void;
  setPharmacy: (p: Pharmacy) => void;
  setPharmacist: (p: Pharmacist) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      pharmacy: null,
      pharmacist: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),
      setPharmacy: (pharmacy) => set({ pharmacy }),
      setPharmacist: (pharmacist) => set({ pharmacist }),
      signOut: () => set({ user: null, session: null }),
    }),
    {
      name: 'medwise-dashboard-auth',
      skipHydration: true,
      partialize: (s) => ({ user: s.user, pharmacy: s.pharmacy, pharmacist: s.pharmacist }),
    }
  )
);