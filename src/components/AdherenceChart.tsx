import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format, subDays, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function AdherenceChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = subDays(new Date(), 14).toISOString();
      const { data: logs } = await supabase.from('logs').select('status, scheduled_time').gte('scheduled_time', since);

      const byDay: Record<string, { taken: number; total: number }> = {};
      for (let i = 13; i >= 0; i--) {
        byDay[format(subDays(new Date(), i), 'MMM d')] = { taken: 0, total: 0 };
      }

      (logs || []).forEach((l: any) => {
        const day = format(parseISO(l.scheduled_time), 'MMM d');
        if (byDay[day]) {
          byDay[day].total++;
          if (l.status === 'taken') byDay[day].taken++;
        }
      });

      setData(Object.entries(byDay).map(([date, { taken, total }]) => ({
        date,
        adherence: total > 0 ? Math.round((taken / total) * 100) : null,
        taken,
        total,
      })));
      setLoading(false);
    };
    load();
  }, []);

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm">
        <p className="text-white font-medium mb-1">{label}</p>
        <p className="text-green-400">Adherence: {d.adherence ?? 'N/A'}%</p>
        <p className="text-muted">Taken: {d.taken}/{d.total}</p>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-semibold">14-Day Adherence Trend</h3>
        {!loading && data.length > 0 && (
          <span className="text-muted text-xs">
            Avg: {Math.round(data.filter(d => d.adherence != null).reduce((acc, d) => acc + (d.adherence || 0), 0) / Math.max(1, data.filter(d => d.adherence != null).length))}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-56 bg-border/30 rounded-xl animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ left: -25, right: 5 }}>
            <defs>
              <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} unit="%" />
            <Tooltip content={customTooltip} />
            <Area type="monotone" dataKey="adherence" stroke="#22c55e" strokeWidth={2}
              fill="url(#adherenceGrad)" dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#22c55e' }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
