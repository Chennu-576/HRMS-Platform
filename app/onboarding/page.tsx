'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { onboardingSchema, type OnboardingValues } from '@/lib/validation/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Department } from '@/lib/types';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fetching, setFetching] = useState(true);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const selectedDept = watch('department_id');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    // If profile is already complete, skip onboarding
    if (profile && profile.full_name && profile.phone) {
      router.replace(profile.role === 'admin' ? '/admin' : '/employee');
      return;
    }
    supabase
      .from('departments')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setDepartments(data as Department[]);
        setFetching(false);
      });
  }, [user, router, profile]);

  const onSubmit = async (values: OnboardingValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          phone: values.phone,
          department_id: values.department_id,
          job_title: values.job_title,
          employee_code: values.employee_code || null,
        })
        .eq('id', user.id);
      if (error) throw error;

      await refreshProfile();

      // Check role for redirect
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      toast.success('Profile setup complete!');
      router.push(profileData?.role === 'admin' ? '/admin' : '/employee');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Complete your profile</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Tell us a bit about yourself to get started.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" placeholder="John Doe" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-rose-500">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" placeholder="+1 234 567 890" {...register('phone')} />
              {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <Select
                value={selectedDept ?? undefined}
                onValueChange={(v) => setValue('department_id', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department_id && (
                <p className="text-xs text-rose-500">{errors.department_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">Job title</Label>
              <Input id="job_title" placeholder="Software Engineer" {...register('job_title')} />
              {errors.job_title && <p className="text-xs text-rose-500">{errors.job_title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_code">Employee code (optional)</Label>
              <Input id="employee_code" placeholder="EMP-001" {...register('employee_code')} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Complete setup'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
