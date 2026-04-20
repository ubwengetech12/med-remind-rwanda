'use client';
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MessageSquare, Globe, Clock, Save, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { buildSmsMessage } from '@/lib/smsTemplates';

type Language = 'kinyarwanda' | 'english' | 'french' | 'kiswahili';

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: 'kinyarwanda', label: 'Kinyarwanda', flag: '🇷🇼' },
  { value: 'english',     label: 'English',     flag: '🇬🇧' },
  { value: 'french',      label: 'French',      flag: '🇫🇷' },
  { value: 'kiswahili',   label: 'Kiswahili',   flag: '🇹🇿' },
];

const PREVIEW_DATA = {
  patientName: 'Jean Pierre',
  pharmacyName: 'Vision Pharmacy',
  medicineName: 'Metformin 500mg',
  doseNumber: 2,
  totalDoses: 3,
  exactTime: '14:00',
  supportNumber: '+250 788 000 000',
};

export default function SmsSettingsPage() {
  const { pharmacy } = useAuthStore();
  const [language, setLanguage] = useState<Language>('kinyarwanda');
  const [sendMinutesBefore, setSendMinutesBefore] = useState(5);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const previewText = buildSmsMessage(language, {
    ...PREVIEW_DATA,
    pharmacyName: pharmacy?.name || PREVIEW_DATA.pharmacyName,
    supportNumber: pharmacy?.phone || PREVIEW_DATA.supportNumber,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    // Persist to localStorage (or extend authStore as needed)
    localStorage.setItem('sms_language', language);
    localStorage.setItem('sms_minutes_before', String(sendMinutesBefore));
    toast.success('SMS settings saved!');
    setSaving(false);
  };

  return (
    <DashboardLayout title="SMS Settings">
      <div className="max-w-2xl space-y-6">

        {/* Auto-timing */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-primary-400" />
            <h3 className="text-white font-semibold">Automatic Send Time</h3>
          </div>
          <p className="text-muted text-sm mb-4">
            SMS is sent automatically before each scheduled dose time.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
              <span className="text-white text-sm font-medium">Send before dose</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setSendMinutesBefore(m => Math.max(1, m - 1))}
                  className="w-8 h-8 rounded-lg bg-border hover:bg-primary-500/20 text-white font-bold transition-colors flex items-center justify-center">−</button>
                <span className="text-primary-400 font-bold text-lg w-12 text-center">{sendMinutesBefore} min</span>
                <button onClick={() => setSendMinutesBefore(m => Math.min(60, m + 1))}
                  className="w-8 h-8 rounded-lg bg-border hover:bg-primary-500/20 text-white font-bold transition-colors flex items-center justify-center">+</button>
              </div>
            </div>
          </div>
          <p className="text-muted text-xs mt-3">
            Default is 5 minutes. Example: dose at 14:00 → SMS sent at 13:55.
          </p>
        </div>

        {/* Language */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={18} className="text-primary-400" />
            <h3 className="text-white font-semibold">SMS Language</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map(l => (
              <button key={l.value} onClick={() => setLanguage(l.value)}
                className={cn('flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                  language === l.value
                    ? 'bg-primary-900/20 border-primary-500/50 text-white'
                    : 'bg-surface border-border text-muted hover:text-white hover:border-border/80')}>
                <span className="text-2xl">{l.flag}</span>
                <span className="font-medium text-sm">{l.label}</span>
                {language === l.value && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-primary-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* SMS Style / Preview */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-primary-400" />
              <h3 className="text-white font-semibold">SMS Style Preview</h3>
            </div>
            <button onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors">
              <Eye size={13} /> {showPreview ? 'Hide' : 'Show'}
            </button>
          </div>

          <p className="text-muted text-xs mb-4">
            Format: Greeting → Patient name → Pharmacy → Target → Medicine → Time (number + exact time) → Support number → Thanks
          </p>

          {showPreview && (
            <div className="bg-gray-900 rounded-2xl p-4 border border-border">
              {/* Phone mockup */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                <div className="w-7 h-7 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400 text-xs font-bold">
                  {(pharmacy?.name || 'VP')[0]}
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{pharmacy?.name || 'Vision Pharmacy'}</p>
                  <p className="text-muted text-xs">{pharmacy?.phone || '+250 788 000 000'}</p>
                </div>
                <span className="ml-auto text-muted text-xs">now</span>
              </div>
              <div className="bg-primary-900/20 border border-primary-900/40 rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-white text-sm leading-relaxed whitespace-pre-line">{previewText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save SMS Settings'}
        </button>
      </div>
    </DashboardLayout>
  );
}