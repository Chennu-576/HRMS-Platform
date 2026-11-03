'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Briefcase, Plus, Edit, Trash2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentSchema, type DepartmentValues } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { Department, Profile } from '@/lib/types';

export default function AdminDepartmentsPage() {
  const { user: admin } = useAuth();
  const [departments, setDepartments] = useState<(Department & { head: Pick<Profile, 'id' | 'full_name'> | null; count: number })[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
  });

  const selectedHead = watch('head_id');

  const fetchDepartments = async () => {
    const { data: depts } = await supabase.from('departments').select('*').order('name');
    const { data: emps } = await supabase.from('profiles').select('id, full_name, department_id');

    if (depts && emps) {
      const enriched = depts.map((d: any) => ({
        ...d,
        head: emps.find((e: any) => e.id === d.head_id) || null,
        count: emps.filter((e: any) => e.department_id === d.id).length,
      }));
      setDepartments(enriched);
      setEmployees(emps as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    reset({ name: '', description: '', head_id: null });
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    reset({ name: dept.name, description: dept.description, head_id: dept.head_id });
    setDialogOpen(true);
  };

  const onSubmit = async (values: DepartmentValues) => {
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase
          .from('departments')
          .update({ name: values.name, description: values.description || '', head_id: values.head_id || null })
          .eq('id', editTarget.id);
        if (error) throw error;
        if (admin) {
          await supabase.from('audit_log').insert({
            actor_id: admin.id, action: 'update_department', target_type: 'department', target_id: editTarget.id, metadata: { name: values.name },
          });
        }
        toast.success('Department updated.');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({ name: values.name, description: values.description || '', head_id: values.head_id || null });
        if (error) throw error;
        if (admin) {
          await supabase.from('audit_log').insert({
            actor_id: admin.id, action: 'create_department', target_type: 'department', target_id: '', metadata: { name: values.name },
          });
        }
        toast.success('Department created.');
      }
      setDialogOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !admin) return;
    try {
      const { error } = await supabase.from('departments').delete().eq('id', deleteTarget);
      if (error) throw error;
      await supabase.from('audit_log').insert({
        actor_id: admin.id, action: 'delete_department', target_type: 'department', target_id: deleteTarget,
      });
      toast.success('Department deleted.');
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-slate-200" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Manage company departments and teams"
        action={<Button size="sm" onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Department</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept, i) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <SectionCard>
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(dept)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setDeleteTarget(dept.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{dept.name}</h3>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{dept.description || 'No description'}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Users className="h-4 w-4" /> {dept.count} members
                </div>
                <div className="text-sm text-slate-500">
                  Head: <span className="font-medium text-slate-700">{dept.head?.full_name || 'Not set'}</span>
                </div>
              </div>
            </SectionCard>
          </motion.div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select value={selectedHead || undefined} onValueChange={(v) => setValue('head_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select head" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
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
        title="Delete this department?"
        description="Employees in this department will be unassigned. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
