'use client';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Users, Pill, Calendar, Package, MessageSquare, Activity } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecentVisit {
  id: string;
  visit_date: string;
  patient: { full_name?: string; phone: string };
  visit_prescriptions: { medicine_name: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalMedications: 0,
    appointmentsToday: 0,
    stockItems: 0,
    pendingSms: 0,
    totalVisits: 0,
  });
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [patients, medications, visits, stock, sms, appts, recent] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'patient'),
        supabase.from('medications').select('id', { count: 'exact' }),
        supabase.from('patient_visits').select('id', { count: 'exact' }),
        supabase.from('pharmacy_stock').select('id', { count: 'exact' }).gt('quantity', 0),
        supabase.from('sms_schedules').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('visit_appointments').select('id', { count: 'exact' }).eq('appointment_date', today),
        supabase.from('patient_visits')
          .select('id, visit_date, patient:users(full_name, phone), visit_prescriptions(medicine_name)')
          .order('visit_date', { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalPatients: patients.count || 0,
        totalMedications: medications.count || 0,
        totalVisits: visits.count || 0,
        stockItems: stock.count || 0,
        pendingSms: sms.count || 0,
        appointmentsToday: appts.count || 0,
      });
      setRecentVisits((recent.data || []) as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>MedWise — Dashboard</title>
      </Head>
      <DashboardLayout title="Overview">
        <div className="space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total Patients"   value={stats.totalPatients}    icon={<Users size={20} />}         color="blue"   loading={loading} />
            <StatCard label="Medications"      value={stats.totalMedications}  icon={<Pill size={20} />}          color="green"  loading={loading} />
            <StatCard label="Total Visits"     value={stats.totalVisits}       icon={<Activity size={20} />}      color="purple" loading={loading} />
            <StatCard label="Appts Today"      value={stats.appointmentsToday} icon={<Calendar size={20} />}      color="yellow" loading={loading} urgent={stats.appointmentsToday > 0} />
            <StatCard label="Stock Items"      value={stats.stockItems}        icon={<Package size={20} />}       color="blue"   loading={loading} />
            <StatCard label="Pending SMS"      value={stats.pendingSms}        icon={<MessageSquare size={20} />} color="red"    loading={loading} urgent={stats.pendingSms > 0} />
          </div>

          {/* Recent Visits */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Activity size={16} className="text-primary-400" /> Recent Visits
              </h3>
              <button onClick={() => router.push('/patients')} className="text-primary-400 text-xs hover:text-primary-300 transition-colors">
                View all →
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-border">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-border animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-36 bg-border rounded animate-pulse" />
                      <div className="h-3 w-24 bg-border rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentVisits.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Users size={28} className="text-muted mx-auto" />
                <p className="text-muted text-sm">No visits yet</p>
                <button onClick={() => router.push('/patients/register')}
                  className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                  Register First Patient
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentVisits.map(v => {
                  const patient = v.patient as any;
                  const name = patient?.full_name || patient?.phone || 'Unknown';
                  const meds = v.visit_prescriptions?.map((r: any) => r.medicine_name).join(', ') || '—';
                  const todayVisit = isToday(parseISO(v.visit_date));
                  return (
                    <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary-900/40 flex items-center justify-center text-primary-400 text-xs font-bold flex-shrink-0">
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{name}</p>
                        <p className="text-muted text-xs truncate">{meds}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn('text-xs font-medium', todayVisit ? 'text-primary-400' : 'text-muted')}>
                          {todayVisit ? 'Today' : format(parseISO(v.visit_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Register Patient', href: '/patients/register', color: 'bg-primary-500 hover:bg-primary-400' },
              { label: 'View Patients',    href: '/patients',          color: 'bg-card hover:bg-white/5 border border-border' },
              { label: 'Medications',      href: '/medications',       color: 'bg-card hover:bg-white/5 border border-border' },
              { label: 'Appointments',     href: '/appointments',      color: 'bg-card hover:bg-white/5 border border-border' },
            ].map(a => (
              <button key={a.href} onClick={() => router.push(a.href)}
                className={cn('rounded-xl py-3 text-sm font-semibold text-white transition-colors', a.color)}>
                {a.label}
              </button>
            ))}
          </div>

        </div>
      </DashboardLayout>
    </>
  );
}