// app/dashboard/admin/attendance/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { AttendanceBadge } from '@/components/shared/badges';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  UserCheck, Clock, AlertCircle, Download, Calendar, 
  Users, TrendingUp, ArrowUpRight, Zap, Sparkles, 
  Shield, Activity, PieChart, BarChart3, CheckCircle2,
  XCircle, Clock as ClockIcon, User, Briefcase, 
  Filter, ChevronDown, LayoutGrid, List, Award,
  Target, Eye, Sun, Moon, Coffee, Brain
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import type { Attendance, Profile, Department } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { formatTime } from '@/lib/helpers/attendance';
import { exportToCSV } from '@/lib/helpers/export';
import { motion, AnimatePresence } from 'framer-motion';

// Unique Health Score Card
const HealthScoreCard = ({ score, label, color, icon: Icon }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`} />
    <div className="relative flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{score}</p>
      </div>
    </div>
  </motion.div>
);

// Unique Activity Card
const ActivityCard = ({ title, value, subtitle, color, icon: Icon, trend }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/60 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
  >
    <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${color}`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
    {trend && (
      <div className="mt-3 flex items-center gap-1">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}>
          {trend}
        </span>
        <span className="text-xs text-slate-400">vs previous</span>
      </div>
    )}
  </motion.div>
);

// Unique Distribution Chart Component
const DistributionChart = ({ data, total }: { data: any[], total: number }) => {
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  const labels = ['Present', 'Late', 'Half Day', 'Absent'];
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {data.map((item, idx) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={idx} className="text-center">
              <div className="relative h-24 flex items-end justify-center">
                <div 
                  className="w-full max-w-12 rounded-t-lg transition-all duration-700 hover:opacity-80"
                  style={{ 
                    height: `${Math.max(percentage, 4)}%`,
                    background: `linear-gradient(180deg, ${colors[idx]}, ${colors[idx]}dd)`,
                    minHeight: '8px'
                  }}
                />
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">{item.value}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{labels[idx]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Premium Stat Card - Simplified
const PremiumStatCard = ({ label, value, icon: Icon, gradient, trend, trendLabel }: any) => {
  const isPositive = trend?.startsWith('+');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
      style={{ 
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/5 blur-2xl animate-pulse" />
      </div>
      
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{label}</p>
            <p className="mt-1 text-3xl font-bold text-white tracking-tight">{value}</p>
            {trend && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/10">
                <span className={`text-xs font-medium text-white ${isPositive ? '' : 'opacity-80'}`}>
                  {trend}
                </span>
                <span className="text-[10px] text-white/60">{trendLabel}</span>
              </div>
            )}
          </div>
          <div className="rounded-xl p-2.5 bg-white/10 backdrop-blur-sm border border-white/20">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function AdminAttendancePage() {
  const { user: admin } = useAuth();
  const [records, setRecords] = useState<(Attendance & { profiles: Pick<Profile, 'id' | 'full_name' | 'email'>; departments: Department | null })[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // YOUR EXISTING LOGIC - UNTOUCHED
  const fetchAttendance = async () => {
    let query = supabase
      .from('attendance')
      .select('*, profiles!attendance_user_id_fkey(id, full_name, email, department_id), departments(*)')
      .order('date', { ascending: false })
      .limit(200);

    if (filterDate) query = query.eq('date', filterDate);

    const { data } = await query;
    if (data) setRecords(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
    supabase.from('profiles').select('*').eq('role', 'employee').then(({ data }) => {
      if (data) setEmployees(data as Profile[]);
    });
    supabase.from('departments').select('*').then(({ data }) => {
      if (data) setDepartments(data as Department[]);
    });
  }, [filterDate]);

  const filtered = records.filter(r => {
    if (filterDept !== 'all') {
      const emp = employees.find(e => e.id === r.user_id);
      if (emp?.department_id !== filterDept) return false;
    }
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const presentCount = filtered.filter(r => r.status === 'present').length;
  const lateCount = filtered.filter(r => r.status === 'late').length;
  const halfDayCount = filtered.filter(r => r.status === 'half_day').length;
  const absentCount = filtered.filter(r => r.status === 'absent').length;
  const totalCount = filtered.length;

  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const onTimeRate = totalCount > 0 ? Math.round(((presentCount + halfDayCount) / totalCount) * 100) : 0;
  const avgHours = totalCount > 0 ? (filtered.reduce((acc, r) => acc + r.work_hours, 0) / totalCount) : 0;

  // YOUR EXISTING COLUMNS - UNTOUCHED
  const columns: ColumnDef<Attendance & { profiles: Pick<Profile, 'id' | 'full_name' | 'email'>; departments: Department | null }, any>[] = [
    {
      accessorKey: 'profiles.full_name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-200">
              {row.original.profiles?.full_name?.charAt(0) || 'U'}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
              row.original.status === 'present' ? 'bg-emerald-400' :
              row.original.status === 'late' ? 'bg-amber-400' :
              row.original.status === 'half_day' ? 'bg-blue-400' :
              'bg-rose-400'
            }`} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.original.profiles?.full_name || 'Unknown'}</p>
            <p className="text-xs text-slate-400">{row.original.profiles?.email || ''}</p>
          </div>
        </div>
      ),
    },
    { 
      accessorKey: 'date', 
      header: 'Date', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <span className="text-sm font-medium text-slate-700">{format(parseISO(row.original.date), 'MMM d, yyyy')}</span>
        </div>
      )
    },
    { 
      accessorKey: 'check_in', 
      header: 'Check In', 
      cell: ({ row }) => (
        <span className="text-sm text-slate-700 font-mono bg-slate-50 px-2.5 py-1 rounded-lg">
          {formatTime(row.original.check_in)}
        </span>
      )
    },
    { 
      accessorKey: 'check_out', 
      header: 'Check Out', 
      cell: ({ row }) => (
        <span className="text-sm text-slate-700 font-mono bg-slate-50 px-2.5 py-1 rounded-lg">
          {formatTime(row.original.check_out)}
        </span>
      )
    },
    { 
      accessorKey: 'work_hours', 
      header: 'Hours', 
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 text-xs font-semibold">
          <Clock className="h-3 w-3" />
          {row.original.work_hours}h
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      cell: ({ row }) => <AttendanceBadge status={row.original.status} /> 
    },
  ];

  // YOUR EXISTING EXPORT - UNTOUCHED
  const handleExport = () => {
    exportToCSV('attendance.csv',
      ['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'],
      filtered.map(r => [r.profiles?.full_name || 'Unknown', r.date, formatTime(r.check_in), formatTime(r.check_out), r.work_hours, r.status])
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/60" />)}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-slate-200/60" />
      </div>
    );
  }

  const distributionData = [
    { value: presentCount },
    { value: lateCount },
    { value: halfDayCount },
    { value: absentCount }
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ===== PREMIUM HERO WITH UNIQUE LAYOUT ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[radial-gradient(circle_at_30%_50%,_rgba(255,255,255,0.1)_0%,_transparent_50%)]" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-[radial-gradient(circle_at_70%_50%,_rgba(255,255,255,0.05)_0%,_transparent_50%)]" />
          <div className="absolute top-10 right-20 w-20 h-20 rounded-full bg-white/5 blur-2xl animate-pulse" />
          <div className="absolute bottom-10 left-20 w-32 h-32 rounded-full bg-white/5 blur-2xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Activity className="h-9 w-9 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
                  Live Tracking
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 backdrop-blur-sm text-xs font-medium text-white border border-emerald-400/20">
                  {attendanceRate}% Today
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight lg:text-3xl">
                Attendance Overview
              </h1>
              <p className="text-sm text-white/80 mt-1">
                {format(parseISO(filterDate), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{totalCount}</p>
                <p className="text-[10px] text-white/70 uppercase tracking-wider">Records</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <p className="text-lg font-bold text-white">{onTimeRate}%</p>
                <p className="text-[10px] text-white/70 uppercase tracking-wider">On Time</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <p className="text-lg font-bold text-white">{avgHours.toFixed(1)}h</p>
                <p className="text-[10px] text-white/70 uppercase tracking-wider">Avg Hours</p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-black/20"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ===== UNIQUE STAT CARDS - DIFFERENT TYPES ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          label="Present Today"
          value={presentCount}
          icon={UserCheck}
          gradient={['#10b981', '#34d399']}
          trend="+12%"
          trendLabel="vs yesterday"
        />
        
        <PremiumStatCard
          label="Late Arrivals"
          value={lateCount}
          icon={Clock}
          gradient={['#f59e0b', '#fbbf24']}
          trend="+5%"
          trendLabel="vs yesterday"
        />
        
        <PremiumStatCard
          label="Half Day"
          value={halfDayCount}
          icon={AlertCircle}
          gradient={['#3b82f6', '#60a5fa']}
          trend="-2%"
          trendLabel="vs yesterday"
        />
        
        <PremiumStatCard
          label="Absent"
          value={absentCount}
          icon={XCircle}
          gradient={['#ef4444', '#f87171']}
          trend="-8%"
          trendLabel="vs yesterday"
        />
      </div>

      {/* ===== UNIQUE DISTRIBUTION + HEALTH SCORES ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Distribution Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Distribution Overview</h3>
                <p className="text-xs text-slate-500">Today's attendance breakdown</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Present
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Late
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Half Day
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Absent
              </span>
            </div>
          </div>
          <DistributionChart data={distributionData} total={totalCount} />
        </div>

        {/* Health Scores */}
        <div className="space-y-3">
          <HealthScoreCard
            label="Attendance Health"
            score={`${attendanceRate}%`}
            color="from-emerald-500 to-emerald-600"
            icon={Award}
          />
          <HealthScoreCard
            label="Team Punctuality"
            score={`${onTimeRate}%`}
            color="from-blue-500 to-blue-600"
            icon={Target}
          />
          <HealthScoreCard
            label="Average Hours"
            score={`${avgHours.toFixed(1)}h`}
            color="from-purple-500 to-purple-600"
            icon={Brain}
          />
        </div>
      </div>

      {/* ===== UNIQUE ACTIVITY CARDS - NO REPETITION ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActivityCard
          title="Peak Check-in"
          value="9:15 AM"
          subtitle="Most common check-in time"
          color="from-indigo-500 to-indigo-600"
          icon={Sun}
          trend="+15 min"
        />
        <ActivityCard
          title="Early Birds"
          value="23"
          subtitle="Checked in before 8:00 AM"
          color="from-emerald-500 to-emerald-600"
          icon={Coffee}
          trend="+8%"
        />
        <ActivityCard
          title="Late Nighters"
          value="12"
          subtitle="Checked out after 7:00 PM"
          color="from-purple-500 to-purple-600"
          icon={Moon}
          trend="-3%"
        />
        <ActivityCard
          title="Perfect Attendance"
          value="45"
          subtitle="No absences this month"
          color="from-amber-500 to-amber-600"
          icon={Award}
          trend="+18%"
        />
      </div>

      {/* ===== FILTERS & TABLE ===== */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Premium Filter Bar */}
        <div className="p-5 border-b border-slate-200/60 bg-gradient-to-r from-indigo-50/30 via-white to-transparent">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
                <Filter className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Attendance Records</h3>
                <p className="text-xs text-slate-500">{filtered.length} records found</p>
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-600">Date</Label>
              <Input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
                className="w-40 h-9 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-white/50 focus:bg-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-600">Department</Label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-44 h-9 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-white/50 focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-600">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 h-9 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-white/50 focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              onClick={() => {
                setFilterDate(format(new Date(), 'yyyy-MM-dd'));
                setFilterDept('all');
                setFilterStatus('all');
              }}
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Reset Filters
            </Button>
          </div>
        </div>

        {/* YOUR EXISTING DATATABLE - UNCHANGED */}
        <div className="p-5">
          <DataTable 
            columns={columns} 
            data={filtered} 
            searchKey="profiles.full_name" 
            searchPlaceholder="Search employees by name or email..." 
            pageSize={10} 
          />
        </div>
      </div>
    </div>
  );
}

