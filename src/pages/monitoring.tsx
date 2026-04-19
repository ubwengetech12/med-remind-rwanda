'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { format, subDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string; status: string; scheduled_time: string;
  medication?: { name: string }; user?: { full_name?: string; phone: string };
}

export default function MonitoringPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [patientAdherence, setPatientAdherence] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState(7);

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    const since = subDays(new Date(), dateRange).toISOString();

    const { data: logData } = await supabase
      .from('logs')
      .select('*, medication:medications(name), user:users(full_name, phone)')
      .gte('scheduled_time', since)
      .order('scheduled_time', { ascending: false });

    const allLogs = logData || [];
    setLogs(allLogs.filter((l: LogEntry) => l.status === 'skipped').slice(0, 50));

    // Build daily chart data
    const byDay: Record<string, { taken: number; skipped: number; pending: number }> = {};
    for (let i = 0; i < dateRange; i++) {
      const day = format(subDays(new Date(), i), 'MMM d');
      byDay[day] = { taken: 0, skipped: 0, pending: 0 };
    }
    allLogs.forEach((l: LogEntry) => {
      const day = format(parseISO(l.scheduled_time), 'MMM d');
      if (byDay[day]) {
        byDay[day][l.status as 'taken'|'skipped'|'pending']++;
      }
    });
    setChartData(Object.entries(byDay).reverse().map(([date, counts]) => ({ date, ...counts })));

    // Per-patient adherence
    const byPatient: Record<string, { name: string; taken: number; total: number }> = {};
    allLogs.forEach((l: LogEntry) => {
      const uid = (l as any).user_id || '';
      if (!byPatient[uid]) {
        byPatient[uid] = { name: (l.user as any)?.full_name || (l.user as any)?.phone || uid, taken: 0, total: 0 };
      }
      byPatient[uid].total++;
      if (l.status === 'taken') byPatient[uid].taken++;
    });
    setPatientAdherence(
      Object.values(byPatient)
        .map(p => ({ ...p, rate: p.total > 0 ? Math.round((p.taken / p.total) * 100) : 0 }))
        .sort((a, b) => a.rate - b.rate)
        .slice(0, 10)
    );

    setLoading(false);
  };

  const customTooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' };

  return (
    <DashboardLayout title="Monitoring">
      <div className="space-y-6">
        {/* Range selector */}
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDateRange(d)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                dateRange === d ? 'bg-primary-500 border-primary-500 text-white' : 'border-border text-muted hover:text-white')}>
              Last {d} days
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Adherence over time */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-5">Daily Dose Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: -20 }}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="taken" name="Taken" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="skipped" name="Skipped" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="pending" name="Pending" fill="#334155" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Patient adherence rates */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-5">Patient Adherence Rates</h3>
            {loading ? (
              <div className="space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-8 bg-border rounded animate-pulse" />)}</div>
            ) : patientAdherence.length === 0 ? (
              <p className="text-muted text-sm text-center py-8">No data in this period</p>
            ) : (
              <div className="space-y-3">
                {patientAdherence.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-muted text-xs w-28 truncate">{p.name}</span>
                    <div className="flex-1 h-2.5 bg-border rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-700',
                        p.rate >= 80 ? 'bg-green-500' : p.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500')}
                        style={{ width: `${p.rate}%` }} />
                    </div>
                    <span className={cn('text-xs font-semibold w-10 text-right',
                      p.rate >= 80 ? 'text-green-400' : p.rate >= 50 ? 'text-yellow-400' : 'text-red-400')}>
                      {p.rate}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Missed doses table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Missed Doses ({logs.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Patient', 'Medication', 'Scheduled Time', 'Status'].map(h => (
                    <th key={h} className="text-left text-muted text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-5 bg-border rounded animate-pulse" /></td></tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10">
                      <TrendingUp size={32} className="text-green-500 mx-auto mb-2" />
                      <p className="text-muted text-sm">All patients are on track! 🎉</p>
                    </td>
                  </tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 text-xs font-bold">
                          {((log.user as any)?.full_name || 'P')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm">{(log.user as any)?.full_name || 'Unknown'}</p>
                          <p className="text-muted text-xs">{(log.user as any)?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white text-sm">{log.medication?.name}</td>
                    <td className="px-4 py-3 text-muted text-sm">
                      {format(parseISO(log.scheduled_time), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 bg-red-900/30 text-red-400 text-xs rounded-lg px-2 py-1">
                        <TrendingDown size={12} /> Missed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
