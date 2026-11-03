'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { StatCard } from '@/components/shared/stat-card';
import { AttendanceBadge } from '@/components/shared/badges';
import { DataTable } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { LogIn, LogOut, Coffee, Clock, CheckCircle2, AlertCircle, CalendarDays } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { Attendance } from '@/lib/types';
import type { ColumnDef } from '@tanstack/react-table';
import { computeFinalStatus, formatTime, getAttendanceColor } from '@/lib/helpers/attendance';
import { exportToCSV } from '@/lib/helpers/export';

export default function EmployeeAttendancePage() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const fetchData = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [todayRes, monthRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
      supabase.from('attendance').select('*').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd).order('date', { ascending: false }),
    ]);

    if (todayRes.data) setTodayAttendance(todayRes.data as Attendance);
    if (monthRes.data) setRecords(monthRes.data as Attendance[]);
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
      const { status } = computeFinalStatus(now, now);
      const { data, error } = await supabase
        .from('attendance')
        .insert({ user_id: user.id, date: format(now, 'yyyy-MM-dd'), check_in: now.toISOString(), status: status === 'half_day' ? 'present' : status, work_hours: 0 })
        .select('*').single();
      if (error) {
        if (error.code === '23505') toast.error('Already checked in today.');
        else throw error;
      } else {
        setTodayAttendance(data as Attendance);
        toast.success('Checked in successfully!');
        fetchData();
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
        .from('attendance').update({ check_out: now.toISOString(), status, work_hours: workHours })
        .eq('id', todayAttendance.id).select('*').single();
      if (error) throw error;
      setTodayAttendance(data as Attendance);
      toast.success('Checked out successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to check out');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Monthly summary
  const summary = useMemo(() => {
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const halfDay = records.filter(r => r.status === 'half_day').length;
    const total = records.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, late, halfDay, total, pct };
  }, [records]);

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const recordMap = new Map(records.map(r => [r.date, r]));
    return days.map(d => ({ date: d, record: recordMap.get(format(d, 'yyyy-MM-dd')) || null }));
  }, [calendarMonth, records]);

  const columns: ColumnDef<Attendance>[] = [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => format(parseISO(row.original.date), 'MMM d, yyyy') },
    { accessorKey: 'check_in', header: 'Check In', cell: ({ row }) => formatTime(row.original.check_in) },
    { accessorKey: 'check_out', header: 'Check Out', cell: ({ row }) => formatTime(row.original.check_out) },
    { accessorKey: 'work_hours', header: 'Hours', cell: ({ row }) => `${row.original.work_hours}h` },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <AttendanceBadge status={row.original.status} /> },
  ];

  const handleExport = () => {
    exportToCSV('attendance.csv', ['Date', 'Check In', 'Check Out', 'Hours', 'Status'],
      records.map(r => [r.date, formatTime(r.check_in), formatTime(r.check_out), r.work_hours, r.status]));
  };

  if (loading) {
    return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" description="Track your daily check-in/check-out and monthly summary"
        action={<Button variant="outline" size="sm" onClick={handleExport}>Export CSV</Button>} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Present Days" value={summary.present} icon={CheckCircle2} accent="green" delay={0} />
        <StatCard label="Late Marks" value={summary.late} icon={AlertCircle} accent="amber" delay={0.05} />
        <StatCard label="Half Days" value={summary.halfDay} icon={Clock} accent="blue" delay={0.1} />
        <StatCard label="Attendance %" value={`${summary.pct}%`} icon={CalendarDays} accent="teal" delay={0.15} />
      </div>

      {/* Check-in/out */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <SectionCard title="Today's Attendance" description={format(new Date(), 'EEEE, MMMM d, yyyy')}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Check In</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatTime(todayAttendance?.check_in || null)}</p>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Check Out</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatTime(todayAttendance?.check_out || null)}</p>
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

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <DataTable columns={columns} data={records} searchKey="date" searchPlaceholder="Search by date..." pageSize={10} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <SectionCard
            title={format(calendarMonth, 'MMMM yyyy')}
            action={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>Next</Button>
              </div>
            }
          >
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-semibold uppercase text-slate-400 pb-2">{d}</div>
              ))}
              {calendarDays.map(({ date, record }) => {
                const day = getDay(date);
                const empty = day === 0 ? 0 : day;
                return (
                  <div key={date.toISOString()} style={{ gridColumnStart: calendarDays.indexOf({ date, record }) === 0 ? empty + 1 : undefined }}>
                    <Card className={`min-h-[72px] p-2 ${isToday(date) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-100'} ${!isSameMonth(date, calendarMonth) ? 'opacity-40' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isToday(date) ? 'text-blue-600' : 'text-slate-600'}`}>{format(date, 'd')}</span>
                        {record && <div className={`h-2 w-2 rounded-full ${getAttendanceColor(record.status)}`} />}
                      </div>
                      {record && (
                        <div className="mt-1">
                          <p className="text-[10px] text-slate-400">{formatTime(record.check_in)}</p>
                          <p className="text-[10px] text-slate-400">{formatTime(record.check_out)}</p>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
