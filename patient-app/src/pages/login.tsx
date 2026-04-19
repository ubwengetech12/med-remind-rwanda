'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, RefreshCw, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

const TEST_USERS = [
  { phone: '+1000000001', password: 'test123', full_name: 'John Patient', role: 'patient' },
  { phone: '+1000000002', password: 'test123', full_name: 'Sarah Johnson', role: 'patient' },
  { phone: '+1000000003', password: 'test123', full_name: 'Mike Williams', role: 'patient' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setLoading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoadingLocal] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Enter username and password');
      return;
    }
    setLoadingLocal(true);

    await new Promise((r) => setTimeout(r, 600));

    if (password !== 'test123') {
      toast.error('Wrong password');
      setLoadingLocal(false);
      return;
    }

    const match = TEST_USERS.find(
      (u) => u.full_name.toLowerCase().replace(/\s/g, '') === username.toLowerCase().replace(/\s/g, '')
        || u.phone === username
    );

    if (!match) {
      toast.error('User not found');
      setLoadingLocal(false);
      return;
    }

    setUser({
      id: match.phone,
      phone: match.phone,
      role: match.role as any,
      full_name: match.full_name,
    });
    setLoading(false);
    toast.success(`Welcome, ${match.full_name.split(' ')[0]}!`);
    router.replace('/');
    setLoadingLocal(false);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top branding */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-3xl mb-6"
        >
          <span className="text-4xl">💊</span>
        </motion.div>
        <h1 className="text-white text-3xl font-display font-bold">MedWise</h1>
        <p className="text-primary-300 mt-2 text-base">Smart medication management</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-white text-2xl font-display font-bold mb-2">Sign in</h2>
          <p className="text-muted mb-8">Use your name or phone + password</p>

          {/* Username */}
          <label className="block text-muted text-sm mb-2">Username</label>
          <div className="flex items-center bg-card border border-border rounded-2xl px-4 h-14 gap-3 mb-4">
            <span className="text-muted text-lg">👤</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="John Patient"
              className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-muted"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {/* Password */}
          <label className="block text-muted text-sm mb-2">Password</label>
          <div className="flex items-center bg-card border border-border rounded-2xl px-4 h-14 gap-3 mb-6">
            <Lock size={20} className="text-muted flex-shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="test123"
              className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-muted"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={() => setShowPassword(!showPassword)} className="text-muted hover:text-white">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white text-lg font-semibold h-14 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-glow"
          >
            {loading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <>Sign In <ArrowRight size={20} /></>
            )}
          </button>

          {/* Test credentials hint */}
          <div className="mt-6 p-4 bg-card rounded-2xl border border-border space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-primary-400" />
              <p className="text-primary-400 text-sm font-medium">Test accounts</p>
            </div>
            {TEST_USERS.map((u) => (
              <button
                key={u.phone}
                onClick={() => { setUsername(u.full_name); setPassword('test123'); }}
                className="w-full flex items-center justify-between bg-surface hover:bg-border/40 rounded-xl px-3 py-2 transition-colors"
              >
                <span className="text-white text-sm">{u.full_name}</span>
                <span className="text-muted text-xs font-mono">test123</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}