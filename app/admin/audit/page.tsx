
// app/dashboard/admin/audit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Download, FileClock, Shield, Activity, Eye, 
  UserCheck, UserX, Calendar, Clock, AlertTriangle,
  CheckCircle, XCircle, Lock, Unlock, FileText,
  Users, Settings, Bell, Zap, TrendingUp, ArrowUpRight,
  Server, Database, Cpu, Globe, ShieldAlert, ShieldCheck,
  Fingerprint, Key, LogOut, LogIn, PenTool, Trash2,
  Plus, Edit, Archive, RefreshCw, Filter, ChevronDown
} from 'lucide-react';
import { format, parseISO, subDays, formatDistanceToNow } from 'date-fns';
import type { AuditLog, Profile } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { exportToCSV } from '@/lib/helpers/export';
import { motion, AnimatePresence } from 'framer-motion';

// ==============================================
// 1. SECURITY COMMAND CENTER HERO
// ==============================================
const SecurityCommandCenter = ({ logs, filtered }: { logs: any[], filtered: any[] }) => {
  const uniqueActors = new Set(logs.map(l => l.profiles?.full_name || 'System')).size;
  const uniqueActions = new Set(logs.map(l => l.action)).size;
  const todayLogs = logs.filter(l => 
    format(parseISO(l.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;
  const criticalActions = logs.filter(l => 
    ['delete_employee', 'delete_holiday', 'delete_department', 'reject_leave'].includes(l.action)
  ).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15)_0%,_transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-[radial-gradient(ellipse_at_bottom_left,_rgba(236,72,153,0.08)_0%,_transparent_70%)]" />
        
        {/* Animated Grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/20">
              <Shield className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 backdrop-blur-sm text-xs font-medium text-emerald-300 border border-emerald-400/20">
                  <Activity className="inline h-3 w-3 mr-1" />
                  Live Monitoring
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-400/20 backdrop-blur-sm text-xs font-medium text-indigo-300 border border-indigo-400/20">
                  {todayLogs} events today
                </span>
              </div>
              <h1 className="mt-2 text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Security <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Command Center</span>
              </h1>
              <p className="text-white/50 text-sm">Real-time audit trail & security monitoring</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
            <p className="text-lg font-bold text-white">{logs.length}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Total Events</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
            <p className="text-lg font-bold text-white">{uniqueActors}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Unique Actors</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-center">
            <p className="text-lg font-bold text-white">{uniqueActions}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Action Types</p>
          </div>
        </div>
      </div>
      
      {/* Security Status Bar */}
      <div className="relative mt-6 pt-4 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60">System Secure</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-white/60">{criticalActions} critical actions</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs text-white/60">Last 30 days</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ==============================================
// 2. ACTION DISTRIBUTION - UNIQUE VISUAL
// ==============================================
const ActionDistribution = ({ logs }: { logs: any[] }) => {
  const actionCounts = logs.reduce((acc: any, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});
  
 const sorted = (
  Object.entries(actionCounts) as [string, number][]
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6);
  
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
  
  const colors = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa'];
  
  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No activity data available
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {sorted.map(([action, count], idx) => {
        const percentage = (count / maxCount) * 100;
        const displayName = action.replace(/_/g, ' ');
        
        return (
          <motion.div
            key={action}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group hover:bg-slate-50/50 rounded-lg p-2 transition-colors cursor-default"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span className="text-sm font-medium text-slate-700 capitalize">{displayName}</span>
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

// ==============================================
// 3. RECENT ACTIVITY TIMELINE
// ==============================================
const ActivityTimeline = ({ logs }: { logs: any[] }) => {
  const recent = logs.slice(0, 8);
  
  const getIcon = (action: string) => {
    if (action.includes('create')) return Plus;
    if (action.includes('update') || action.includes('edit')) return PenTool;
    if (action.includes('delete') || action.includes('remove')) return Trash2;
    if (action.includes('approve')) return CheckCircle;
    if (action.includes('reject')) return XCircle;
    if (action.includes('login')) return LogIn;
    if (action.includes('logout')) return LogOut;
    if (action.includes('activate')) return UserCheck;
    if (action.includes('deactivate')) return UserX;
    return Activity;
  };
  
  const getColor = (action: string) => {
    if (action.includes('delete') || action.includes('reject')) return 'text-rose-500 bg-rose-50 border-rose-200';
    if (action.includes('create') || action.includes('approve')) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-500 bg-blue-50 border-blue-200';
    if (action.includes('activate')) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (action.includes('deactivate')) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-indigo-500 bg-indigo-50 border-indigo-200';
  };
  
  if (recent.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No recent activity
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className="space-y-4">
        {recent.map((log, idx) => {
          const Icon = getIcon(log.action);
          const color = getColor(log.action);
          const displayAction = log.action.replace(/_/g, ' ');
          
          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="relative pl-10"
            >
              <div className={`absolute left-2 top-2 h-4 w-4 rounded-full border-2 ${color}`}>
                <div className={`absolute inset-0.5 rounded-full ${color.replace('border-', 'bg-').replace('text-', 'bg-')}`} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/60 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      <span className="capitalize">{displayAction}</span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>by {log.profiles?.full_name || 'System'}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="hidden sm:block text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                    {JSON.stringify(log.metadata).slice(0, 30)}...
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ==============================================
// 4. MAIN COMPONENT
// ==============================================
export default function AdminAuditPage() {
  const [logs, setLogs] = useState<(AuditLog & { profiles: Pick<Profile, 'full_name'> | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');

  // YOUR EXISTING LOGIC - UNTOUCHED
  const fetchLogs = async () => {
    const days = parseInt(dateRange);
    const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
    let query = supabase
      .from('audit_log')
      .select('*, profiles!audit_log_actor_id_fkey(full_name)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);
    const { data } = await query;
    if (data) setLogs(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [dateRange]);

  const filtered = actionFilter === 'all' ? logs : logs.filter(l => l.action === actionFilter);

  const actionTypes = Array.from(new Set(logs.map(l => l.action)));

  // YOUR EXISTING COLUMNS - UNTOUCHED
  const columns: ColumnDef<AuditLog & { profiles: Pick<Profile, 'full_name'> | null }>[] = [
    {
      accessorKey: 'profiles.full_name',
      header: 'Actor',
      cell: ({ row }) => row.original.profiles?.full_name || 'System',
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => <span className="font-mono text-xs text-slate-600">{row.original.action.replace(/_/g, ' ')}</span>,
    },
    { accessorKey: 'target_type', header: 'Target Type', cell: ({ row }) => row.original.target_type || '-' },
    {
      accessorKey: 'created_at',
      header: 'Timestamp',
      cell: ({ row }) => format(parseISO(row.original.created_at), 'MMM d, yyyy · h:mm a'),
    },
    {
      accessorKey: 'metadata',
      header: 'Details',
      cell: ({ row }) => {
        const meta = row.original.metadata;
        if (!meta || Object.keys(meta).length === 0) return '-';
        return <span className="text-xs text-slate-500">{JSON.stringify(meta).slice(0, 80)}</span>;
      },
    },
  ];

  // YOUR EXISTING EXPORT - UNTOUCHED
  const handleExport = () => {
    exportToCSV('audit-log.csv',
      ['Actor', 'Action', 'Target Type', 'Target ID', 'Timestamp', 'Details'],
      filtered.map(l => [l.profiles?.full_name || 'System', l.action, l.target_type, l.target_id, l.created_at, JSON.stringify(l.metadata)])
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl bg-slate-200/60" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-200/60 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* ===== SECURITY COMMAND CENTER ===== */}
      <SecurityCommandCenter logs={logs} filtered={filtered} />

      {/* ===== INSIGHTS GRID ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Action Distribution */}
        <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Action Distribution</h3>
              <p className="text-xs text-slate-400">Most frequent activities</p>
            </div>
          </div>
          <ActionDistribution logs={logs} />
        </div>
        
        {/* Recent Activity Timeline */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                <p className="text-xs text-slate-400">Latest system events</p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{logs.length} total events</span>
          </div>
          <ActivityTimeline logs={logs} />
        </div>
      </div>

      {/* ===== FULL LOG TABLE ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200/60 bg-gradient-to-r from-indigo-50/20 via-white to-transparent">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
                <FileClock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Full Audit Log</h3>
                <p className="text-xs text-slate-400">Complete system activity history</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                className="border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-indigo-600"
                onClick={() => fetchLogs()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5 pt-2">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-600">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48 h-8 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-white/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-600">Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-36 h-8 rounded-lg border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-white/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              onClick={() => {
                setActionFilter('all');
                setDateRange('30');
              }}
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Reset
            </Button>
            
            <div className="ml-auto text-xs text-slate-400">
              {filtered.length} entries shown
            </div>
          </div>

          {/* YOUR EXISTING DATATABLE - UNCHANGED */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-slate-100 mb-4">
                <FileClock className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">No audit entries found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={filtered} 
              searchKey="action" 
              searchPlaceholder="Search actions, actors, or targets..." 
              pageSize={15} 
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
