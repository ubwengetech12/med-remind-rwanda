'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { format, subDays, parseISO } from 'date-fns';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string; status: string; scheduled_time: string;
  medication?: { name: string };
  user?: { full_name?: string; phone: string };
}

interface ChatMessage {
  id: string;
  type: 'alert' | 'taken' | 'summary' | 'system';
  patient: string;
  phone?: string;
  medication?: string;
  time: string;
  status: string;
  text: string;
}

export default function MonitoringPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7);
  const [stats, setStats] = useState({ taken: 0, skipped: 0, pending: 0, total: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchData(); }, [dateRange]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchData = async () => {
    setLoading(true);
    const since = subDays(new Date(), dateRange).toISOString();
    const { data: logData } = await supabase
      .from('logs')
      .select('*, medication:medications(name), user:users(full_name, phone)')
      .gte('scheduled_time', since)
      .order('scheduled_time', { ascending: true });

    const allLogs: LogEntry[] = logData || [];
    const taken = allLogs.filter(l => l.status === 'taken').length;
    const skipped = allLogs.filter(l => l.status === 'skipped').length;
    const pending = allLogs.filter(l => l.status === 'pending').length;
    setStats({ taken, skipped, pending, total: allLogs.length });

    // Build chat messages
    const msgs: ChatMessage[] = [];

    // System intro
    msgs.push({
      id: 'sys-start',
      type: 'system',
      patient: 'MedWise',
      time: format(subDays(new Date(), dateRange), 'MMM d'),
      status: 'system',
      text: `Monitoring started — last ${dateRange} days`,
    });

    allLogs.forEach(log => {
      const name = (log.user as any)?.full_name || (log.user as any)?.phone || 'Unknown';
      const med = log.medication?.name || 'medication';
      const time = format(parseISO(log.scheduled_time), 'MMM d, h:mm a');

      if (log.status === 'taken') {
        msgs.push({
          id: log.id, type: 'taken', patient: name,
          phone: (log.user as any)?.phone,
          medication: med, time, status: 'taken',
          text: `took ${med}`,
        });
      } else if (log.status === 'skipped') {
        msgs.push({
          id: log.id, type: 'alert', patient: name,
          phone: (log.user as any)?.phone,
          medication: med, time, status: 'skipped',
          text: `missed ${med}`,
        });
      } else {
        msgs.push({
          id: log.id, type: 'taken', patient: name,
          phone: (log.user as any)?.phone,
          medication: med, time, status: 'pending',
          text: `${med} pending`,
        });
      }
    });

    // Summary message
    const adherence = allLogs.length > 0 ? Math.round((taken / allLogs.length) * 100) : 100;
    msgs.push({
      id: 'sys-end',
      type: 'summary',
      patient: 'MedWise',
      time: format(new Date(), 'h:mm a'),
      status: 'system',
      text: `Summary: ${taken} taken · ${skipped} missed · ${pending} pending · ${adherence}% adherence`,
    });

    setMessages(msgs);
    setLoading(false);
  };

  const avatarColor = (name: string) => {
    const colors = [
      'bg-blue-900/50 text-blue-400',
      'bg-purple-900/50 text-purple-400',
      'bg-pink-900/50 text-pink-400',
      'bg-orange-900/50 text-orange-400',
      'bg-teal-900/50 text-teal-400',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const statusIcon = (status: string) => {
    if (status === 'taken') return <CheckCircle size={13} className="text-green-400" />;
    if (status === 'skipped') return <AlertTriangle size={13} className="text-red-400" />;
    return <Clock size={13} className="text-yellow-400" />;
  };

  const bubbleStyle = (type: string, status: string) => {
    if (type === 'system' || type === 'summary') return 'bg-surface border border-border text-muted';
    if (status === 'taken') return 'bg-green-900/20 border border-green-900/40 text-white';
    if (status === 'skipped') return 'bg-red-900/20 border border-red-900/40 text-white';
    return 'bg-surface border border-border text-white';
  };

  return (
    <DashboardLayout title="Monitoring">
      <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
        {/* Stats bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDateRange(d)}
                className={cn('px-4 h-9 rounded-xl text-sm font-medium border transition-colors',
                  dateRange === d ? 'bg-primary-500 border-primary-500 text-white' : 'border-border text-muted hover:text-white')}>
                {d}d
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto flex-wrap">
            {[
              { label: 'Taken', val: stats.taken, color: 'text-green-400 bg-green-900/20 border-green-900/40' },
              { label: 'Missed', val: stats.skipped, color: 'text-red-400 bg-red-900/20 border-red-900/40' },
              { label: 'Pending', val: stats.pending, color: 'text-yellow-400 bg-yellow-900/20 border-yellow-900/40' },
              { label: 'Total', val: stats.total, color: 'text-muted bg-surface border-border' },
            ].map(s => (
              <div key={s.label} className={cn('flex items-center gap-1.5 px-3 h-9 rounded-xl border text-sm font-medium', s.color)}>
                <Activity size={13} />{s.val} {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-sm font-medium">Live Monitoring Feed</span>
            <span className="text-muted text-xs ml-auto">{messages.length - 2} events</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className={cn('flex gap-3', i % 3 === 0 ? 'justify-center' : '')}>
                    {i % 3 !== 0 && <div className="w-8 h-8 rounded-full bg-border animate-pulse flex-shrink-0" />}
                    <div className={cn('rounded-2xl p-3 animate-pulse bg-border', i % 3 === 0 ? 'w-48 h-7' : 'w-56 h-14')} />
                  </div>
                ))}
              </div>
            ) : (
              messages.map((msg, idx) => {
                if (msg.type === 'system') return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="bg-surface border border-border text-muted text-xs rounded-full px-4 py-1.5">
                      {msg.text} · {msg.time}
                    </span>
                  </div>
                );

                if (msg.type === 'summary') return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-primary-900/20 border border-primary-900/40 text-primary-300 text-xs rounded-2xl px-5 py-2.5 text-center max-w-sm">
                      <TrendingUp size={13} className="inline mr-1.5 mb-0.5" />
                      {msg.text}
                    </div>
                  </div>
                );

                // Alternate left/right by status for visual variety
                const isRight = msg.status === 'taken';

                return (
                  <div key={msg.id} className={cn('flex gap-2.5 items-end max-w-[80%]', isRight ? 'ml-auto flex-row-reverse' : '')}>
                    {/* Avatar */}
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', avatarColor(msg.patient))}>
                      {msg.patient[0].toUpperCase()}
                    </div>

                    {/* Bubble */}
                    <div className={cn('rounded-2xl px-4 py-2.5 max-w-xs', bubbleStyle(msg.type, msg.status),
                      isRight ? 'rounded-br-sm' : 'rounded-bl-sm')}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-white/80">{msg.patient}</span>
                        {statusIcon(msg.status)}
                      </div>
                      <p className="text-sm leading-snug">{msg.text}</p>
                      {msg.medication && msg.status !== 'taken' && (
                        <p className="text-xs text-muted mt-0.5">{msg.phone}</p>
                      )}
                      <p className="text-xs text-muted/70 mt-1 text-right">{msg.time}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Refresh bar */}
          <div className="border-t border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
            <span className="text-muted text-xs flex items-center gap-1.5">
              {stats.skipped > 0
                ? <><AlertTriangle size={12} className="text-red-400" />{stats.skipped} missed dose{stats.skipped > 1 ? 's' : ''} require attention</>
                : <><TrendingUp size={12} className="text-green-400" />All patients on track</>}
            </span>
            <button onClick={fetchData}
              className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Refresh
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}