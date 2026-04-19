import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import '../styles/globals.css';

const PUBLIC_ROUTES = ['/login'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user, loading, setSession, fetchProfile } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        await fetchProfile();
      } else {
        useAuthStore.getState().setUser(null);
        useAuthStore.getState().setLoading(false);
      }
    });

    // Check for existing session on mount without double-fetching
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        useAuthStore.getState().setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_ROUTES.includes(router.pathname);
    if (!user && !isPublic) {
      router.replace('/login');
    } else if (user && user.role !== 'pharmacist' && !isPublic) {
      router.replace('/login');
    } else if (user && isPublic) {
      router.replace('/');
    }
  }, [user, loading, router.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-primary-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            border: '1px solid #334155',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </>
  );
}