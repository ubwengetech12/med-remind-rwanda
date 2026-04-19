import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { DM_Sans, Syne } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from '@/components/BottomNav';
import '../styles/globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const syne = Syne({ subsets: ['latin'], variable: '--font-syne' });

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
    } else if (user && isPublic) {
      router.replace('/');
    }
  }, [user, loading, router.pathname]);

  if (loading) {
    return (
      <div className={`${dmSans.variable} ${syne.variable} min-h-screen bg-surface flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">💊</span>
          </div>
          <p className="text-primary-400 font-medium">Loading MedWise...</p>
        </div>
      </div>
    );
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);

  return (
    <div className={`${dmSans.variable} ${syne.variable} font-sans`}>
      <Component {...pageProps} />
      {!isPublicRoute && user && <BottomNav />}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid #334155',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}