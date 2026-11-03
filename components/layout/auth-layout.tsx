'use client';

import { type ReactNode } from 'react';
import { Building2, ShieldCheck, CalendarCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left panel — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 p-12 lg:flex">
        {/* Decorative shapes */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-white">HRMS</p>
              <p className="text-xs font-medium text-blue-200">Enterprise HR Management</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold leading-tight text-white">
              Manage your workforce with confidence.
            </h2>
            <p className="mt-3 max-w-md text-blue-100/80">
              Attendance, leave, holidays, and employee management — all in one
              premium platform built for modern enterprises.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Clock, label: 'Smart Attendance', desc: 'Check-in/out tracking' },
              { icon: CalendarCheck, label: 'Leave Workflow', desc: 'Approval pipeline' },
              { icon: ShieldCheck, label: 'Role-based Access', desc: 'Admin & Employee' },
              { icon: Building2, label: 'Department Mgmt', desc: 'Org structure' },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <f.icon className="h-5 w-5 text-blue-200" />
                <p className="mt-2 text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-blue-200/70">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-blue-200/60">
            © {new Date().getFullYear()} HRMS. Internal company tool.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
