// app/dashboard/admin/employees/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DataTable } from '@/components/shared/data-table';
import { EmployeeStatusBadge, RoleBadge } from '@/components/shared/badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { 
  Users, UserPlus, Download, Trash2, Edit, Eye, UserCheck, UserX,
  Building2, Briefcase, Mail, Phone, UserCog, CalendarDays,
  TrendingUp, Award, Clock, Shield, ChevronRight, Search,
  Filter, MoreHorizontal, Activity, Zap, Sparkles, Globe,
  Layers, PieChart, BarChart3, ArrowUpRight, ArrowDownRight,
  CircleDot, BadgeCheck, Clock as ClockIcon, Calendar,
  GraduationCap, MapPin, Link as LinkIcon, UserRound, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeCreateSchema, type EmployeeCreateValues } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import type { Profile, Department, Attendance, LeaveRequest } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { getInitials } from '@/lib/helpers/attendance';
import { exportToCSV } from '@/lib/helpers/export';
import { motion, AnimatePresence } from 'framer-motion';

// Premium Card Component - Redesigned
const PremiumStatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel, 
  gradient,
  iconBg,
  textColor,
  borderColor
}: any) => {
  const isPositive = trend?.startsWith('+');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
      style={{ 
        background: `linear-gradient(145deg, ${gradient[0]}, ${gradient[1]})`,
        borderColor: borderColor || 'transparent'
      }}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/5 blur-2xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/5 blur-2xl animate-pulse delay-1000" />
      </div>
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-white/80">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white tracking-tight">
              {value}
            </p>
            {trend && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                  isPositive 
                    ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-400/20' 
                    : 'bg-rose-400/30 text-rose-100 border border-rose-400/20'
                }`}>
                  {isPositive ? (
                    <TrendingUpIcon className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {trend}
                </span>
                {trendLabel && (
                  <span className="text-xs text-white/60">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          
          {/* Icon Container with Glow Effect */}
          <div className="relative">
            <div className={`absolute inset-0 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity ${iconBg}`} />
            <div className={`relative rounded-2xl p-3 backdrop-blur-sm ${iconBg} border border-white/20 shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        {/* Progress Bar (Optional) */}
        {trend && (
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div 
              className="h-full rounded-full bg-white/40 transition-all duration-1000 group-hover:bg-white/60"
              style={{ width: `${Math.min(Math.abs(parseInt(trend) || 0), 100)}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Department Card Component
const DepartmentCard = ({ department, count, total, delay }: any) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colors = [
    'from-violet-500 to-purple-500',
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-blue-500',
    'from-indigo-500 to-violet-500',
    'from-teal-500 to-emerald-500',
  ];
  const colorIndex = department.id?.charAt(0)?.charCodeAt(0) % colors.length || 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      className="group relative overflow-hidden rounded-xl bg-white p-4 text-center border-2 border-slate-100 hover:border-transparent transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      {/* Gradient Background on Hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[colorIndex]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      <div className="relative">
        <div className="text-2xl font-bold text-slate-800 group-hover:text-white transition-colors duration-300">
          {count}
        </div>
        <div className="mt-0.5 text-xs font-medium text-slate-600 group-hover:text-white/90 transition-colors duration-300 truncate px-1">
          {department.name}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 group-hover:bg-white/30 transition-colors">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${colors[colorIndex]} transition-all duration-700 group-hover:bg-white/50`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-slate-400 group-hover:text-white/60 transition-colors duration-300">
          {percentage.toFixed(0)}% of total
        </div>
      </div>
    </motion.div>
  );
};

export default function AdminEmployeesPage() {
  const { user: admin } = useAuth();
  const [employees, setEmployees] = useState<(Profile & { departments: Department | null })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<
  (Profile & { departments: Department | null }) | null>(null);
  const [viewAttendance, setViewAttendance] = useState<Attendance[]>([]);
  const [viewLeaves, setViewLeaves] = useState<LeaveRequest[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeCreateValues>({
    resolver: zodResolver(employeeCreateSchema),
  });

  const selectedDept = watch('department_id');
  const selectedRole = watch('role');

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, departments(*)')
      .order('created_at', { ascending: false });
    if (data) setEmployees(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      if (data) setDepartments(data as Department[]);
    });
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    reset({ full_name: '', email: '', phone: '', department_id: undefined, job_title: '', role: 'employee', employee_code: '' });
    setDialogOpen(true);
  };

  const openEdit = (emp: Profile) => {
    setEditTarget(emp);
    reset({
      full_name: emp.full_name,
      email: emp.email,
      phone: emp.phone,
      department_id: emp.department_id || undefined,
      job_title: emp.job_title,
      role: emp.role as 'admin' | 'employee',
      employee_code: emp.employee_code,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: EmployeeCreateValues) => {
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: values.full_name,
            phone: values.phone || '',
            department_id: values.department_id || null,
            job_title: values.job_title || '',
            role: values.role,
            employee_code: values.employee_code || null,
          })
          .eq('id', editTarget.id);
        if (error) throw error;

        if (admin) {
          await supabase.from('audit_log').insert({
            actor_id: admin.id,
            action: 'update_employee',
            target_type: 'profile',
            target_id: editTarget.id,
            metadata: { name: values.full_name },
          });
        }
        toast.success('Employee updated.');
      } else {
        const res = await fetch('/api/admin/create-employee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create employee');
        }
        if (admin) {
          await supabase.from('audit_log').insert({
            actor_id: admin.id,
            action: 'create_employee',
            target_type: 'profile',
            target_id: '',
            metadata: { name: values.full_name, email: values.email },
          });
        }
        toast.success('Employee created. They can now sign in with a default password.');
      }
      setDialogOpen(false);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !admin) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteTarget);
      if (error) throw error;
      await supabase.from('audit_log').insert({
        actor_id: admin.id,
        action: 'delete_employee',
        target_type: 'profile',
        target_id: deleteTarget,
      });
      toast.success('Employee deleted.');
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleStatus = async (emp: Profile) => {
    if (!admin) return;
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', emp.id);
    await supabase.from('audit_log').insert({
      actor_id: admin.id,
      action: `${newStatus}_employee`,
      target_type: 'profile',
      target_id: emp.id,
    });
    toast.success(`Employee marked as ${newStatus}.`);
    fetchEmployees();
  };

  const viewDetails = async (
  emp: Profile & { departments: Department | null }
) => {
  setViewTarget(emp);
    const [attRes, leaveRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', emp.id).order('date', { ascending: false }).limit(10),
      supabase.from('leave_requests').select('*, leave_types(name)').eq('user_id', emp.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setViewAttendance(attRes.data as Attendance[] || []);
    setViewLeaves(leaveRes.data as any || []);
  };

  const handleExport = () => {
    exportToCSV('employees.csv',
      ['Name', 'Email', 'Phone', 'Department', 'Job Title', 'Role', 'Status', 'Joined'],
      employees.map(e => [e.full_name, e.email, e.phone, e.departments?.name || 'N/A', e.job_title, e.role, e.status, e.joined_at])
    );
  };

  const columns: ColumnDef<Profile & { departments: Department | null }>[] = [
    {
      accessorKey: 'full_name',
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-indigo-100 shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-bold text-white">
                {getInitials(row.original.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
              row.original.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'
            }`} />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.original.full_name}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Mail className="h-3 w-3" />
              <span>{row.original.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'departments.name',
      header: 'Department',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-violet-100 to-violet-200 p-1.5">
            <Building2 className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <span className="text-sm font-medium text-slate-700">
            {row.original.departments?.name || <span className="text-slate-400">Unassigned</span>}
          </span>
        </div>
      ),
    },
    { 
      accessorKey: 'job_title', 
      header: 'Job Title', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-slate-700">{row.original.job_title || '-'}</span>
        </div>
      )
    },
    { 
      accessorKey: 'role', 
      header: 'Role', 
      cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          row.original.role === 'admin' 
            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-200' 
            : 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm shadow-blue-200'
        }`}>
          <Shield className="h-3 w-3" />
          {row.original.role}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          row.original.status === 'active' 
            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-sm shadow-emerald-200' 
            : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm shadow-slate-200'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            row.original.status === 'active' ? 'bg-white animate-pulse' : 'bg-white/70'
          }`} />
          {row.original.status}
        </span>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
            onClick={() => viewDetails(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
            onClick={() => openEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
            onClick={() => setDeleteTarget(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = employees.filter(e => e.status === 'active').length;
  const adminCount = employees.filter(e => e.role === 'admin').length;
  const newThisMonth = employees.filter(e => {
    const joined = new Date(e.joined_at || '');
    const now = new Date();
    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200/60" />)}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-slate-200/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* PREMIUM HERO BANNER */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 lg:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-3/4 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm border border-white/20">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">People Operations</span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span className="text-xs text-white/70">{employees.length} team members</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white lg:text-3xl">
                Employee Directory
              </h1>
              <p className="text-sm text-white/80">Complete workforce management and team insights</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-xs text-white/90">{activeCount} active</span>
              </div>
              <div className="h-5 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-xs text-white/90">{adminCount} admins</span>
              </div>
              <div className="h-5 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-white/80" />
                <span className="text-xs text-white/90">+{newThisMonth} new</span>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-white text-indigo-700 hover:bg-slate-100 shadow-lg shadow-black/20 font-semibold"
              onClick={openAdd}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </div>
        </div>
      </motion.div>

      {/* REDESIGNED PREMIUM STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <PremiumStatCard
          label="Total Employees"
          value={employees.length}
          icon={Users}
          trend="+12%"
          trendLabel="this month"
          gradient={['#4f46e5', '#6366f1']}
          iconBg="bg-indigo-400/20"
          borderColor="border-indigo-300/30"
        />
        
        <PremiumStatCard
          label="Active Members"
          value={activeCount}
          icon={UserCheck}
          trend={`${((activeCount / employees.length) * 100).toFixed(0)}%`}
          trendLabel="of total"
          gradient={['#10b981', '#34d399']}
          iconBg="bg-emerald-400/20"
          borderColor="border-emerald-300/30"
        />
        
        <PremiumStatCard
          label="Administrators"
          value={adminCount}
          icon={Shield}
          trend="+2"
          trendLabel="this quarter"
          gradient={['#f59e0b', '#fbbf24']}
          iconBg="bg-amber-400/20"
          borderColor="border-amber-300/30"
        />
      </div>

      {/* REDESIGNED DEPARTMENT DISTRIBUTION CARDS */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 p-2 text-white shadow-lg shadow-violet-200">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Department Distribution</h3>
              <p className="text-xs text-slate-500">Team headcount across the organization</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
            View all <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {departments.slice(0, 6).map((dept, idx) => {
            const count = employees.filter(e => e.department_id === dept.id).length;
            return (
              <DepartmentCard
                key={dept.id}
                department={dept}
                count={count}
                total={employees.length}
                delay={idx}
              />
            );
          })}
        </div>
      </motion.div>

      {/* MAIN TABLE SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200/60 bg-gradient-to-r from-indigo-50/50 via-white to-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 p-2.5 text-white shadow-lg shadow-indigo-200">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Employee Directory</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{employees.length} total</span>
                  <span className="h-3 w-px bg-slate-300" />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {activeCount} active
                  </span>
                  <span className="h-3 w-px bg-slate-300" />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {employees.length - activeCount} inactive
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport} 
                className="h-9 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              >
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200"
                onClick={openAdd}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5 pt-2">
          <DataTable 
            columns={columns} 
            data={employees} 
            searchKey="full_name" 
            searchPlaceholder="Search employees by name, email, or department..." 
            pageSize={10} 
          />
        </div>
      </motion.div>

      {/* ===== ALL YOUR EXISTING DIALOGS AND SHEETS ===== */}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
            <div className="p-6 pt-7">
              <DialogHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${
                    editTarget ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {editTarget ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold text-slate-900">
                      {editTarget ? 'Edit Employee Profile' : 'Add New Employee'}
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {editTarget ? 'Update employee information' : 'Create a new team member account'}
                    </p>
                  </div>
                </div>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Full Name <span className="text-rose-500">*</span></Label>
                    <Input 
                      {...register('full_name')} 
                      placeholder="John Doe"
                      className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-slate-50/50 focus:bg-white"
                    />
                    {errors.full_name && <p className="text-xs text-rose-500">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Email <span className="text-rose-500">*</span></Label>
                    <Input 
                      type="email" 
                      {...register('email')} 
                      placeholder="john@company.com"
                      disabled={!!editTarget}
                      className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-slate-50/50 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Phone</Label>
                    <Input 
                      {...register('phone')} 
                      placeholder="+1 234 567 890"
                      className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Employee Code</Label>
                    <Input 
                      {...register('employee_code')} 
                      placeholder="EMP-001"
                      className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Department</Label>
                    <Select 
                      value={selectedDept ?? undefined} 
                      onValueChange={(v) => setValue('department_id', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-slate-50/50 focus:bg-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Job Title</Label>
                    <Input 
                      {...register('job_title')} 
                      placeholder="Senior Developer"
                      className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Role <span className="text-rose-500">*</span></Label>
                  <Select 
                    value={selectedRole} 
                    onValueChange={(v) => setValue('role', v as 'admin' | 'employee', { shouldValidate: true })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 transition-all bg-slate-50/50 focus:bg-white">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">👤 Employee</SelectItem>
                      <SelectItem value="admin">🛡️ Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!editTarget && (
                  <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-4 py-3.5">
                    <div className="flex items-start gap-2.5">
                      <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        A default password (<span className="font-mono font-semibold bg-white/80 px-1.5 py-0.5 rounded">TempPass123</span>) will be set. 
                        The employee can change it after first login.
                      </p>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {editTarget ? 'Updating...' : 'Creating...'}
                      </div>
                    ) : (
                      editTarget ? 'Update Employee' : 'Create Employee'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
          {viewTarget && (
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600" />
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
              
              <div className="relative pt-10 px-6 pb-6">
                <SheetHeader className="text-center">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-500 text-3xl font-bold text-white">
                          {getInitials(viewTarget.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white shadow-sm ${
                        viewTarget.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                      }`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <SheetTitle className="text-2xl font-bold text-white">{viewTarget.full_name}</SheetTitle>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Mail className="h-3.5 w-3.5 text-white/70" />
                      <p className="text-sm text-white/90">{viewTarget.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      viewTarget.role === 'admin' 
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-200' 
                        : 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-sm shadow-blue-200'
                    }`}>
                      <Shield className="h-3 w-3" />
                      {viewTarget.role}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      viewTarget.status === 'active' 
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-sm shadow-emerald-200' 
                        : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm shadow-slate-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        viewTarget.status === 'active' ? 'bg-white animate-pulse' : 'bg-white/70'
                      }`} />
                      {viewTarget.status}
                    </span>
                  </div>
                </SheetHeader>
              </div>

              <div className="px-6 pb-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Phone</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">{viewTarget.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Job Title</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">{viewTarget.job_title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Employee Code</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">{viewTarget.employee_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-700">
                      {viewTarget.joined_at ? format(parseISO(viewTarget.joined_at), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>

                {viewTarget.departments && (
                  <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 px-4 py-2.5">
                    <Building2 className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-medium text-slate-700">{viewTarget.departments.name}</span>
                    <span className="ml-auto text-xs text-violet-600 font-medium">Department</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900">Recent Attendance</h4>
                    <ClockIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  {viewAttendance.length === 0 ? (
                    <div className="flex items-center justify-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-500">No attendance records</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {viewAttendance.map(a => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm border border-slate-100">
                          <span className="text-slate-600">{format(parseISO(a.date), 'MMM d, yyyy')}</span>
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${
                            a.status === 'present' ? 'text-emerald-600' :
                            a.status === 'late' ? 'text-amber-600' :
                            'text-rose-600'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              a.status === 'present' ? 'bg-emerald-500' :
                              a.status === 'late' ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`} />
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900">Recent Leaves</h4>
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  {viewLeaves.length === 0 ? (
                    <div className="flex items-center justify-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-500">No leave records</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {viewLeaves.map((l: any) => (
                        <div key={l.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm border border-slate-100">
                          <span className="text-slate-600">{l.leave_types?.name}</span>
                          <span className={`inline-flex items-center gap-1.5 font-semibold ${
                            l.status === 'approved' ? 'text-emerald-600' :
                            l.status === 'pending' ? 'text-amber-600' :
                            'text-rose-600'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              l.status === 'approved' ? 'bg-emerald-500' :
                              l.status === 'pending' ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`} />
                            {l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                    onClick={() => { openEdit(viewTarget); setViewTarget(null); }}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                  <Button 
                    variant={viewTarget.status === 'active' ? 'destructive' : 'default'}
                    size="sm" 
                    className={`flex-1 rounded-xl ${
                      viewTarget.status === 'active' 
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' 
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                    onClick={() => toggleStatus(viewTarget)}
                  >
                    {viewTarget.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this employee?"
        description="This will permanently remove the employee and all their data. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
