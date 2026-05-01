'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, RefreshCw, Eye, EyeOff, Building2, User, Phone, CreditCard, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

type Mode = 'login' | 'setup' | 'change-password';

function InputField({ label, icon, value, onChange, placeholder, type = 'text', onEnter }: {
  label: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void; placeholder: string;
  type?: string; onEnter?: () => void;
}) {
  return (
    <div>
      <label className="block text-muted text-sm mb-2">{label}</label>
      <div className="flex items-center bg-gray-800 border border-border rounded-xl px-4 h-12 gap-3">
        <span className="text-muted flex-shrink-0">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white outline-none placeholder:text-muted text-sm"
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        />
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, onEnter, placeholder = '••••••••' }: {
  label: string; value: string; onChange: (v: string) => void; onEnter?: () => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-muted text-sm mb-2">{label}</label>
      <div className="flex items-center bg-gray-800 border border-border rounded-xl px-4 h-12 gap-3">
        <Lock size={16} className="text-muted flex-shrink-0" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white outline-none placeholder:text-muted text-sm"
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        />
        <button type="button" onClick={() => setShow(s => !s)} className="text-muted hover:text-white">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setLoading, setPharmacy, setPharmacist, pharmacy, pharmacist } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoadingLocal] = useState(false);

  // Login fields
  const [loginJobCard, setLoginJobCard] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Setup fields
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [pharmacyPassword, setPharmacyPassword] = useState('');
  const [pharmacistName, setPharmacistName] = useState('');
  const [pharmacistPhone, setPharmacistPhone] = useState('');
  const [jobCardNumber, setJobCardNumber] = useState('');

  // Change password fields
  const [cpJobCard, setCpJobCard] = useState('');
  const [cpOldPassword, setCpOldPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');

  const handleLogin = async () => {
    if (!loginJobCard || !loginPassword) { toast.error('Enter job card number and password'); return; }
    setLoadingLocal(true);

    // Try Supabase first
    const { data: dbPharmacy, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('job_card_number', loginJobCard.trim())
      .single();

    if (error || !dbPharmacy) {
      // Fallback: local store
      if (!pharmacy?.is_setup_complete) {
        toast.error('No pharmacy account found. Please set up first.');
        setMode('setup');
        setLoadingLocal(false);
        return;
      }
      if (
        loginJobCard.trim().toLowerCase() !== pharmacist?.job_card_number?.toLowerCase() ||
        loginPassword !== pharmacy.password
      ) {
        toast.error('Wrong job card number or password');
        setLoadingLocal(false);
        return;
      }
      // Local login success
      setUser({ id: loginJobCard.trim(), phone: pharmacy.phone, role: 'pharmacist', full_name: pharmacist?.name || pharmacy.name });
      setLoading(false);
      toast.success(`Welcome back, ${pharmacist?.name || pharmacy.name}!`);
      router.replace('/');
      setLoadingLocal(false);
      return;
    }

    if (loginPassword !== dbPharmacy.password_hash) {
      toast.error('Wrong password');
      setLoadingLocal(false);
      return;
    }

    // Sync to local store
    setPharmacy({ name: dbPharmacy.name, email: '', phone: dbPharmacy.phone || '', password: dbPharmacy.password_hash, is_setup_complete: true });
    setPharmacist({ name: dbPharmacy.pharmacist_name || '', phone: dbPharmacy.pharmacist_phone || '', job_card_number: dbPharmacy.job_card_number });
    setUser({ id: dbPharmacy.job_card_number, phone: dbPharmacy.phone || '', role: 'pharmacist', full_name: dbPharmacy.pharmacist_name || dbPharmacy.name });
    setLoading(false);
    toast.success(`Welcome back, ${dbPharmacy.pharmacist_name || dbPharmacy.name}!`);
    router.replace('/');
    setLoadingLocal(false);
  };

  const handleSetup = async () => {
    if (!pharmacyName || !pharmacyPhone || !pharmacyPassword || !pharmacistName || !pharmacistPhone || !jobCardNumber) {
      toast.error('All fields are required'); return;
    }
    if (pharmacyPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoadingLocal(true);

    const jc = jobCardNumber.trim();

    // Check if job card already exists
    const { data: existing } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('job_card_number', jc)
      .single();

    if (existing) {
      toast.error('This job card number is already registered. Sign in instead.');
      setMode('login');
      setLoadingLocal(false);
      return;
    }

    // Save to Supabase
    const { error } = await supabase.from('pharmacies').insert({
      name: pharmacyName,
      phone: pharmacyPhone,
      job_card_number: jc,
      password_hash: pharmacyPassword,
      pharmacist_name: pharmacistName,
      pharmacist_phone: pharmacistPhone,
    });

    if (error) {
      toast.error(error.message);
      setLoadingLocal(false);
      return;
    }

    // Also save to local store
    setPharmacy({ name: pharmacyName, email: '', phone: pharmacyPhone, password: pharmacyPassword, is_setup_complete: true });
    setPharmacist({ name: pharmacistName, phone: pharmacistPhone, job_card_number: jc });
    setUser({ id: jc, phone: pharmacyPhone, role: 'pharmacist', full_name: pharmacistName });
    setLoading(false);
    toast.success('Pharmacy account created!');
    router.replace('/');
    setLoadingLocal(false);
  };

  const handleChangePassword = async () => {
    if (!cpJobCard || !cpOldPassword || !cpNewPassword || !cpConfirm) {
      toast.error('All fields are required'); return;
    }
    if (cpNewPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (cpNewPassword !== cpConfirm) { toast.error('New passwords do not match'); return; }

    setLoadingLocal(true);

    // Find in Supabase
    const { data: dbPharmacy } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('job_card_number', cpJobCard.trim())
      .single();

    if (!dbPharmacy) {
      // Try local store
      if (pharmacy?.is_setup_complete && pharmacist?.job_card_number === cpJobCard.trim()) {
        if (cpOldPassword !== pharmacy.password) {
          toast.error('Current password is wrong');
          setLoadingLocal(false);
          return;
        }
        setPharmacy({ ...pharmacy, password: cpNewPassword });
        toast.success('Password changed!');
        setMode('login');
        setLoadingLocal(false);
        return;
      }
      toast.error('Job card number not found');
      setLoadingLocal(false);
      return;
    }

    if (cpOldPassword !== dbPharmacy.password_hash) {
      toast.error('Current password is wrong');
      setLoadingLocal(false);
      return;
    }

    const { error } = await supabase
      .from('pharmacies')
      .update({ password_hash: cpNewPassword })
      .eq('job_card_number', cpJobCard.trim());

    if (error) {
      toast.error(error.message);
      setLoadingLocal(false);
      return;
    }

    // Update local store too
    if (pharmacy) setPharmacy({ ...pharmacy, password: cpNewPassword });
    toast.success('Password changed successfully!');
    setMode('login');
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
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
              <span className="text-xl">💊</span>
            </div>
            <div>
              <p className="text-white font-bold">MedWise</p>
              <p className="text-muted text-xs">Pharmacist Portal</p>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              <motion.div key="login" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h2 className="text-white text-2xl font-bold mb-1">Sign in</h2>
                <p className="text-muted text-sm mb-8">Pharmacist access only</p>
                <div className="space-y-4 mb-6">
                  <InputField
                    label="Job Card Number"
                    icon={<CreditCard size={16} />}
                    value={loginJobCard}
                    onChange={setLoginJobCard}
                    placeholder="JC-2024-0001"
                    onEnter={handleLogin}
                  />
                  <PasswordField
                    label="Password"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    onEnter={handleLogin}
                  />
                </div>
                <button onClick={handleLogin} disabled={loading}
                  className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mb-4">
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : <><ArrowRight size={18} /> Sign In</>}
                </button>
                <div className="flex flex-col gap-2 text-center">
                  <button onClick={() => setMode('setup')} className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                    First time? Set up your pharmacy
                  </button>
                  <button onClick={() => setMode('change-password')} className="text-muted hover:text-white text-sm flex items-center justify-center gap-1.5">
                    <KeyRound size={13} /> Change Password
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── SETUP ── */}
            {mode === 'setup' && (
              <motion.div key="setup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h2 className="text-white text-2xl font-bold mb-1">Setup Pharmacy</h2>
                <p className="text-muted text-sm mb-6">
                  One-time setup — use your job card number & password to sign in every day
                </p>
                <div className="space-y-3 mb-4">
                  <p className="text-primary-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={12} /> Pharmacy Info
                  </p>
                  <InputField label="Pharmacy / Clinic Name" icon={<Building2 size={15} />} value={pharmacyName}
                    onChange={setPharmacyName} placeholder="Vision Pharmacy" />
                  <InputField label="Phone Number" icon={<Phone size={15} />} value={pharmacyPhone}
                    onChange={setPharmacyPhone} placeholder="+250 788 000 000" />
                  <PasswordField label="Password (used every day)" value={pharmacyPassword} onChange={setPharmacyPassword} />
                  <p className="text-primary-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 pt-2">
                    <User size={12} /> Pharmacist Info
                  </p>
                  <InputField label="Full Name" icon={<User size={15} />} value={pharmacistName}
                    onChange={setPharmacistName} placeholder="Dr. Jean Pierre" />
                  <InputField label="Phone Number" icon={<Phone size={15} />} value={pharmacistPhone}
                    onChange={setPharmacistPhone} placeholder="+250 788 111 111" />
                  <InputField label="Job Card Number" icon={<CreditCard size={15} />} value={jobCardNumber}
                    onChange={setJobCardNumber} placeholder="JC-2024-0001" onEnter={handleSetup} />
                </div>
                <button onClick={handleSetup} disabled={loading}
                  className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mb-4">
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : <><ArrowRight size={18} /> Create Account</>}
                </button>
                <p className="text-center text-muted text-sm">
                  Already set up?{' '}
                  <button onClick={() => setMode('login')} className="text-primary-400 hover:text-primary-300 font-medium">
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── CHANGE PASSWORD ── */}
            {mode === 'change-password' && (
              <motion.div key="change-password" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h2 className="text-white text-2xl font-bold mb-1">Change Password</h2>
                <p className="text-muted text-sm mb-6">Enter your job card number and current password to set a new one</p>
                <div className="space-y-4 mb-6">
                  <InputField
                    label="Job Card Number"
                    icon={<CreditCard size={16} />}
                    value={cpJobCard}
                    onChange={setCpJobCard}
                    placeholder="JC-2024-0001"
                  />
                  <PasswordField
                    label="Current Password"
                    value={cpOldPassword}
                    onChange={setCpOldPassword}
                    placeholder="Current password"
                  />
                  <PasswordField
                    label="New Password"
                    value={cpNewPassword}
                    onChange={setCpNewPassword}
                    placeholder="At least 6 characters"
                  />
                  <PasswordField
                    label="Confirm New Password"
                    value={cpConfirm}
                    onChange={setCpConfirm}
                    onEnter={handleChangePassword}
                    placeholder="Repeat new password"
                  />
                </div>
                <button onClick={handleChangePassword} disabled={loading}
                  className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mb-4">
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : <><KeyRound size={18} /> Change Password</>}
                </button>
                <p className="text-center text-muted text-sm">
                  <button onClick={() => setMode('login')} className="text-primary-400 hover:text-primary-300 font-medium">
                    Back to Sign in
                  </button>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}