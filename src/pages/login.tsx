'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, RefreshCw, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

const TEST_PHARMACISTS = [
  { id: 'pharm001', phone: '+2000000001', password: 'test123', full_name: 'Dr. Alice Pharmacist', role: 'pharmacist' },
  { id: 'pharm002', phone: '+2000000002', password: 'test123', full_name: 'Dr. Bob Chemist', role: 'pharmacist' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setLoading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoadingLocal] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Enter username and password'); return; }
    setLoadingLocal(true);
    await new Promise((r) => setTimeout(r, 600));

    if (password !== 'test123') {
      toast.error('Wrong password');
      setLoadingLocal(false);
      return;
    }

    const match = TEST_PHARMACISTS.find(
      (u) => u.full_name.toLowerCase().replace(/\s/g, '') === username.toLowerCase().replace(/\s/g, '')
        || u.phone === username
        || u.id === username
    );

    if (!match) {
      toast.error('Pharmacist account not found');
      setLoadingLocal(false);
      return;
    }

    setUser({ id: match.id, phone: match.phone, role: match.role, full_name: match.full_name });
    setLoading(false);
    toast.success(`Welcome, ${match.full_name}!`);
    router.replace('/');
    setLoadingLocal(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 border-r border-border flex-col items-center justify-center p-12">
        <div className="max-w-sm text-center">
          <div className="w-20 h-20 bg-primary-500/10 border border-primary-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl">💊</span>
          </div>
          <h1 className="text-white text-4xl font-bold mb-4">MedWise</h1>
          <p className="text-muted text-lg mb-8">Pharmacist Dashboard</p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {['Patient Management', 'Medication Database', 'Adherence Monitoring', 'Appointment Scheduling'].map(f => (
              <div key={f} className="bg-gray-800 rounded-xl p-4 border border-border">
                <div className="w-2 h-2 bg-primary-500 rounded-full mb-2" />
                <p className="text-white text-sm font-medium">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
              <span className="text-xl">💊</span>
            </div>
            <div>
              <p className="text-white font-bold">MedWise</p>
              <p className="text-muted text-xs">Pharmacist Portal</p>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-white text-2xl font-bold mb-1">Sign in</h2>
            <p className="text-muted text-sm mb-8">Pharmacist access only</p>

            <label className="block text-muted text-sm mb-2">Username</label>
            <div className="flex items-center bg-gray-800 border border-border rounded-xl px-4 h-12 gap-3 mb-4">
              <span className="text-muted">👤</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Dr. Alice Pharmacist"
                className="flex-1 bg-transparent text-white outline-none placeholder:text-muted text-sm"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <label className="block text-muted text-sm mb-2">Password</label>
            <div className="flex items-center bg-gray-800 border border-border rounded-xl px-4 h-12 gap-3 mb-6">
              <Lock size={18} className="text-muted flex-shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="test123"
                className="flex-1 bg-transparent text-white outline-none placeholder:text-muted text-sm"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button onClick={() => setShowPassword(!showPassword)} className="text-muted hover:text-white">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <><ArrowRight size={18} /> Sign In</>}
            </button>

            {/* Test accounts */}
            <div className="mt-6 p-4 bg-gray-800 rounded-xl border border-border space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-primary-400" />
                <p className="text-primary-400 text-sm font-medium">Test pharmacist accounts</p>
              </div>
              {TEST_PHARMACISTS.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setUsername(u.full_name); setPassword('test123'); }}
                  className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-700 rounded-xl px-3 py-2 transition-colors"
                >
                  <span className="text-white text-sm">{u.full_name}</span>
                  <span className="text-muted text-xs font-mono">test123</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}