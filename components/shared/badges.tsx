import { cn } from '@/lib/utils';
import { getAttendanceBadgeClasses, getLeaveBadgeClasses } from '@/lib/helpers/attendance';

export function AttendanceBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        getAttendanceBadgeClasses(status as any)
      )}
    >
      {status === 'half_day' ? 'Half Day' : status}
    </span>
  );
}

export function LeaveBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        getLeaveBadgeClasses(status)
      )}
    >
      {status}
    </span>
  );
}

export function EmployeeStatusBadge({ status }: { status: string }) {
  const classes =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        classes
      )}
    >
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const classes =
    role === 'admin'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        classes
      )}
    >
      {role}
    </span>
  );
}

export function HolidayTypeBadge({ type }: { type: string }) {
  const classes =
    type === 'public'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-teal-50 text-teal-700 border-teal-200';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        classes
      )}
    >
      {type}
    </span>
  );
}
