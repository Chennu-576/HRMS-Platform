'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileUpdateSchema, type ProfileUpdateValues } from '@/lib/validation/schemas';
import { getInitials } from '@/lib/helpers/attendance';
import { Save, Mail, Phone, Briefcase, Calendar } from 'lucide-react';
import type { Department } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export default function EmployeeProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
  });

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      if (data) setDepartments(data as Department[]);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setValue('full_name', profile.full_name);
      setValue('phone', profile.phone);
      setValue('job_title', profile.job_title);
      setValue('department_id', profile.department_id);
      setValue('employee_code', profile.employee_code || '');
    }
  }, [profile, setValue]);

  const selectedDept = watch('department_id');

  const onSubmit = async (values: ProfileUpdateValues) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          phone: values.phone,
          job_title: values.job_title,
          department_id: values.department_id,
          employee_code: values.employee_code || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="View and update your personal information" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Summary */}
        <SectionCard>
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 border-2 border-slate-200">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || ''} />
              <AvatarFallback className="bg-blue-100 text-xl font-semibold text-blue-700">
                {getInitials(profile?.full_name || '?')}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{profile?.full_name}</h2>
            <p className="text-sm text-slate-500">{profile?.job_title || 'No title set'}</p>
            <div className="mt-4 w-full space-y-2 text-left">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" /> {profile?.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" /> {profile?.phone || 'Not set'}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Briefcase className="h-4 w-4 text-slate-400" /> {profile?.employee_code || 'No code'}
              </div>
              {profile?.joined_at && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" /> Joined {format(parseISO(profile.joined_at), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <SectionCard title="Edit Profile" description="Update your personal details">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" {...register('full_name')} />
                  {errors.full_name && <p className="text-xs text-rose-500">{errors.full_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register('phone')} />
                  {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input id="job_title" {...register('job_title')} />
                  {errors.job_title && <p className="text-xs text-rose-500">{errors.job_title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department_id">Department</Label>
                  <Select
                    value={selectedDept || undefined}
                    onValueChange={(v) => setValue('department_id', v, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_code">Employee Code</Label>
                <Input id="employee_code" {...register('employee_code')} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
