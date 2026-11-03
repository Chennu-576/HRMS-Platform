'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { StatCard } from '@/components/shared/stat-card';
import { HolidayTypeBadge } from '@/components/shared/badges';
import { CalendarOff, Building2, Globe } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Holiday } from '@/lib/types';
import { motion } from 'framer-motion';

export default function EmployeeHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('holidays').select('*').order('date', { ascending: true }).then(({ data }) => {
      if (data) setHolidays(data as Holiday[]);
      setLoading(false);
    });
  }, []);

  const publicCount = holidays.filter(h => h.type === 'public').length;
  const companyCount = holidays.filter(h => h.type === 'company').length;
  const upcoming = holidays.filter(h => new Date(h.date) >= new Date()).length;

  if (loading) return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Holiday Calendar" description="View all public and company holidays" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Holidays" value={holidays.length} icon={CalendarOff} accent="blue" delay={0} />
        <StatCard label="Public" value={publicCount} icon={Globe} accent="rose" delay={0.05} />
        <StatCard label="Company" value={companyCount} icon={Building2} accent="teal" delay={0.1} />
      </div>

      <SectionCard title={`Holidays in ${new Date().getFullYear()}`} description="All holidays for this year">
        <div className="space-y-2">
          {holidays.length === 0 ? (
            <p className="text-sm text-slate-500">No holidays configured.</p>
          ) : (
            holidays.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-slate-50 text-center">
                    <span className="text-[10px] font-medium uppercase text-slate-400">{format(parseISO(h.date), 'MMM')}</span>
                    <span className="text-lg font-bold text-slate-900">{format(parseISO(h.date), 'd')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-sm text-slate-500 sm:block">{format(parseISO(h.date), 'EEEE')}</span>
                  <HolidayTypeBadge type={h.type} />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
