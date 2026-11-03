'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean | null;
  accent?: 'blue' | 'green' | 'amber' | 'rose' | 'teal' | 'slate';
  delay?: number;
}

const accentConfig: Record<string, { bg: string; text: string; ring: string; bar: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100', bar: 'from-blue-500 to-blue-600' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', bar: 'from-emerald-500 to-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100', bar: 'from-amber-500 to-amber-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100', bar: 'from-rose-500 to-rose-600' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-100', bar: 'from-teal-500 to-teal-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', bar: 'from-slate-400 to-slate-500' },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = 'blue',
  delay = 0,
}: StatCardProps) {
  const cfg = accentConfig[accent] || accentConfig.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
    >
      <Card className="group relative overflow-hidden border-slate-200/70 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
        <div className={cn('absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100', cfg.bar)} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
            </div>
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110',
                cfg.bg,
                cfg.text,
                cfg.ring
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {trend && (
            <div className="mt-3 flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-medium',
                  trendUp === true && 'text-emerald-600',
                  trendUp === false && 'text-rose-600',
                  trendUp === null && 'text-slate-500'
                )}
              >
                {trend}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
