'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { StatCard } from '@/components/shared/stat-card';
import { LeaveBadge } from '@/components/shared/badges';
import { DataTable } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CalendarPlus, CalendarCheck, Clock, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaveRequestSchema, type LeaveRequestValues } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import type { LeaveRequest, LeaveBalance, LeaveType, Holiday } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { calculateLeaveDays } from '@/lib/helpers/attendance';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { motion } from 'framer-motion';

export default function EmployeeLeavePage() {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<(LeaveBalance & { leave_types: LeaveType })[]>([]);
  const [requests, setRequests] = useState<(LeaveRequest & { leave_types: LeaveType })[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LeaveRequestValues>({
    resolver: zodResolver(leaveRequestSchema),
  });

  const selectedType = watch('leave_type_id');
  const fromDate = watch('from_date');
  const toDate = watch('to_date');

  const fetchData = async () => {
    if (!user) return;
    const [typesRes, balRes, reqRes, holRes] = await Promise.all([
      supabase.from('leave_types').select('*'),
      supabase.from('leave_balances').select('*, leave_types(*)').eq('user_id', user.id).eq('year', new Date().getFullYear()),
      supabase.from('leave_requests').select('*, leave_types(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('holidays').select('*').gte('date', format(new Date(), 'yyyy-MM-dd')),
    ]);
    if (typesRes.data) setLeaveTypes(typesRes.data as LeaveType[]);
    if (balRes.data) setBalances(balRes.data as any);
    if (reqRes.data) setRequests(reqRes.data as any);
    if (holRes.data) setHolidays(holRes.data as Holiday[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const calculatedDays = fromDate && toDate ? calculateLeaveDays(fromDate, toDate, holidays) : 0;

  const selectedBalance = balances.find(b => b.leave_type_id === selectedType);

  const onSubmit = async (values: LeaveRequestValues) => {
    if (!user) return;
    const days = calculateLeaveDays(values.from_date, values.to_date, holidays);
    if (days <= 0) {
      toast.error('Selected dates include no working days.');
      return;
    }
    if (selectedBalance && days > (selectedBalance.balance - selectedBalance.used)) {
      toast.error('Insufficient leave balance for this request.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('leave_requests').insert({
        user_id: user.id,
        leave_type_id: values.leave_type_id,
        from_date: values.from_date,
        to_date: values.to_date,
        days,
        reason: values.reason,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Leave request submitted!');
      reset();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      const { error } = await supabase.from('leave_requests').delete().eq('id', cancelTarget);
      if (error) throw error;
      toast.success('Request cancelled.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setCancelTarget(null);
    }
  };

  const columns: ColumnDef<LeaveRequest & { leave_types: LeaveType }>[] = [
    { accessorKey: 'leave_types.name', header: 'Type', cell: ({ row }) => row.original.leave_types?.name || '-' },
    { accessorKey: 'from_date', header: 'From', cell: ({ row }) => format(parseISO(row.original.from_date), 'MMM d, yyyy') },
    { accessorKey: 'to_date', header: 'To', cell: ({ row }) => format(parseISO(row.original.to_date), 'MMM d, yyyy') },
    { accessorKey: 'days', header: 'Days' },
    { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => <span className="line-clamp-1 max-w-[200px]">{row.original.reason}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <LeaveBadge status={row.original.status} /> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        row.original.status === 'pending' ? (
          <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setCancelTarget(row.original.id)}>
            Cancel
          </Button>
        ) : null
      ),
    },
  ];

  const totalRemaining = balances.reduce((sum, b) => sum + (b.balance - b.used), 0);
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="My Leave" description="Apply for leave and track your requests" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Balance" value={`${totalRemaining} days`} icon={CalendarCheck} accent="blue" delay={0} />
        <StatCard label="Pending" value={pendingCount} icon={Clock} accent="amber" delay={0.05} />
        <StatCard label="Approved" value={approvedCount} icon={CalendarCheck} accent="green" delay={0.1} />
        <StatCard label="Rejected" value={rejectedCount} icon={XCircle} accent="rose" delay={0.15} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Apply Form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <SectionCard title="Apply for Leave" description="Submit a new leave request">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={selectedType ?? undefined} onValueChange={(v) => setValue('leave_type_id', v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {selectedBalance?.leave_type_id === t.id && `(${selectedBalance.balance - selectedBalance.used} left)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.leave_type_id && <p className="text-xs text-rose-500">{errors.leave_type_id.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="from_date">From</Label>
                  <Input type="date" id="from_date" {...register('from_date')} />
                  {errors.from_date && <p className="text-xs text-rose-500">{errors.from_date.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to_date">To</Label>
                  <Input type="date" id="to_date" {...register('to_date')} />
                  {errors.to_date && <p className="text-xs text-rose-500">{errors.to_date.message}</p>}
                </div>
              </div>

              {calculatedDays > 0 && (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  {calculatedDays} working day(s) selected
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" placeholder="Please provide a reason..." rows={3} {...register('reason')} />
                {errors.reason && <p className="text-xs text-rose-500">{errors.reason.message}</p>}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                <CalendarPlus className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </SectionCard>
        </motion.div>

        {/* Balances + History */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Leave Balances" description="Your allocated leave for this year">
            <div className="grid gap-4 sm:grid-cols-2">
              {balances.length === 0 ? (
                <p className="text-sm text-slate-500">No leave balances allocated.</p>
              ) : (
                balances.map(b => {
                  const remaining = b.balance - b.used;
                  const pct = b.balance > 0 ? (remaining / b.balance) * 100 : 0;
                  return (
                    <div key={b.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{b.leave_types.name}</span>
                        <span className="text-xs text-slate-500">{remaining}/{b.balance}</span>
                      </div>
                      <Progress value={pct} className="mt-2 h-1.5" />
                      <p className="mt-1 text-xs text-slate-400">{b.used} used · {remaining} remaining</p>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          <SectionCard title="Leave History" description="All your leave requests">
            <DataTable columns={columns} data={requests} searchKey="reason" searchPlaceholder="Search..." pageSize={5} />
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel this request?"
        description="This will permanently cancel your pending leave request."
        confirmLabel="Yes, cancel"
        destructive
        onConfirm={handleCancel}
      />
    </div>
  );
}
