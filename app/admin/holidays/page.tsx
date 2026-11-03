
// app/dashboard/admin/holidays/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { HolidayTypeBadge } from '@/components/shared/badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { 
  CalendarOff, Plus, Edit, Trash2, Globe, Building2, 
  Calendar, Sparkles, Zap, Crown, Star, PartyPopper,
  Sun, Moon, Coffee, Gift, Heart, Music, Palette,
  Compass, Flower, Layers, TrendingUp, ArrowUpRight, Award,
  Clock, Users, MapPin, Flag
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { holidaySchema, type HolidayValues } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, formatDistanceToNow, isSameMonth, isFuture, isPast } from 'date-fns';
import type { Holiday } from '@/lib/types';

// ==============================================
// 1. COVER FLOW HERO WITH SEASONAL THEME
// ==============================================
const SeasonalHero = ({ holidays, upcoming }: { holidays: Holiday[], upcoming: Holiday[] }) => {
  const months = new Set(holidays.map(h => format(parseISO(h.date), 'MMMM')));
  const uniqueMonths = Array.from(months);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl"
    >
      <div className="relative h-56 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 p-8 lg:p-10">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[radial-gradient(circle_at_30%_50%,_rgba(255,255,255,0.1)_0%,_transparent_50%)]" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-[radial-gradient(circle_at_70%_50%,_rgba(255,255,255,0.05)_0%,_transparent_50%)]" />
          
          {/* Floating Emojis/Icons */}
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-4 right-20 text-4xl opacity-20"
          >
            🎉
          </motion.div>
          <motion.div 
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute bottom-4 left-20 text-4xl opacity-20"
          >
            🎊
          </motion.div>
          <motion.div 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 text-6xl opacity-10"
          >
            ✨
          </motion.div>
        </div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between h-full">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <PartyPopper className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  Holiday <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">Calendar</span>
                </h1>
                <p className="text-white/70 text-sm mt-1">{holidays.length} holidays across {uniqueMonths.length} months</p>
              </div>
            </div>
          </div>
          
          {/* Upcoming Holiday Spotlight */}
          {upcoming.length > 0 && (
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {format(parseISO(upcoming[0].date), 'd')}
                </p>
                <p className="text-[10px] text-white/60 uppercase tracking-wider">
                  {format(parseISO(upcoming[0].date), 'MMM')}
                </p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-sm font-medium text-white">Next Holiday</p>
                <p className="text-xs text-white/70">{upcoming[0].name}</p>
                <p className="text-[10px] text-white/50">
                  {formatDistanceToNow(parseISO(upcoming[0].date), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ==============================================
// 2. HOLIDAY MONTH GRID - UNIQUE LAYOUT
// ==============================================
const HolidayMonthGrid = ({ holidays }: { holidays: Holiday[] }) => {
  const groupedByMonth = holidays.reduce((acc: any, holiday) => {
    const month = format(parseISO(holiday.date), 'MMMM');
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {});

  const monthColors: any = {
    'January': 'from-blue-400 to-blue-500',
    'February': 'from-purple-400 to-purple-500',
    'March': 'from-emerald-400 to-emerald-500',
    'April': 'from-rose-400 to-rose-500',
    'May': 'from-pink-400 to-pink-500',
    'June': 'from-indigo-400 to-indigo-500',
    'July': 'from-red-400 to-red-500',
    'August': 'from-orange-400 to-orange-500',
    'September': 'from-yellow-400 to-yellow-500',
    'October': 'from-amber-400 to-amber-500',
    'November': 'from-teal-400 to-teal-500',
    'December': 'from-cyan-400 to-cyan-500',
  };

  const monthIcons: any = {
    'January': Sun,
    'February': Heart,
    'March': Coffee,
    'April': Music,
    'May': Flower,
    'June': Palette,
    'July': Compass,
    'August': Star,
    'September': Sparkles,
    'October': Moon,
    'November': Gift,
    'December': Crown,
  };

  if (Object.keys(groupedByMonth).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-slate-100 mb-4">
          <CalendarOff className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700">No holidays scheduled</p>
        <p className="text-xs text-slate-400 mt-1">Start adding holidays to the calendar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Object.entries(groupedByMonth).map(([month, monthHolidays]: [string, any]) => {
        const Icon = monthIcons[month] || Calendar;
        const color = monthColors[month] || 'from-gray-400 to-gray-500';
        
        return (
          <motion.div
            key={month}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${color}`} />
            
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${color} shadow-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{month}</h4>
                    <p className="text-xs text-slate-400">{monthHolidays.length} holidays</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {monthHolidays.map((holiday: Holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group/item">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400">
                        {format(parseISO(holiday.date), 'd')}
                      </span>
                      <span className="text-sm text-slate-700 truncate">{holiday.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => openEdit(holiday)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => setDeleteTarget(holiday.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ==============================================
// 3. UPCOMING HOLIDAYS TIMELINE
// ==============================================
const UpcomingTimeline = ({ holidays }: { holidays: Holiday[] }) => {
  const future = holidays.filter(h => isFuture(parseISO(h.date))).sort((a, b) => 
    parseISO(a.date).getTime() - parseISO(b.date).getTime()
  ).slice(0, 5);

  if (future.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        No upcoming holidays scheduled
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400 opacity-20" />
      <div className="space-y-4">
        {future.map((holiday, idx) => {
          const daysUntil = Math.ceil(
            (parseISO(holiday.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return (
            <motion.div
              key={holiday.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="relative pl-10"
            >
              <div className={`absolute left-2 top-1.5 h-4 w-4 rounded-full border-2 ${
                daysUntil <= 7 ? 'border-rose-400 bg-rose-100' :
                daysUntil <= 30 ? 'border-amber-400 bg-amber-100' :
                'border-emerald-400 bg-emerald-100'
              }`}>
                <div className={`absolute inset-1 rounded-full ${
                  daysUntil <= 7 ? 'bg-rose-400 animate-pulse' :
                  daysUntil <= 30 ? 'bg-amber-400' :
                  'bg-emerald-400'
                }`} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/60 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[48px]">
                    <p className="text-xs font-medium text-slate-400">
                      {format(parseISO(holiday.date), 'MMM')}
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {format(parseISO(holiday.date), 'd')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{holiday.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysUntil === 0 ? 'Today!' : 
                       daysUntil === 1 ? 'Tomorrow' : 
                       `${daysUntil} days away`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HolidayTypeBadge type={holiday.type} />
                  <span className="text-xs text-slate-400">
                    {format(parseISO(holiday.date), 'EEEE')}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ==============================================
// 4. MAIN COMPONENT
// ==============================================
export default function AdminHolidaysPage() {
  const { user: admin } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Holiday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HolidayValues>({
    resolver: zodResolver(holidaySchema),
  });

  const selectedType = watch('type');

  // YOUR EXISTING LOGIC - UNTOUCHED
  const fetchHolidays = async () => {
    const { data } = await supabase.from('holidays').select('*').order('date', { ascending: true });
    if (data) setHolidays(data as Holiday[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    reset({ name: '', date: '', type: 'public', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditTarget(h);
    reset({ name: h.name, date: h.date, type: h.type, description: h.description });
    setDialogOpen(true);
  };

  const onSubmit = async (values: HolidayValues) => {
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase
          .from('holidays')
          .update({ name: values.name, date: values.date, type: values.type, description: values.description || '' })
          .eq('id', editTarget.id);
        if (error) throw error;
        if (admin) await supabase.from('audit_log').insert({ actor_id: admin.id, action: 'update_holiday', target_type: 'holiday', target_id: editTarget.id, metadata: { name: values.name } });
        toast.success('Holiday updated.');
      } else {
        const { error } = await supabase
          .from('holidays')
          .insert({ name: values.name, date: values.date, type: values.type, description: values.description || '' });
        if (error) throw error;
        if (admin) await supabase.from('audit_log').insert({ actor_id: admin.id, action: 'create_holiday', target_type: 'holiday', target_id: '', metadata: { name: values.name } });
        toast.success('Holiday created.');
      }
      setDialogOpen(false);
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !admin) return;
    try {
      const { error } = await supabase.from('holidays').delete().eq('id', deleteTarget);
      if (error) throw error;
      await supabase.from('audit_log').insert({ actor_id: admin.id, action: 'delete_holiday', target_type: 'holiday', target_id: deleteTarget });
      toast.success('Holiday deleted.');
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200/60" />)}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-slate-200/60" />
      </div>
    );
  }

  const upcoming = holidays.filter(h => isFuture(parseISO(h.date))).sort((a, b) => 
    parseISO(a.date).getTime() - parseISO(b.date).getTime()
  );
  const past = holidays.filter(h => isPast(parseISO(h.date)));

  return (
    <div className="space-y-8 pb-8">
      {/* ===== COVER FLOW HERO ===== */}
      <SeasonalHero holidays={holidays} upcoming={upcoming} />

      {/* ===== UPCOMING TIMELINE + QUICK STATS ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Upcoming Holidays</h3>
                  <p className="text-xs text-slate-400">Next {upcoming.length} holidays</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">
                {upcoming.length} upcoming
              </span>
            </div>
            <UpcomingTimeline holidays={holidays} />
          </div>
        </div>
        
        {/* Quick Stats Widget */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/60 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200">
                <CalendarOff className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-rose-600 uppercase tracking-wider font-medium">Total Holidays</p>
                <p className="text-2xl font-bold text-rose-700">{holidays.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2 rounded-lg bg-white/60">
                <p className="text-[10px] text-slate-400">Public</p>
                <p className="text-sm font-bold text-rose-600">{holidays.filter(h => h.type === 'public').length}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/60">
                <p className="text-[10px] text-slate-400">Company</p>
                <p className="text-sm font-bold text-rose-600">{holidays.filter(h => h.type === 'company').length}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/60 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-indigo-600 uppercase tracking-wider font-medium">Past Holidays</p>
                <p className="text-2xl font-bold text-indigo-700">{past.length}</p>
                <p className="text-[10px] text-indigo-500">Already celebrated</p>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-200"
            onClick={openAdd}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Holiday
          </Button>
        </div>
      </div>

      {/* ===== HOLIDAY MONTH GRID ===== */}
      <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-indigo-50/20 via-white to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Holiday Calendar</h3>
                <p className="text-xs text-slate-400">Organized by month</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Public
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                Company
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <HolidayMonthGrid holidays={holidays} />
        </div>
      </div>

      {/* ===== DIALOG - YOUR EXISTING LOGIC UNTOUCHED ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Holiday Name</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...register('date')} />
                {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={selectedType} onValueChange={(v) => setValue('type', v as 'public' | 'company', { shouldValidate: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} {...register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this holiday?"
        description="This will remove the holiday from the calendar."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}


// 'use client';

// import { useEffect, useState } from 'react';
// import { useAuth } from '@/lib/auth-context';
// import { supabase } from '@/lib/supabase/client';
// import { PageHeader } from '@/components/shared/page-header';
// import { StatCard } from '@/components/shared/stat-card';
// import { SectionCard } from '@/components/shared/section-card';
// import { HolidayTypeBadge } from '@/components/shared/badges';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { ConfirmDialog } from '@/components/shared/confirm-dialog';
// import { CalendarOff, Plus, Edit, Trash2, Globe, Building2 } from 'lucide-react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { holidaySchema, type HolidayValues } from '@/lib/validation/schemas';
// import { toast } from 'sonner';
// import { motion } from 'framer-motion';
// import { format, parseISO } from 'date-fns';
// import type { Holiday } from '@/lib/types';

// export default function AdminHolidaysPage() {
//   const { user: admin } = useAuth();
//   const [holidays, setHolidays] = useState<Holiday[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [dialogOpen, setDialogOpen] = useState(false);
//   const [editTarget, setEditTarget] = useState<Holiday | null>(null);
//   const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
//   const [saving, setSaving] = useState(false);

//   const {
//     register,
//     handleSubmit,
//     reset,
//     setValue,
//     watch,
//     formState: { errors },
//   } = useForm<HolidayValues>({
//     resolver: zodResolver(holidaySchema),
//   });

//   const selectedType = watch('type');

//   const fetchHolidays = async () => {
//     const { data } = await supabase.from('holidays').select('*').order('date', { ascending: true });
//     if (data) setHolidays(data as Holiday[]);
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchHolidays();
//   }, []);

//   const openAdd = () => {
//     setEditTarget(null);
//     reset({ name: '', date: '', type: 'public', description: '' });
//     setDialogOpen(true);
//   };

//   const openEdit = (h: Holiday) => {
//     setEditTarget(h);
//     reset({ name: h.name, date: h.date, type: h.type, description: h.description });
//     setDialogOpen(true);
//   };

//   const onSubmit = async (values: HolidayValues) => {
//     setSaving(true);
//     try {
//       if (editTarget) {
//         const { error } = await supabase
//           .from('holidays')
//           .update({ name: values.name, date: values.date, type: values.type, description: values.description || '' })
//           .eq('id', editTarget.id);
//         if (error) throw error;
//         if (admin) await supabase.from('audit_log').insert({ actor_id: admin.id, action: 'update_holiday', target_type: 'holiday', target_id: editTarget.id, metadata: { name: values.name } });
//         toast.success('Holiday updated.');
//       } else {
//         const { error } = await supabase
//           .from('holidays')
//           .insert({ name: values.name, date: values.date, type: values.type, description: values.description || '' });
//         if (error) throw error;
//         if (admin) await supabase.from('audit_log').insert({ actor_id: admin.id, action: 'create_holiday', target_type: 'holiday', target_id: '', metadata: { name: values.name } });
//         toast.success('Holiday created.');
//       }
//       setDialogOpen(false);
//       fetchHolidays();
//     } catch (err: any) {
//       toast.error(err.message || 'Failed');
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!deleteTarget || !admin) return;
//     try {
//       const { error } = await supabase.from('holidays').delete().eq('id', deleteTarget);
//       if (error) throw error;
//       await supabase.from('audit_log').insert({ actor_id: admin.id, action: 'delete_holiday', target_type: 'holiday', target_id: deleteTarget });
//       toast.success('Holiday deleted.');
//       fetchHolidays();
//     } catch (err: any) {
//       toast.error(err.message || 'Failed');
//     } finally {
//       setDeleteTarget(null);
//     }
//   };

//   const publicCount = holidays.filter(h => h.type === 'public').length;
//   const companyCount = holidays.filter(h => h.type === 'company').length;

//   if (loading) return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;

//   return (
//     <div className="space-y-6">
//       <PageHeader title="Holiday Management" description="Manage public and company holidays"
//         action={<Button size="sm" onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Holiday</Button>} />

//       <div className="grid gap-4 sm:grid-cols-3">
//         <StatCard label="Total Holidays" value={holidays.length} icon={CalendarOff} accent="blue" delay={0} />
//         <StatCard label="Public" value={publicCount} icon={Globe} accent="rose" delay={0.05} />
//         <StatCard label="Company" value={companyCount} icon={Building2} accent="teal" delay={0.1} />
//       </div>

//       <SectionCard title={`Holidays in ${new Date().getFullYear()}`}>
//         <div className="space-y-2">
//           {holidays.length === 0 ? (
//             <p className="text-sm text-slate-500">No holidays configured.</p>
//           ) : (
//             holidays.map((h, i) => (
//               <motion.div
//                 key={h.id}
//                 initial={{ opacity: 0, x: -8 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ duration: 0.2, delay: i * 0.03 }}
//                 className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 hover:bg-slate-50/60"
//               >
//                 <div className="flex items-center gap-4">
//                   <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-slate-50 text-center">
//                     <span className="text-[10px] font-medium uppercase text-slate-400">{format(parseISO(h.date), 'MMM')}</span>
//                     <span className="text-lg font-bold text-slate-900">{format(parseISO(h.date), 'd')}</span>
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-slate-900">{h.name}</p>
//                     <p className="text-xs text-slate-500">{h.description}</p>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-3">
//                   <span className="hidden text-sm text-slate-500 sm:block">{format(parseISO(h.date), 'EEEE')}</span>
//                   <HolidayTypeBadge type={h.type} />
//                   <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(h)}>
//                     <Edit className="h-4 w-4" />
//                   </Button>
//                   <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setDeleteTarget(h.id)}>
//                     <Trash2 className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </motion.div>
//             ))
//           )}
//         </div>
//       </SectionCard>

//       <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>{editTarget ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
//           </DialogHeader>
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//             <div className="space-y-2">
//               <Label>Holiday Name</Label>
//               <Input {...register('name')} />
//               {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
//             </div>
//             <div className="grid gap-4 sm:grid-cols-2">
//               <div className="space-y-2">
//                 <Label>Date</Label>
//                 <Input type="date" {...register('date')} />
//                 {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
//               </div>
//               <div className="space-y-2">
//                 <Label>Type</Label>
//                 <Select value={selectedType} onValueChange={(v) => setValue('type', v as 'public' | 'company', { shouldValidate: true })}>
//                   <SelectTrigger><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="public">Public</SelectItem>
//                     <SelectItem value="company">Company</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label>Description</Label>
//               <Textarea rows={2} {...register('description')} />
//             </div>
//             <DialogFooter>
//               <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
//               <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>

//       <ConfirmDialog
//         open={!!deleteTarget}
//         onOpenChange={(o) => !o && setDeleteTarget(null)}
//         title="Delete this holiday?"
//         description="This will remove the holiday from the calendar."
//         confirmLabel="Delete"
//         destructive
//         onConfirm={handleDelete}
//       />
//     </div>
//   );
// }
