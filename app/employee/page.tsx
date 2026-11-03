'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { StatCard } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { LeaveBadge } from '@/components/shared/badges';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CalendarCheck, CalendarOff, TrendingUp, LogIn, LogOut, Coffee, Sparkles, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Attendance, Holiday, LeaveRequest, LeaveBalance, LeaveType, Announcement } from '@/lib/types';
import { computeFinalStatus, formatTime } from '@/lib/helpers/attendance';

export default function EmployeeDashboard() {
  const { user, profile } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<(LeaveBalance & { leave_types: LeaveType })[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [attRes, balRes, holRes, leaveRes, annRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase
        .from('leave_balances')
        .select('*, leave_types(*)')
        .eq('user_id', user.id)
        .eq('year', new Date().getFullYear()),
      supabase.from('holidays').select('*').gte('date', today).order('date', { ascending: true }).limit(5),
      supabase
        .from('leave_requests')
        .select('*, leave_types(*)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('announcements')
        .select('*, profiles!announcements_created_by_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (attRes.data) setTodayAttendance(attRes.data as Attendance);
    if (balRes.data) setLeaveBalances(balRes.data as any);
    if (holRes.data) setUpcomingHolidays(holRes.data as Holiday[]);
    if (leaveRes.data) setPendingLeaves(leaveRes.data as LeaveRequest[]);
    if (annRes.data) setAnnouncements(annRes.data as Announcement[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCheckIn = async () => {
    if (!user) return;
    setCheckInLoading(true);
    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const { status } = computeFinalStatus(now, now);

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          date: today,
          check_in: now.toISOString(),
          status: status === 'half_day' ? 'present' : status,
          work_hours: 0,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already checked in today.');
        } else {
          throw error;
        }
      } else {
        setTodayAttendance(data as Attendance);
        toast.success('Checked in successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to check in');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !todayAttendance) return;
    setCheckInLoading(true);
    try {
      const now = new Date();
      const checkIn = new Date(todayAttendance.check_in!);
      const { status, workHours } = computeFinalStatus(checkIn, now);

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out: now.toISOString(),
          status,
          work_hours: workHours,
        })
        .eq('id', todayAttendance.id)
        .select('*')
        .single();

      if (error) throw error;
      setTodayAttendance(data as Attendance);
      toast.success('Checked out successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to check out');
    } finally {
      setCheckInLoading(false);
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  const totalLeaveBalance = leaveBalances.reduce((sum, b) => sum + (b.balance - b.used), 0);
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="space-y-6">
      {/* Greeting Hero — different from admin: light gradient with accent */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-blue-50 via-white to-emerald-50/50 p-6 lg:p-8"
      >
        <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-8 right-20 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">{today}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
              {greeting}, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {todayAttendance?.check_out
                ? 'Your day is complete. Great work!'
                : todayAttendance?.check_in
                ? 'You are checked in. Have a productive day.'
                : 'Ready to start your day? Check in below.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{totalLeaveBalance}</p>
              <p className="text-xs text-slate-400">Leave Days Left</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Status" value={todayAttendance?.status || 'Not checked in'} icon={Clock} accent={todayAttendance ? 'green' : 'slate'} delay={0} />
        <StatCard label="Leave Balance" value={`${totalLeaveBalance} days`} icon={CalendarCheck} accent="blue" delay={0.05} />
        <StatCard label="Pending Requests" value={pendingLeaves.length} icon={TrendingUp} accent="amber" delay={0.1} />
        <StatCard label="Upcoming Holidays" value={upcomingHolidays.length} icon={CalendarOff} accent="teal" delay={0.15} />
      </div>

      {/* Attendance Tracker — full width, distinct from admin layout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <SectionCard title="Attendance" description="Check in and check out for today">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Check In</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatTime(todayAttendance?.check_in || null)}
                </p>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Check Out</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatTime(todayAttendance?.check_out || null)}
                </p>
              </div>
              {todayAttendance?.work_hours ? (
                <>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Hours</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{todayAttendance.work_hours}h</p>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex gap-2">
              {!todayAttendance?.check_in ? (
                <Button onClick={handleCheckIn} disabled={checkInLoading} className="gap-2">
                  <LogIn className="h-4 w-4" /> Check In
                </Button>
              ) : !todayAttendance?.check_out ? (
                <Button onClick={handleCheckOut} disabled={checkInLoading} variant="destructive" className="gap-2">
                  <LogOut className="h-4 w-4" /> Check Out
                </Button>
              ) : (
                <Button disabled variant="outline" className="gap-2">
                  <Coffee className="h-4 w-4" /> Day Complete
                </Button>
              )}
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* Two-column: Leave Balances + Upcoming Holidays */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Leave Balances" description="Your remaining leave for this year">
          <div className="space-y-4">
            {leaveBalances.length === 0 ? (
              <p className="text-sm text-slate-500">No leave balances allocated yet.</p>
            ) : (
              leaveBalances.map((lb) => {
                const remaining = lb.balance - lb.used;
                const pct = lb.balance > 0 ? (remaining / lb.balance) * 100 : 0;
                return (
                  <div key={lb.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{lb.leave_types.name}</span>
                      <span className="text-slate-500">
                        {remaining} / {lb.balance} days
                      </span>
                    </div>
                    <Progress value={pct} className="mt-1.5 h-2" />
                  </div>
                );
              })
            )}
            <Link href="/employee/leave">
              <Button variant="outline" size="sm" className="mt-2 w-full gap-1">
                Apply for Leave <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Upcoming Holidays" description="Next company holidays">
          <div className="space-y-3">
            {upcomingHolidays.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming holidays.</p>
            ) : (
              upcomingHolidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-400">{h.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{format(parseISO(h.date), 'MMM d')}</p>
                    <p className="text-xs text-slate-400 capitalize">{h.type}</p>
                  </div>
                </div>
              ))
            )}
            <Link href="/employee/holidays">
              <Button variant="outline" size="sm" className="w-full gap-1">
                View All Holidays <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* Pending Leaves + Announcements */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Pending Leave Requests" description="Your requests awaiting approval">
          <div className="space-y-3">
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-slate-500">No pending requests.</p>
            ) : (
              pendingLeaves.map((lr) => (
                <div key={lr.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {format(parseISO(lr.from_date), 'MMM d')} — {format(parseISO(lr.to_date), 'MMM d')}
                    </p>
                    <p className="text-xs text-slate-400">{lr.days} day(s) · {lr.reason}</p>
                  </div>
                  <LeaveBadge status={lr.status} />
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Announcements" description="Latest company notices">
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-slate-500">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-100 px-3 py-2.5">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{a.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{format(parseISO(a.created_at), 'MMM d, yyyy')}</p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
