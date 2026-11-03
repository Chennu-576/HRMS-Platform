'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Building2, LayoutDashboard, Users, CalendarDays, ClipboardList, Megaphone, FileClock, CalendarRange, Briefcase, X, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Employees', href: '/admin/employees', icon: Users },
  { label: 'Departments', href: '/admin/departments', icon: Briefcase },
  { label: 'Attendance', href: '/admin/attendance', icon: ClipboardList },
  { label: 'Leave Approvals', href: '/admin/leaves', icon: FileClock },
  { label: 'Holidays', href: '/admin/holidays', icon: CalendarDays },
  { label: 'Calendar', href: '/admin/calendar', icon: CalendarRange },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { label: 'Audit Trail', href: '/admin/audit', icon: ShieldCheck },
];

const employeeNav: NavItem[] = [
  { label: 'Dashboard', href: '/employee', icon: LayoutDashboard },
  { label: 'My Attendance', href: '/employee/attendance', icon: ClipboardList },
  { label: 'Apply Leave', href: '/employee/leave', icon: FileClock },
  { label: 'Holidays', href: '/employee/holidays', icon: CalendarDays },
  { label: 'My Stats', href: '/employee/stats', icon: CalendarRange },
  { label: 'Profile', href: '/employee/profile', icon: Users },
];

export function Sidebar({
  role,
  collapsed,
  mobileOpen,
  onMobileClose,
}: {
  role: AppRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const nav = role === 'admin' ? adminNav : employeeNav;

  const isActive = (href: string) => {
    if (href === '/admin' || href === '/employee') return pathname === href;
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-slate-200/80 px-4', collapsed && 'justify-center')}>
        <Link href={role === 'admin' ? '/admin' : '/employee'} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-600/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900">HRMS</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {role === 'admin' ? 'Admin Portal' : 'Employee Portal'}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin px-3 py-4">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {role === 'admin' ? 'Management' : 'Workspace'}
          </p>
        )}
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-slate-200/80 p-4">
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 p-3 ring-1 ring-slate-200/60">
            <p className="text-xs font-semibold text-slate-700">HRMS v2.0</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Enterprise Edition</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 hidden h-screen border-r border-slate-200/80 bg-white transition-all duration-300 lg:block',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 bg-white lg:hidden"
            >
              <button
                onClick={onMobileClose}
                className="absolute right-3 top-4 z-10 rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
