'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Heart, AlertCircle, LogOut, ChevronRight, Bell, Shield, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, fetchProfile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    date_of_birth: user?.date_of_birth || '',
    blood_type: user?.blood_type || '',
    emergency_contact_name: user?.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('users').update(form).eq('id', user.id);
    if (error) {
      toast.error('Failed to save');
    } else {
      await fetchProfile();
      toast.success('Profile updated!');
      setEditing(false);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="bg-gradient-to-br from-primary-800 to-primary-950 px-5 pt-14 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-2xl font-display font-bold">Profile</h1>
          <button onClick={() => editing ? handleSave() : setEditing(true)}
            className={cn('rounded-2xl px-4 py-2 flex items-center gap-2 text-sm font-semibold transition-all',
              editing ? 'bg-primary-500 text-white shadow-glow' : 'bg-white/10 text-white')}>
            {saving ? 'Saving...' : editing ? <><Save size={16} /> Save</> : <><Edit2 size={16} /> Edit</>}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-primary-600/50 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{initials}</span>
          </div>
          <div>
            <h2 className="text-white text-xl font-semibold">{user?.full_name || 'Patient'}</h2>
            <p className="text-primary-300 text-sm mt-0.5 flex items-center gap-1.5">
              <Phone size={13} />{user?.phone}
            </p>
            <span className="mt-2 inline-block bg-primary-600/40 text-primary-200 text-xs rounded-lg px-2 py-1">
              Patient
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Personal Info */}
        <Section title="Personal Information" icon={<User size={18} />}>
          <FormRow label="Full Name">
            {editing ? (
              <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
                className="input-compact" placeholder="Your full name" />
            ) : <Value>{user?.full_name || '—'}</Value>}
          </FormRow>
          <FormRow label="Date of Birth">
            {editing ? (
              <input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({...f, date_of_birth: e.target.value}))}
                className="input-compact" />
            ) : <Value>{user?.date_of_birth || '—'}</Value>}
          </FormRow>
          <FormRow label="Blood Type">
            {editing ? (
              <select value={form.blood_type} onChange={e => setForm(f => ({...f, blood_type: e.target.value}))} className="input-compact">
                <option value="">Select</option>
                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            ) : (
              <Value>
                {user?.blood_type ? (
                  <span className="flex items-center gap-1.5">
                    <Heart size={14} className="text-red-400" />
                    {user.blood_type}
                  </span>
                ) : '—'}
              </Value>
            )}
          </FormRow>
        </Section>

        {/* Emergency Contact */}
        <Section title="Emergency Contact" icon={<AlertCircle size={18} className="text-red-400" />}>
          <FormRow label="Name">
            {editing ? (
              <input value={form.emergency_contact_name} onChange={e => setForm(f => ({...f, emergency_contact_name: e.target.value}))}
                className="input-compact" placeholder="Contact name" />
            ) : <Value>{user?.emergency_contact_name || '—'}</Value>}
          </FormRow>
          <FormRow label="Phone">
            {editing ? (
              <input type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({...f, emergency_contact_phone: e.target.value}))}
                className="input-compact" placeholder="+1 234 567 8900" />
            ) : <Value>{user?.emergency_contact_phone || '—'}</Value>}
          </FormRow>
        </Section>

        {/* Settings */}
        <Section title="Settings" icon={<Bell size={18} />}>
          <SettingRow label="Push Notifications" desc="Medication & appointment alerts" />
          <SettingRow label="Privacy & Security" desc="Data and account settings" />
          <SettingRow label="Language" desc="English" />
        </Section>

        <button onClick={handleSignOut}
          className="w-full bg-red-900/30 border border-red-900/50 text-red-400 rounded-3xl h-14 flex items-center justify-center gap-3 font-semibold hover:bg-red-900/50 transition-colors">
          <LogOut size={20} />
          Sign Out
        </button>

        <p className="text-center text-muted text-xs pb-2">MedWise v1.0.0 · Built with ❤️ for patients</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-primary-400">{icon}</span>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-3 gap-4">
      <span className="text-muted text-sm w-28 flex-shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="text-white text-sm">{children}</span>;
}

function SettingRow({ label, desc }: { label: string; desc: string }) {
  return (
    <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors">
      <div className="text-left">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-muted text-xs">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-muted" />
    </button>
  );
}
