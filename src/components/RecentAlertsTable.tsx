import { format, parseISO } from 'date-fns';
import { RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';

interface Log {
  id: string; status: string; scheduled_time: string;
  medication?: { name: string };
  user?: { full_name?: string; phone: string };
}

export function RecentAlertsTable({ logs, loading, onRefresh }: { logs: Log[]; loading: boolean; onRefresh: () => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          Today's Missed Doses
          {logs.length > 0 && (
            <span className="bg-red-900/40 text-red-400 text-xs rounded-full px-2 py-0.5">{logs.length}</span>
          )}
        </h3>
        <button onClick={onRefresh} className="text-muted hover:text-white transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Patient', 'Medication', 'Scheduled', 'Status'].map(h => (
                <th key={h} className="text-left text-muted text-xs font-semibold uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-5 py-3">
                    <div className="h-5 bg-border rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10">
                  <TrendingUp size={28} className="text-green-500 mx-auto mb-2" />
                  <p className="text-muted text-sm">All patients are on track today!</p>
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 text-xs font-bold flex-shrink-0">
                      {((log.user as any)?.full_name || 'P')[0]?.toUpperCase() || 'P'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{(log.user as any)?.full_name || 'Unknown'}</p>
                      <p className="text-muted text-xs">{(log.user as any)?.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-white text-sm">{log.medication?.name || '—'}</td>
                <td className="px-5 py-3 text-muted text-sm">
                  {format(parseISO(log.scheduled_time), 'h:mm a')}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 bg-red-900/30 text-red-400 text-xs rounded-lg px-2 py-1 font-medium">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    Missed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
