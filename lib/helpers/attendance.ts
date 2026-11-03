import { format, parseISO, differenceInCalendarDays, eachDayOfInterval, isWeekend } from 'date-fns';
import type { AttendanceStatus, Holiday } from '@/lib/types';

export const WORK_START_HOUR = 9;
export const WORK_START_MINUTE = 30;
export const HALF_DAY_HOURS = 4;
export const FULL_DAY_HOURS = 8;

export function computeCheckInStatus(checkIn: Date): AttendanceStatus {
  const cutoff = new Date(checkIn);
  cutoff.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);
  return checkIn > cutoff ? 'late' : 'present';
}

export function computeWorkHours(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

export function computeFinalStatus(
  checkIn: Date,
  checkOut: Date
): { status: AttendanceStatus; workHours: number } {
  const workHours = computeWorkHours(checkIn, checkOut);
  let status: AttendanceStatus = computeCheckInStatus(checkIn);
  if (workHours > 0 && workHours < HALF_DAY_HOURS) {
    status = 'half_day';
  }
  return { status, workHours };
}

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    return format(parseISO(dateStr), 'hh:mm a');
  } catch {
    return '--';
  }
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

export function calculateLeaveDays(
  fromDate: string,
  toDate: string,
  holidays: Holiday[] = []
): number {
  const start = parseISO(fromDate);
  const end = parseISO(toDate);
  const holidayDates = new Set(holidays.map((h) => h.date));
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => {
    if (isWeekend(d)) return false;
    if (holidayDates.has(format(d, 'yyyy-MM-dd'))) return false;
    return true;
  }).length;
}

export function getAttendanceColor(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'bg-emerald-500';
    case 'late':
      return 'bg-amber-500';
    case 'half_day':
      return 'bg-blue-500';
    case 'absent':
      return 'bg-rose-500';
    default:
      return 'bg-slate-300';
  }
}

export function getAttendanceBadgeClasses(status: AttendanceStatus): string {
  switch (status) {
    case 'present':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'late':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'half_day':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'absent':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getLeaveBadgeClasses(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
