'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Search, X, MessageSquare, Clock, CheckCircle, AlertCircle, RefreshCw, Phone, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '@/store/authStore';

interface SmsRecord {
  id: string;
  user_id: string;
  phone: string;
  medication_name: string;
  dose_time: string;
  send_at: string;
  message: string;
  language: string;
  status: string;
  sent_at?: string;
  created_at: string;
  patient?: { full_name?: string; phone: string };
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  className: 'text-yellow-400 bg-yellow-900/30 border-yellow-900/40', icon: <Clock size={11} /> },
  sent:     { label: 'Sent',     className: 'text-green-400 bg-green-900/30 border-green-900/40',   icon: <CheckCircle size={11} /> },
  failed:   { label: 'Failed',   className: 'text-red-400 bg-red-900/30 border-red-900/40',         icon: <AlertCircle size={11} /> },
};

export default function SmsViewerPage() {
  const { user, pharmacy } = useAuthStore();
  const [records, setRecords] = useState<SmsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchSms(); }, []);

  const fetchSms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sms_schedules')
      .select('*, patient:users!sms_schedules_user_id_fkey(full_name, phone)')
      .order('created_at', { ascending: false });

    if (!error) setRecords(data || []);
    setLoading(false);
  };

  const filtered = records
    .filter(r => {
      const name = r.patient?.full_name || r.phone;
      return (
        name.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search) ||
        r.medication_name.toLowerCase().includes(search.toLowerCase())
      );
    })
    .filter(r => filterStatus === 'all' || r.status === filterStatus);

  const counts = {
    all: records.length,
    pending: records.filter(r => r.status === 'pending').length,
    sent: records.filter(r => r.status === 'sent').length,
    failed: records.filter(r => r.status === 'failed').length,
  };

  return (
    <DashboardLayout title="SMS Reminders">
      <div className="space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'all',     label: 'Total',   color: 'text-white' },
            { key: 'pending', label: 'Pending', color: 'text-yellow-400' },
            { key: 'sent',    label: 'Sent',    color: 'text-green-400' },
            { key: 'failed',  label: 'Failed',  color: 'text-red-400' },
          ].map(s => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)}
              className={cn('bg-card border rounded-xl p-3 text-center transition-colors',
                filterStatus === s.key ? 'border-primary-500' : 'border-border hover:border-white/20')}>
              <p className="text-muted text-xs mb-1">{s.label}</p>
              <p className={cn('font-semibold text-lg', s.color)}>{counts[s.key as keyof typeof counts]}</p>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
            <Search size={16} className="text-muted flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient, phone, or medicine..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-muted" />
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-muted" /></button>}
          </div>
          <button onClick={fetchSms}
            className="flex items-center gap-2 border border-border text-muted hover:text-white px-4 h-10 rounded-xl text-sm transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-border animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-40 bg-border rounded animate-pulse" />
                    <div className="h-3 w-28 bg-border rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <MessageSquare size={28} className="text-muted mx-auto" />
              <p className="text-muted text-sm">No SMS records found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(r => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG['pending'];
                const isOpen = expanded === r.id;
                const patientName = r.patient?.full_name || r.phone;

                return (
                  <div key={r.id}>
                    <button onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">
                        {patientName[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{patientName}</p>
                        <p className="text-muted text-xs truncate flex items-center gap-1">
                          <Phone size={10} />{r.phone}
                          <span className="mx-1">·</span>
                          {r.medication_name}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border', sc.className)}>
                          {sc.icon}{sc.label}
                        </span>
                        <span className="text-muted text-xs">Send at {r.send_at}</span>
                      </div>
                    </button>

                    {/* Expanded message */}
                    {isOpen && (
                      <div className="border-t border-border px-4 py-3 bg-surface/40 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted mb-0.5">Dose Time</p>
                            <p className="text-white font-medium">{r.dose_time}</p>
                          </div>
                          <div>
                            <p className="text-muted mb-0.5">Language</p>
                            <p className="text-white font-medium capitalize">{r.language}</p>
                          </div>
                          <div>
                            <p className="text-muted mb-0.5">Scheduled</p>
                            <p className="text-white font-medium">
                              {format(parseISO(r.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          {r.sent_at && (
                            <div>
                              <p className="text-muted mb-0.5">Sent At</p>
                              <p className="text-white font-medium">
                                {format(parseISO(r.sent_at), 'MMM d, HH:mm')}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Message preview */}
                        <div className="bg-card border border-border rounded-xl p-3">
                          <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                            <MessageSquare size={11} /> Message Preview
                          </p>
                          <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{r.message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}