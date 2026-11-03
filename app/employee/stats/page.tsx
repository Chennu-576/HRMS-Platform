'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import type { Attendance, LeaveRequest, LeaveBalance, LeaveType } from '@/lib/types';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#14b8a6'];

export default function EmployeeStatsPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<(LeaveRequest & { leave_types: LeaveType })[]>([]);
  const [balances, setBalances] = useState<(LeaveBalance & { leave_types: LeaveType })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const start = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
    Promise.all([
      supabase.from('attendance').select('*').eq('user_id', user.id).gte('date', start).order('date', { ascending: true }),
      supabase.from('leave_requests').select('*, leave_types(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('leave_balances').select('*, leave_types(*)').eq('user_id', user.id).eq('year', new Date().getFullYear()),
    ]).then(([attRes, leaveRes, balRes]) => {
      if (attRes.data) setAttendance(attRes.data as Attendance[]);
      if (leaveRes.data) setLeaves(leaveRes.data as any);
      if (balRes.data) setBalances(balRes.data as any);
      setLoading(false);
    });
  }, [user]);

  // Monthly attendance trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: { month: string; present: number; late: number; halfDay: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = format(startOfMonth(d), 'yyyy-MM-dd');
      const end = format(endOfMonth(d), 'yyyy-MM-dd');
      const monthRecords = attendance.filter(r => r.date >= start && r.date <= end);
      months.push({
        month: format(d, 'MMM'),
        present: monthRecords.filter(r => r.status === 'present').length,
        late: monthRecords.filter(r => r.status === 'late').length,
        halfDay: monthRecords.filter(r => r.status === 'half_day').length,
      });
    }
    return months;
  }, [attendance]);

  // Leave usage by type
  const leaveUsage = useMemo(() => {
    return balances.map(b => ({
      name: b.leave_types.name,
      used: b.used,
      remaining: b.balance - b.used,
    }));
  }, [balances]);

  // On-time vs late ratio
  const onTimeData = useMemo(() => {
    const present = attendance.filter(r => r.status === 'present').length;
    const late = attendance.filter(r => r.status === 'late').length;
    const halfDay = attendance.filter(r => r.status === 'half_day').length;
    return [
      { name: 'On Time', value: present },
      { name: 'Late', value: late },
      { name: 'Half Day', value: halfDay },
    ].filter(d => d.value > 0);
  }, [attendance]);

  const totalPresent = attendance.filter(r => r.status === 'present').length;
  const totalLate = attendance.filter(r => r.status === 'late').length;
  const totalHalfDay = attendance.filter(r => r.status === 'half_day').length;
  const attendancePct = attendance.length > 0 ? Math.round((totalPresent / attendance.length) * 100) : 0;

  if (loading) return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="My Stats" description="Personal attendance and leave analytics" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="On-time Days" value={totalPresent} icon={CheckCircle2} accent="green" delay={0} />
        <StatCard label="Late Marks" value={totalLate} icon={AlertCircle} accent="amber" delay={0.05} />
        <StatCard label="Half Days" value={totalHalfDay} icon={Clock} accent="blue" delay={0.1} />
        <StatCard label="Attendance %" value={`${attendancePct}%`} icon={TrendingUp} accent="teal" delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Trend */}
        <SectionCard title="Attendance Trend" description="Last 6 months">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fill="url(#presentGrad)" name="Present" />
              <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fill="url(#lateGrad)" name="Late" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* On-time vs Late Pie */}
        <SectionCard title="Attendance Breakdown" description="On-time vs late ratio">
          {onTimeData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={onTimeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {onTimeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Leave Usage */}
      <SectionCard title="Leave Usage" description="Used vs remaining leave by type">
        {leaveUsage.length === 0 ? (
          <p className="text-sm text-slate-500">No leave data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={leaveUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="used" fill="#2563eb" radius={[4, 4, 0, 0]} name="Used" />
              <Bar dataKey="remaining" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  );
}
