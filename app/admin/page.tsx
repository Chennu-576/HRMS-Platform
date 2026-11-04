// app/dashboard/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { StatCard } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, UserCheck, CalendarOff, FileClock, Check, X,
  TrendingUp, Activity, ShieldCheck, Bell, ChevronRight,
  MoreHorizontal, ArrowUpRight, Calendar,
  PieChart as PieChartIcon, BarChart3, AreaChart as AreaChartIcon
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Profile, LeaveRequest, LeaveType, Holiday, AuditLog, Announcement } from '@/lib/types';
import { getInitials } from '@/lib/helpers/attendance';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ComposedChart
} from 'recharts';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];

// Simple translation hook replacement
const useTranslation = () => ({
  t: (key: string) => key,
  i18n: { language: 'en' }
});



export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const appStore = useAppStore();
  const { theme, setTheme } = appStore;
  
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, onLeaveToday: 0, pendingApprovals: 0 });
  const [pendingLeaves, setPendingLeaves] = useState<(LeaveRequest & { profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>; leave_types: LeaveType })[]>([]);
  const [recentAudit, setRecentAudit] = useState<(AuditLog & { profiles: Pick<Profile, 'full_name'> | null })[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<{ day: string; present: number; late: number; absent: number }[]>([]);
  const [deptDist, setDeptDist] = useState<{ name: string; count: number }[]>([]);
  const [leaveUsage, setLeaveUsage] = useState<{ name: string; value: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; employees: number; leaves: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [empRes, attRes, leaveRes, pendRes, holRes, audRes, annRes, deptRes, balRes] = await Promise.all([
      supabase.from('profiles').select('id, role, status, department_id').eq('role', 'employee'),
      supabase.from('attendance').select('id, status').eq('date', today),
      supabase.from('leave_requests').select('id').eq('status', 'pending'),
      supabase
        .from('leave_requests')
        .select('*, profiles!leave_requests_user_id_fkey(id, full_name, email, avatar_url), leave_types(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('holidays').select('*').gte('date', today).order('date', { ascending: true }).limit(5),
      supabase.from('audit_log').select('*, profiles!audit_log_actor_id_fkey(full_name)').order('created_at', { ascending: false }).limit(8),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(4),
      supabase.from('departments').select('id, name'),
      supabase.from('leave_balances').select('used, leave_types(name)'),
    ]);

    const employees = empRes.data || [];
    const departments = deptRes.data || [];

    const deptMap = new Map<string, number>();
    employees.forEach((e: any) => {
      const dept = departments.find(d => d.id === e.department_id);
      const name = dept?.name || 'Unassigned';
      deptMap.set(name, (deptMap.get(name) || 0) + 1);
    });
    setDeptDist(Array.from(deptMap, ([name, count]) => ({ name, count })));

    const leaveMap = new Map<string, number>();
    (balRes.data || []).forEach((b: any) => {
      const name = b.leave_types?.name || 'Unknown';
      leaveMap.set(name, (leaveMap.get(name) || 0) + b.used);
    });
    setLeaveUsage(Array.from(leaveMap, ([name, value]) => ({ name, value })).filter(d => d.value > 0));

    // Weekly trend - using actual data
    const trend: { day: string; present: number; late: number; absent: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayAtt = await supabase.from('attendance').select('status').eq('date', dateStr);
      const dayData = dayAtt.data || [];
      trend.push({
        day: format(d, 'EEE'),
        present: dayData.filter((a: any) => a.status === 'present').length,
        late: dayData.filter((a: any) => a.status === 'late').length,
        absent: dayData.filter((a: any) => a.status === 'absent').length,
      });
    }
    setAttendanceTrend(trend);

    // Monthly trend - Fetch real data from Supabase
    const monthData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = format(d, 'yyyy-MM-01');
      const monthEnd = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      const { data: monthAttData } = await supabase
        .from('attendance')
        .select('id')
        .gte('date', monthStart)
        .lte('date', monthEnd);
      
      const { data: monthLeaveData } = await supabase
        .from('leave_requests')
        .select('id')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .eq('status', 'approved');
      
      monthData.push({
        month: format(d, 'MMM'),
        employees: employees.length,
        leaves: monthLeaveData?.length || 0,
      });
    }
    setMonthlyTrend(monthData);

    setStats({
      totalEmployees: employees.length,
      presentToday: (attRes.data || []).filter((a: any) => a.status === 'present' || a.status === 'late').length,
      onLeaveToday: 0,
      pendingApprovals: (leaveRes.data || []).length,
    });
    setPendingLeaves(pendRes.data as any || []);
    setUpcomingHolidays(holRes.data as Holiday[] || []);
    setRecentAudit(audRes.data as any || []);
    setAnnouncements(annRes.data as Announcement[] || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const req = pendingLeaves.find(r => r.id === id);
      if (!req || !user) return;

      const { error: reqError } = await supabase
        .from('leave_requests')
        .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (reqError) throw reqError;

      const { data: bal } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', req.user_id)
        .eq('leave_type_id', req.leave_type_id)
        .eq('year', new Date().getFullYear())
        .maybeSingle();

      if (bal) {
        await supabase.from('leave_balances').update({ used: bal.used + req.days }).eq('id', bal.id);
      }

      await supabase.from('notifications').insert({
        user_id: req.user_id,
        type: 'leave_approved',
        message: `Your ${req.leave_types?.name || 'leave'} request from ${format(parseISO(req.from_date), 'MMM d')} to ${format(parseISO(req.to_date), 'MMM d')} has been approved.`,
      });

      await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'approve_leave',
        target_type: 'leave_request',
        target_id: id,
        metadata: { days: req.days, type: req.leave_types?.name },
      });

      toast.success('Leave request approved.');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const req = pendingLeaves.find(r => r.id === id);
      if (!req || !user) return;

      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: req.user_id,
        type: 'leave_rejected',
        message: `Your ${req.leave_types?.name || 'leave'} request from ${format(parseISO(req.from_date), 'MMM d')} to ${format(parseISO(req.to_date), 'MMM d')} has been rejected.`,
      });

      await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'reject_leave',
        target_type: 'leave_request',
        target_id: id,
        metadata: { days: req.days, type: req.leave_types?.name },
      });

      toast.success('Leave request rejected.');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200/60" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200/60" />)}
        </div>
      </div>
    );
  }

  const attendanceRate = stats.totalEmployees > 0
    ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Premium Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 lg:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-20 right-32 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-3/4 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="rounded-full bg-indigo-500/20 p-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-300" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Admin Dashboard</span>
              <span className="h-1 w-1 rounded-full bg-indigo-400/40" />
              <span className="text-xs text-slate-400">{format(new Date(), 'EEEE, MMMM d')}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Admin'} <span className="text-indigo-300">👋</span>
            </h1>
            <p className="text-sm text-slate-400">Here's what's happening with your workforce today</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{attendanceRate}%</p>
                <p className="text-[11px] text-slate-400">Attendance</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.pendingApprovals}</p>
                <p className="text-[11px] text-slate-400">Pending</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.totalEmployees}</p>
                <p className="text-[11px] text-slate-400">Employees</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
              <Bell className="mr-2 h-4 w-4" />
              <span className="relative">
                Notifications
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">3</span>
              </span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Total Employees" 
          value={stats.totalEmployees} 
          icon={Users} 
          accent="blue" 
          trend="+12%"
          delay={0} 
        />
        <StatCard 
          label="Present Today" 
          value={stats.presentToday} 
          icon={UserCheck} 
          accent="green" 
          trend="+8%"
          delay={0.05} 
        />
        <StatCard 
          label="Pending Approvals" 
          value={stats.pendingApprovals} 
          icon={FileClock} 
          accent="amber" 
          trend={stats.pendingApprovals > 0 ? `${stats.pendingApprovals} req` : 'All clear'}
          delay={0.1} 
        />
        <StatCard 
          label="Upcoming Holidays" 
          value={upcomingHolidays.length} 
          icon={CalendarOff} 
          accent="teal" 
          trend={upcomingHolidays.length > 0 ? upcomingHolidays[0]?.name : 'None'}
          delay={0.15} 
        />
      </div>

      {/* Charts Row - Attendance Trend using BarChart + Department Distribution using PieChart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard 
            title="Attendance Trend" 
            description="Weekly attendance overview" 
            action={
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  {['Week', 'Month', 'Year'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p.toLowerCase() as any)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        selectedPeriod === p.toLowerCase() 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceTrend} barGap={8}>
                <defs>
                  <linearGradient id="presGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="lateGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#94a3b8' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 12, 
                    border: '1px solid #e2e8f0', 
                    fontSize: 12,
                    boxShadow: '0 8px 24px -6px rgba(0,0,0,0.08)',
                    padding: '8px 12px'
                  }} 
                />
                <Legend 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8 }}
                />
                <Bar dataKey="present" fill="url(#presGrad)" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="url(#lateGrad2)" radius={[4, 4, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="url(#absentGrad)" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <SectionCard 
          title="Department Distribution" 
          description="Headcount by team"
        >
          {deptDist.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
              <div className="text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2">No department data</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={deptDist} 
                  dataKey="count" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                >
                  {deptDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 10, 
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 4px 16px -4px rgba(0,0,0,0.06)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Middle Row: Leave Usage (PieChart) + Monthly Trend (LineChart) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard 
          title="Leave Usage" 
          description="Distribution by type"
        >
          {leaveUsage.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
              <div className="text-center">
                <Calendar className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2">No leave data yet</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={leaveUsage} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  innerRadius={60} 
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                >
                  {leaveUsage.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: 10, 
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    boxShadow: '0 4px 16px -4px rgba(0,0,0,0.06)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard 
          title="Monthly Overview" 
          description="Employees & leave trends"
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <defs>
                <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="leaveGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#94a3b8' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: 10, 
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  boxShadow: '0 4px 16px -4px rgba(0,0,0,0.06)'
                }} 
              />
              <Legend 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 8 }}
              />
              <Line 
                type="monotone" 
                dataKey="employees" 
                stroke="#0ea5e9" 
                strokeWidth={3} 
                dot={{ fill: '#0ea5e9', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
                name="Employees" 
              />
              <Line 
                type="monotone" 
                dataKey="leaves" 
                stroke="#f43f5e" 
                strokeWidth={3} 
                dot={{ fill: '#f43f5e', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: '#f43f5e', strokeWidth: 2 }}
                name="Leaves" 
              />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Approvals + Activity + Announcements */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard 
          title="Pending Approvals" 
          description="Leave requests awaiting action"
          action={
            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          }
        >
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {pendingLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <Check className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700">All caught up</p>
                <p className="text-xs text-slate-400">No pending requests to review</p>
              </div>
            ) : (
              <AnimatePresence>
                {pendingLeaves.map((lr, idx) => (
                  <motion.div
                    key={lr.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 px-3 py-3 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border-2 border-slate-100 group-hover:border-indigo-200 transition-colors">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-indigo-200 text-xs font-semibold text-indigo-700">
                          {getInitials(lr.profiles?.full_name || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{lr.profiles?.full_name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            {lr.leave_types?.name}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>{format(parseISO(lr.from_date), 'MMM d')}—{format(parseISO(lr.to_date), 'MMM d')}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-medium text-slate-700">{lr.days}d</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg" 
                        disabled={processing === lr.id} 
                        onClick={() => handleApprove(lr.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg" 
                        disabled={processing === lr.id} 
                        onClick={() => handleReject(lr.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </SectionCard>

        <SectionCard 
          title="Recent Activity" 
          description="Latest admin actions"
        >
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {recentAudit.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No recent activity</p>
              </div>
            ) : (
              recentAudit.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white/30 px-3 py-2.5 transition-all hover:border-slate-200 hover:bg-white"
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                    <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{log.profiles?.full_name || 'System'}</span>{' '}
                      <span className="text-slate-500">{log.action.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-slate-400">{format(parseISO(log.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                </motion.div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard 
          title="Announcements" 
          description="Company updates"
          action={
            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          }
        >
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No announcements</p>
              </div>
            ) : (
              announcements.map((ann, idx) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="group cursor-pointer rounded-xl border border-slate-100 bg-white/30 p-3.5 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-indigo-100 p-1.5 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                      <Bell className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{ann.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {(ann as any).content || (ann as any).message || 'No content available'}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">{format(parseISO(ann.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-indigo-400 flex-shrink-0" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Upcoming Holidays Row */}
      <SectionCard 
        title="Upcoming Holidays" 
        description="Company holidays & observances"
      >
        {upcomingHolidays.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500">
            <CalendarOff className="mr-2 h-5 w-5 text-slate-300" />
            No upcoming holidays
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {upcomingHolidays.map((h, idx) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.06 }}
                className="group rounded-xl border border-slate-100 bg-white/50 p-4 text-center transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm"
              >
                <div className="text-2xl font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                  {format(parseISO(h.date), 'd')}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {format(parseISO(h.date), 'MMM')}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-800">{h.name}</div>
                <div className="mt-0.5 text-[10px] text-slate-400 capitalize">{h.type}</div>
                {h.description && (
                  <div className="mt-1 text-[10px] text-slate-500 truncate">{h.description}</div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

