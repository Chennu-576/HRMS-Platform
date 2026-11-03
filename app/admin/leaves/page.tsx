// app/dashboard/admin/leaves/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { LeaveBadge } from '@/components/shared/badges';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Check, X, Clock, CheckCircle2, XCircle, Download, 
  Calendar, Users, TrendingUp, ArrowUpRight, Sparkles,
  Zap, Shield, Award, CalendarDays, Filter, ChevronDown,
  UserCheck, UserX, Clock as ClockIcon, BarChart3,
  AlertTriangle, ThumbsUp, ThumbsDown, Hourglass,
  Sun, Moon, Coffee, Brain, Target, Activity, 
  PieChart, GitBranch, Layers, Compass
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { LeaveRequest, LeaveType, Profile } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { getInitials } from '@/lib/helpers/attendance';
import { exportToCSV } from '@/lib/helpers/export';
import { motion, AnimatePresence } from 'framer-motion';

type LeaveWithDetails = LeaveRequest & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  leave_types: LeaveType;
};

// ==============================================
// 1. UNIQUE HERO WITH TIMELINE VISUALIZATION
// ==============================================
const HeroWithTimeline = ({ pending, approved, rejected, total }: any) => {
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"
    >
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15)_0%,_transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_bottom_left,_rgba(236,72,153,0.08)_0%,_transparent_70%)]" />
      </div>
      
      <div className="relative p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <Compass className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  Leave <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Orchestrator</span>
                </h1>
                <p className="text-white/50 text-sm mt-1">Intelligent leave management & approval workflow</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-white/70">Live: {pending} pending</span>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs text-white/70">{approvalRate}% approval rate</span>
              </div>
            </div>
          </div>
          
          {/* Approval Gauge */}
          <div className="flex items-center gap-6 bg-white/5 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/10">
            <div className="relative">
              <svg className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="url(#gauge)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(approvalRate / 100) * 201} 201`}
                  className="transition-all duration-1000"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gauge" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{approvalRate}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40 uppercase tracking-wider">Approval Rate</p>
              <p className="text-sm text-white/60">{approved} approved of {total}</p>
            </div>
          </div>
        </div>
        
        {/* Timeline Bar */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>Status Distribution</span>
            </div>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="flex h-full">
                <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${(pending / total) * 100}%` }} />
                <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${(approved / total) * 100}%` }} />
                <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${(rejected / total) * 100}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-white/60">{pending}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-white/60">{approved}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="text-white/60">{rejected}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==============================================
// 2. INSIGHT METRICS - UNIQUE METRICS
// ==============================================
const InsightMetric = ({ icon: Icon, label, value, subtitle, color, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.08 }}
    className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 hover:shadow-lg transition-all duration-300"
  >
    <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${color}`} />
    <div className="p-5">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="h-4 w-4 text-slate-300" />
        </div>
      </div>
    </div>
  </motion.div>
);

// ==============================================
// 3. LEAVE TYPE DISTRIBUTION - UNIQUE VISUAL
// ==============================================
const LeaveTypeDistribution = ({ requests }: { requests: LeaveWithDetails[] }) => {
  const typeCount = requests.reduce((acc: any, curr) => {
    const name = curr.leave_types?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  
  const colors = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa'];
  const entries = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);
  
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No leave data available
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {entries.map(([name, count], idx) => {
        const percentage = (count / requests.length) * 100;
        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group hover:bg-slate-50/50 rounded-lg p-2 transition-colors cursor-default"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span className="text-sm font-medium text-slate-700">{name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: idx * 0.05 }}
                className="h-full rounded-full transition-all"
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default function AdminLeavesPage() {
  const { user: admin } = useAuth();
  const [requests, setRequests] = useState<LeaveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // YOUR EXISTING LOGIC - UNTOUCHED
  const fetchRequests = async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select('*, profiles!leave_requests_user_id_fkey(id, full_name, email, avatar_url), leave_types(*)')
      .order('created_at', { ascending: false });
    if (data) setRequests(data as LeaveWithDetails[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setProcessing(id);
    try {
      const req = requests.find(r => r.id === id);
      if (!req || !admin) return;

      const { error } = await supabase
        .from('leave_requests')
        .update({ status: action, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      if (action === 'approved') {
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
      }

      await supabase.from('notifications').insert({
        user_id: req.user_id,
        type: `leave_${action}`,
        message: `Your ${req.leave_types?.name} request from ${format(parseISO(req.from_date), 'MMM d')} to ${format(parseISO(req.to_date), 'MMM d')} has been ${action}.`,
      });

      await supabase.from('audit_log').insert({
        actor_id: admin.id,
        action: `${action}_leave`,
        target_type: 'leave_request',
        target_id: id,
        metadata: { days: req.days, type: req.leave_types?.name },
      });

      toast.success(`Leave ${action}.`);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  // YOUR EXISTING COLUMNS - VISUALLY ENHANCED
  const columns: ColumnDef<LeaveWithDetails>[] = [
    {
      accessorKey: 'profiles.full_name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-9 w-9 border-2 border-slate-100 shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">
                {getInitials(row.original.profiles?.full_name || '?')}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
              row.original.status === 'pending' ? 'bg-amber-400' :
              row.original.status === 'approved' ? 'bg-emerald-400' :
              'bg-rose-400'
            }`} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.original.profiles?.full_name}</p>
            <p className="text-xs text-slate-400">{row.original.profiles?.email}</p>
          </div>
        </div>
      ),
    },
    { 
      accessorKey: 'leave_types.name', 
      header: 'Type', 
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
          <Calendar className="h-3 w-3" />
          {row.original.leave_types?.name || '-'}
        </span>
      )
    },
    { 
      accessorKey: 'from_date', 
      header: 'From', 
      cell: ({ row }) => (
        <span className="text-sm font-medium text-slate-700">
          {format(parseISO(row.original.from_date), 'MMM d, yyyy')}
        </span>
      )
    },
    { 
      accessorKey: 'to_date', 
      header: 'To', 
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">
          {format(parseISO(row.original.to_date), 'MMM d, yyyy')}
        </span>
      )
    },
    { 
      accessorKey: 'days', 
      header: 'Days', 
      cell: ({ row }) => (
        <span className="inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
          {row.original.days}
        </span>
      )
    },
    { 
      accessorKey: 'reason', 
      header: 'Reason', 
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[180px] text-sm text-slate-600">
          {row.original.reason}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      cell: ({ row }) => <LeaveBadge status={row.original.status} /> 
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        row.original.status === 'pending' ? (
          <div className="flex gap-1.5">
            <Button 
              size="icon" 
              className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 rounded-lg transition-all hover:scale-105" 
              disabled={processing === row.original.id} 
              onClick={() => handleAction(row.original.id, 'approved')}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="outline"
              className="h-8 w-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all hover:scale-105" 
              disabled={processing === row.original.id} 
              onClick={() => handleAction(row.original.id, 'rejected')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  // YOUR EXISTING LOGIC - UNTOUCHED
  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');

  const handleExport = () => {
    const data = activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected;
    exportToCSV(`leaves-${activeTab}.csv`,
      ['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status'],
      data.map(r => [r.profiles?.full_name, r.leave_types?.name, r.from_date, r.to_date, r.days, r.reason, r.status])
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200/60" />)}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-slate-200/60" />
      </div>
    );
  }

  const total = requests.length;
  const uniqueEmployees = new Set(requests.map(r => r.user_id)).size;
  const avgDays = total > 0 ? (requests.reduce((acc, r) => acc + r.days, 0) / total).toFixed(1) : '0';

  return (
    <div className="space-y-6 pb-8">
      {/* ===== HERO WITH TIMELINE ===== */}
      <HeroWithTimeline 
        pending={pending.length} 
        approved={approved.length} 
        rejected={rejected.length} 
        total={total}
      />

      {/* ===== UNIQUE INSIGHT METRICS ===== */}
      <div className="grid gap-4 sm:grid-cols-3">
        <InsightMetric
          icon={Users}
          label="Unique Applicants"
          value={uniqueEmployees}
          subtitle={`Out of ${total} total requests`}
          color="from-indigo-500 to-purple-500"
          delay={0}
        />
        <InsightMetric
          icon={Calendar}
          label="Average Duration"
          value={`${avgDays} days`}
          subtitle="Per leave request"
          color="from-emerald-500 to-teal-500"
          delay={1}
        />
        <InsightMetric
          icon={TrendingUp}
          label="Approval Velocity"
          value={`${total > 0 ? Math.round((approved.length / total) * 100) : 0}%`}
          subtitle="Requests approved"
          color="from-amber-500 to-orange-500"
          delay={2}
        />
      </div>

      {/* ===== LEAVE TYPE DISTRIBUTION ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-200">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Leave Type Distribution</h3>
                <p className="text-xs text-slate-500">Breakdown by type</p>
              </div>
            </div>
            <LeaveTypeDistribution requests={requests} />
          </div>
        </div>

        {/* ===== QUICK STATS ===== */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-6 h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-200">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Request Overview</h3>
                <p className="text-xs text-slate-500">Current status summary</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-600 uppercase tracking-wider font-medium">Pending</p>
                  <Hourglass className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-700">{pending.length}</p>
                <p className="text-[10px] text-amber-600">Awaiting review</p>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">Approved</p>
                  <ThumbsUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{approved.length}</p>
                <p className="text-[10px] text-emerald-600">Confirmed requests</p>
              </div>
              
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-rose-600 uppercase tracking-wider font-medium">Rejected</p>
                  <ThumbsDown className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-rose-700">{rejected.length}</p>
                <p className="text-[10px] text-rose-600">Declined requests</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TABLE SECTION ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200/60 bg-gradient-to-r from-indigo-50/20 via-white to-transparent">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Leave Requests</h3>
                <p className="text-xs text-slate-500">Review and manage all applications</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              className="border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="p-5 pt-4">
          {/* Premium Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-slate-100/50 border border-slate-200/60 mb-4">
            {[
              { id: 'pending', label: 'Pending', icon: Hourglass, count: pending.length },
              { id: 'approved', label: 'Approved', icon: ThumbsUp, count: approved.length },
              { id: 'rejected', label: 'Rejected', icon: ThumbsDown, count: rejected.length },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 flex-1 sm:flex-none justify-center ${
                    isActive 
                      ? 'bg-white shadow-sm border border-slate-200 text-slate-900' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-500' : ''}`} />
                  <span className="text-sm font-medium">{tab.label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* YOUR EXISTING DATATABLE - UNCHANGED */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <DataTable
                columns={columns}
                data={activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected}
                searchKey="profiles.full_name"
                searchPlaceholder="Search by employee name, email, or reason..."
                pageSize={10}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}


// 'use client';

// import { useEffect, useState } from 'react';
// import { useAuth } from '@/lib/auth-context';
// import { supabase } from '@/lib/supabase/client';
// import { PageHeader } from '@/components/shared/page-header';
// import { StatCard } from '@/components/shared/stat-card';
// import { DataTable } from '@/components/shared/data-table';
// import { LeaveBadge } from '@/components/shared/badges';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// import { Check, X, Clock, CheckCircle2, XCircle, Download } from 'lucide-react';
// import { format, parseISO } from 'date-fns';
// import { toast } from 'sonner';
// import type { LeaveRequest, LeaveType, Profile } from '@/lib/types';
// import type { ColumnDef } from '@tanstack/react-table';
// import { getInitials } from '@/lib/helpers/attendance';
// import { exportToCSV } from '@/lib/helpers/export';

// type LeaveWithDetails = LeaveRequest & {
//   profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>;
//   leave_types: LeaveType;
// };

// export default function AdminLeavesPage() {
//   const { user: admin } = useAuth();
//   const [requests, setRequests] = useState<LeaveWithDetails[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [processing, setProcessing] = useState<string | null>(null);
//   const [activeTab, setActiveTab] = useState('pending');

//   const fetchRequests = async () => {
//     const { data } = await supabase
//       .from('leave_requests')
//       .select('*, profiles!leave_requests_user_id_fkey(id, full_name, email, avatar_url), leave_types(*)')
//       .order('created_at', { ascending: false });
//     if (data) setRequests(data as LeaveWithDetails[]);
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchRequests();
//   }, []);

//   const handleAction = async (id: string, action: 'approved' | 'rejected') => {
//     setProcessing(id);
//     try {
//       const req = requests.find(r => r.id === id);
//       if (!req || !admin) return;

//       const { error } = await supabase
//         .from('leave_requests')
//         .update({ status: action, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
//         .eq('id', id);
//       if (error) throw error;

//       if (action === 'approved') {
//         const { data: bal } = await supabase
//           .from('leave_balances')
//           .select('*')
//           .eq('user_id', req.user_id)
//           .eq('leave_type_id', req.leave_type_id)
//           .eq('year', new Date().getFullYear())
//           .maybeSingle();
//         if (bal) {
//           await supabase.from('leave_balances').update({ used: bal.used + req.days }).eq('id', bal.id);
//         }
//       }

//       await supabase.from('notifications').insert({
//         user_id: req.user_id,
//         type: `leave_${action}`,
//         message: `Your ${req.leave_types?.name} request from ${format(parseISO(req.from_date), 'MMM d')} to ${format(parseISO(req.to_date), 'MMM d')} has been ${action}.`,
//       });

//       await supabase.from('audit_log').insert({
//         actor_id: admin.id,
//         action: `${action}_leave`,
//         target_type: 'leave_request',
//         target_id: id,
//         metadata: { days: req.days, type: req.leave_types?.name },
//       });

//       toast.success(`Leave ${action}.`);
//       fetchRequests();
//     } catch (err: any) {
//       toast.error(err.message || 'Failed');
//     } finally {
//       setProcessing(null);
//     }
//   };

//   const columns: ColumnDef<LeaveWithDetails>[] = [
//     {
//       accessorKey: 'profiles.full_name',
//       header: 'Employee',
//       cell: ({ row }) => (
//         <div className="flex items-center gap-3">
//           <Avatar className="h-8 w-8 border border-slate-200">
//             <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700">
//               {getInitials(row.original.profiles?.full_name || '?')}
//             </AvatarFallback>
//           </Avatar>
//           <div>
//             <p className="font-medium text-slate-900">{row.original.profiles?.full_name}</p>
//             <p className="text-xs text-slate-400">{row.original.profiles?.email}</p>
//           </div>
//         </div>
//       ),
//     },
//     { accessorKey: 'leave_types.name', header: 'Type', cell: ({ row }) => row.original.leave_types?.name || '-' },
//     { accessorKey: 'from_date', header: 'From', cell: ({ row }) => format(parseISO(row.original.from_date), 'MMM d, yyyy') },
//     { accessorKey: 'to_date', header: 'To', cell: ({ row }) => format(parseISO(row.original.to_date), 'MMM d, yyyy') },
//     { accessorKey: 'days', header: 'Days' },
//     { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => <span className="line-clamp-1 max-w-[200px]">{row.original.reason}</span> },
//     { accessorKey: 'status', header: 'Status', cell: ({ row }) => <LeaveBadge status={row.original.status} /> },
//     {
//       id: 'actions',
//       header: '',
//       cell: ({ row }) => (
//         row.original.status === 'pending' ? (
//           <div className="flex gap-1.5">
//             <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" disabled={processing === row.original.id} onClick={() => handleAction(row.original.id, 'approved')}>
//               <Check className="h-4 w-4" />
//             </Button>
//             <Button size="icon" variant="outline" className="h-8 w-8 text-rose-600 hover:bg-rose-50" disabled={processing === row.original.id} onClick={() => handleAction(row.original.id, 'rejected')}>
//               <X className="h-4 w-4" />
//             </Button>
//           </div>
//         ) : null
//       ),
//     },
//   ];

//   const pending = requests.filter(r => r.status === 'pending');
//   const approved = requests.filter(r => r.status === 'approved');
//   const rejected = requests.filter(r => r.status === 'rejected');

//   const handleExport = () => {
//     const data = activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected;
//     exportToCSV(`leaves-${activeTab}.csv`,
//       ['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status'],
//       data.map(r => [r.profiles?.full_name, r.leave_types?.name, r.from_date, r.to_date, r.days, r.reason, r.status])
//     );
//   };

//   if (loading) return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;

//   return (
//     <div className="space-y-6">
//       <PageHeader title="Leave Approvals" description="Review and manage employee leave requests"
//         action={<Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>} />

//       <div className="grid gap-4 sm:grid-cols-3">
//         <StatCard label="Pending" value={pending.length} icon={Clock} accent="amber" delay={0} />
//         <StatCard label="Approved" value={approved.length} icon={CheckCircle2} accent="green" delay={0.05} />
//         <StatCard label="Rejected" value={rejected.length} icon={XCircle} accent="rose" delay={0.1} />
//       </div>

//       <Tabs value={activeTab} onValueChange={setActiveTab}>
//         <TabsList>
//           <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
//           <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
//           <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
//         </TabsList>
//         <TabsContent value={activeTab} className="mt-4">
//           <DataTable
//             columns={columns}
//             data={activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected}
//             searchKey="profiles.full_name"
//             searchPlaceholder="Search by employee..."
//             pageSize={10}
//           />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
