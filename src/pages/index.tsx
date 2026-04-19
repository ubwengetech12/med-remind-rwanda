'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { AdherenceChart } from '@/components/AdherenceChart';
import { RecentAlertsTable } from '@/components/RecentAlertsTable';
import { Users, Pill, AlertTriangle, TrendingUp, Calendar, Activity } from 'lucide-react';

interface DashboardStats {
  totalPatients: number;
  totalMedications: number;
  missedDosesToday: number;
  avgAdherence: number;
  appointmentsToday: number;
  emergencyAlerts: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0, totalMedications: 0, missedDosesToday: 0,
    avgAdherence: 0, appointmentsToday: 0, emergencyAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [missedLogs, setMissedLogs] = useState<any[]>([]);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = `${today}T00:00:00.000Z`;
      const todayEnd = `${today}T23:59:59.999Z`;

      const [patients, medications, logs, appointments, emergency] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'patient'),
        supabase.from('medications').select('id', { count: 'exact' }),
        supabase.from('logs').select('*, medication:medications(name), user:users(full_name,phone)')
          .gte('scheduled_time', todayStart).lte('scheduled_time', todayEnd),
        supabase.from('appointments').select('id', { count: 'exact' }).eq('appointment_date', today).eq('status', 'scheduled'),
        supabase.from('emergency_alerts').select('id', { count: 'exact' }).eq('status', 'active'),
      ]);

      const allLogs = logs.data || [];
      const missed = allLogs.filter(l => l.status === 'skipped');
      const taken = allLogs.filter(l => l.status === 'taken');
      const adherence = allLogs.length > 0 ? Math.round((taken.length / allLogs.length) * 100) : 100;

      setMissedLogs(missed);
      setStats({
        totalPatients: patients.count || 0,
        totalMedications: medications.count || 0,
        missedDosesToday: missed.length,
        avgAdherence: adherence,
        appointmentsToday: appointments.count || 0,
        emergencyAlerts: emergency.count || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Overview">
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Patients" value={stats.totalPatients} icon={<Users size={20} />} color="blue" loading={loading} />
          <StatCard label="Medications" value={stats.totalMedications} icon={<Pill size={20} />} color="green" loading={loading} />
          <StatCard label="Missed Today" value={stats.missedDosesToday} icon={<AlertTriangle size={20} />} color="red" loading={loading} urgent={stats.missedDosesToday > 0} />
          <StatCard label="Avg Adherence" value={`${stats.avgAdherence}%`} icon={<TrendingUp size={20} />} color="purple" loading={loading} />
          <StatCard label="Appts Today" value={stats.appointmentsToday} icon={<Calendar size={20} />} color="yellow" loading={loading} />
          <StatCard label="SOS Alerts" value={stats.emergencyAlerts} icon={<Activity size={20} />} color="red" loading={loading} urgent={stats.emergencyAlerts > 0} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <AdherenceChart />
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-white font-semibold mb-4">Adherence Summary</h3>
            <div className="space-y-4">
              {[
                { label: 'Taken on time', pct: stats.avgAdherence, color: 'bg-green-500' },
                { label: 'Taken late', pct: Math.max(0, 100 - stats.avgAdherence - stats.missedDosesToday * 5), color: 'bg-yellow-500' },
                { label: 'Skipped', pct: 100 - stats.avgAdherence, color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted">{item.label}</span>
                    <span className="text-white font-medium">{Math.max(0, item.pct)}%</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(0, item.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Missed doses table */}
        <RecentAlertsTable logs={missedLogs} loading={loading} onRefresh={loadStats} />
      </div>
    </DashboardLayout>
  );
}
