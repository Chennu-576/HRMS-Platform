import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, email, phone, department_id, job_title, role, employee_code } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Create auth user with service role key
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'TempPass123',
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update the profile that was auto-created by the trigger
    if (data.user) {
      await supabaseAdmin
        .from('profiles')
        .update({
          full_name,
          phone: phone || '',
          department_id: department_id || null,
          job_title: job_title || '',
          role: role || 'employee',
          employee_code: employee_code || null,
        })
        .eq('id', data.user.id);
    }

    return NextResponse.json({ id: data.user?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
