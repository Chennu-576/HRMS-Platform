'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import type { Holiday, LeaveRequest, Attendance } from '@/lib/types';

export default function AdminCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    Promise.all([
      supabase.from('holidays').select('*').gte('date', start).lte('date', end),
      supabase.from('leave_requests').select('*').gte('from_date', start).lte('to_date', end).eq('status', 'approved'),
      supabase.from('attendance').select('*').gte('date', start).lte('date', end),
    ]).then(([holRes, leaveRes, attRes]) => {
      if (holRes.data) setHolidays(holRes.data as Holiday[]);
      if (leaveRes.data) setLeaves(leaveRes.data as LeaveRequest[]);
      if (attRes.data) setAttendance(attRes.data as Attendance[]);
      setLoading(false);
    });
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);

    const holidayMap = new Map(holidays.map(h => [h.date, h]));
    const attMap = new Map<string, Attendance[]>();
    attendance.forEach(a => {
      const arr = attMap.get(a.date) || [];
      arr.push(a);
      attMap.set(a.date, arr);
    });

    return days.map(d => ({
      date: d,
      holiday: holidayMap.get(format(d, 'yyyy-MM-dd')) || null,
      attendance: attMap.get(format(d, 'yyyy-MM-dd')) || [],
      onLeave: leaves.filter(l => {
        const from = parseISO(l.from_date);
        const to = parseISO(l.to_date);
        return d >= from && d <= to;
      }),
    }));
  }, [currentMonth, holidays, leaves, attendance]);

  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  if (loading) return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Work Calendar" description="View holidays, leaves, and attendance in a calendar"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        } />

      <SectionCard title={format(currentMonth, 'MMMM yyyy')}>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="pb-2 text-center text-xs font-semibold uppercase text-slate-400">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {calendarDays.map(({ date, holiday, attendance: dayAtt, onLeave }) => (
            <Card
              key={date.toISOString()}
              className={`min-h-[80px] p-2 ${isToday(date) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-100'} ${holiday ? 'bg-rose-50/40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isToday(date) ? 'text-blue-600' : 'text-slate-600'}`}>
                  {format(date, 'd')}
                </span>
                {holiday && <div className="h-2 w-2 rounded-full bg-rose-500" title={holiday.name} />}
              </div>
              {holiday && (
                <p className="mt-1 truncate text-[10px] font-medium text-rose-600">{holiday.name}</p>
              )}
              {dayAtt.length > 0 && (
                <p className="mt-0.5 text-[10px] text-emerald-600">{dayAtt.length} present</p>
              )}
              {onLeave.length > 0 && (
                <p className="mt-0.5 text-[10px] text-amber-600">{onLeave.length} on leave</p>
              )}
            </Card>
          ))}
        </div>
      </SectionCard>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Holiday</div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Attendance</div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> On Leave</div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Today</div>
      </div>
    </div>
  );
}
