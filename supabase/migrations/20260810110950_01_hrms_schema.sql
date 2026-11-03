/*
# HRMS Schema — Core Tables

## Overview
Creates the full schema for the enterprise HRMS: profiles, departments, attendance,
leave types/balances/requests, holidays, announcements, notifications, and audit log.

## New Tables
1. `departments` — org units with a department head.
2. `profiles` — extends auth.users with role (admin/employee), department, job title, status.
3. `attendance` — daily check-in/check-out records with status and work hours.
4. `leave_types` — sick, casual, earned, unpaid.
5. `leave_balances` — per-user per-year leave balance.
6. `leave_requests` — leave applications with approval workflow.
7. `holidays` — public and company holidays.
8. `announcements` — notice board entries.
9. `notifications` — in-app notifications per user.
10. `audit_log` — admin action audit trail.

## Enums
- `app_role`: admin, employee
- `attendance_status`: present, late, half_day, absent
- `leave_status`: pending, approved, rejected
- `employee_status`: active, inactive
- `holiday_type`: public, company

## Security (RLS)
- RLS enabled on every table.
- Employees can read/write only their own attendance, leave, balances, notifications.
- Admins can read all + manage all (checked via a helper function `is_admin()`).

## Important Notes
1. `profiles.id` references `auth.users(id)` so each auth user has exactly one profile.
2. `profiles.role` defaults to 'employee'. Admins are seeded manually.
3. `attendance.user_id` defaults to `auth.uid()` so client inserts omit it.
4. `leave_requests.user_id` defaults to `auth.uid()`.
5. `notifications.user_id` defaults to `auth.uid()`.
6. The `is_admin()` SECURITY DEFINER function checks the caller's profile role.
*/

-- ── ENUMS ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'late', 'half_day', 'absent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE employee_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE holiday_type AS ENUM ('public', 'company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── DEPARTMENTS (must exist before profiles FK) ─────────
CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  head_id     uuid,  -- FK added later after profiles exists
  description text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── PROFILES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text NOT NULL DEFAULT '',
  email         text NOT NULL DEFAULT '',
  avatar_url    text,
  role          app_role NOT NULL DEFAULT 'employee',
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  job_title     text DEFAULT '',
  phone         text DEFAULT '',
  employee_code text DEFAULT '',
  joined_at     date DEFAULT CURRENT_DATE,
  status        employee_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Now add the FK from departments.head_id -> profiles.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'departments_head_id_fkey'
  ) THEN
    ALTER TABLE departments
      ADD CONSTRAINT departments_head_id_fkey
      FOREIGN KEY (head_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── ATTENDANCE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  check_in   timestamptz,
  check_out  timestamptz,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  status     attendance_status NOT NULL DEFAULT 'present',
  work_hours numeric(5,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- ── LEAVE TYPES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  default_balance integer NOT NULL DEFAULT 12,
  is_paid         boolean NOT NULL DEFAULT true
);

-- ── LEAVE BALANCES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year          integer NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  balance       integer NOT NULL DEFAULT 0,
  used          integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, leave_type_id, year)
);

-- ── LEAVE REQUESTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  from_date     date NOT NULL,
  to_date       date NOT NULL,
  days          integer NOT NULL DEFAULT 1,
  reason        text DEFAULT '',
  status        leave_status NOT NULL DEFAULT 'pending',
  reviewed_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── HOLIDAYS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS holidays (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  date        date NOT NULL,
  type        holiday_type NOT NULL DEFAULT 'public',
  description text DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── ANNOUNCEMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- ── NOTIFICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'general',
  message    text NOT NULL DEFAULT '',
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── AUDIT LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text DEFAULT '',
  target_id   text DEFAULT '',
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── INDEXES ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance (user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays (date);

-- ── RLS ENABLE ─────────────────────────────────────────
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays       ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;

-- ── HELPER: is_admin() ──────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── PROFILES POLICIES ───────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON profiles;
CREATE POLICY "profiles_update_self_or_admin" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (is_admin());

-- ── DEPARTMENTS POLICIES ────────────────────────────────
DROP POLICY IF EXISTS "departments_select_all" ON departments;
CREATE POLICY "departments_select_all" ON departments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "departments_insert_admin" ON departments;
CREATE POLICY "departments_insert_admin" ON departments FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "departments_update_admin" ON departments;
CREATE POLICY "departments_update_admin" ON departments FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "departments_delete_admin" ON departments;
CREATE POLICY "departments_delete_admin" ON departments FOR DELETE
  TO authenticated USING (is_admin());

-- ── ATTENDANCE POLICIES ─────────────────────────────────
DROP POLICY IF EXISTS "attendance_select_own_or_admin" ON attendance;
CREATE POLICY "attendance_select_own_or_admin" ON attendance FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "attendance_insert_own" ON attendance;
CREATE POLICY "attendance_insert_own" ON attendance FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_update_own" ON attendance;
CREATE POLICY "attendance_update_own" ON attendance FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attendance_delete_admin" ON attendance;
CREATE POLICY "attendance_delete_admin" ON attendance FOR DELETE
  TO authenticated USING (is_admin());

-- ── LEAVE TYPES POLICIES ────────────────────────────────
DROP POLICY IF EXISTS "leave_types_select_all" ON leave_types;
CREATE POLICY "leave_types_select_all" ON leave_types FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "leave_types_insert_admin" ON leave_types;
CREATE POLICY "leave_types_insert_admin" ON leave_types FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "leave_types_update_admin" ON leave_types;
CREATE POLICY "leave_types_update_admin" ON leave_types FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "leave_types_delete_admin" ON leave_types;
CREATE POLICY "leave_types_delete_admin" ON leave_types FOR DELETE
  TO authenticated USING (is_admin());

-- ── LEAVE BALANCES POLICIES ─────────────────────────────
DROP POLICY IF EXISTS "leave_balances_select_own_or_admin" ON leave_balances;
CREATE POLICY "leave_balances_select_own_or_admin" ON leave_balances FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "leave_balances_insert_own_or_admin" ON leave_balances;
CREATE POLICY "leave_balances_insert_own_or_admin" ON leave_balances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "leave_balances_update_admin" ON leave_balances;
CREATE POLICY "leave_balances_update_admin" ON leave_balances FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "leave_balances_delete_admin" ON leave_balances;
CREATE POLICY "leave_balances_delete_admin" ON leave_balances FOR DELETE
  TO authenticated USING (is_admin());

-- ── LEAVE REQUESTS POLICIES ─────────────────────────────
DROP POLICY IF EXISTS "leave_requests_select_own_or_admin" ON leave_requests;
CREATE POLICY "leave_requests_select_own_or_admin" ON leave_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "leave_requests_insert_own" ON leave_requests;
CREATE POLICY "leave_requests_insert_own" ON leave_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "leave_requests_update_own_or_admin" ON leave_requests;
CREATE POLICY "leave_requests_update_own_or_admin" ON leave_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "leave_requests_delete_own_or_admin" ON leave_requests;
CREATE POLICY "leave_requests_delete_own_or_admin" ON leave_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- ── HOLIDAYS POLICIES ────────────────────────────────────
DROP POLICY IF EXISTS "holidays_select_all" ON holidays;
CREATE POLICY "holidays_select_all" ON holidays FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "holidays_insert_admin" ON holidays;
CREATE POLICY "holidays_insert_admin" ON holidays FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "holidays_update_admin" ON holidays;
CREATE POLICY "holidays_update_admin" ON holidays FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "holidays_delete_admin" ON holidays;
CREATE POLICY "holidays_delete_admin" ON holidays FOR DELETE
  TO authenticated USING (is_admin());

-- ── ANNOUNCEMENTS POLICIES ──────────────────────────────
DROP POLICY IF EXISTS "announcements_select_all" ON announcements;
CREATE POLICY "announcements_select_all" ON announcements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "announcements_insert_admin" ON announcements;
CREATE POLICY "announcements_insert_admin" ON announcements FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "announcements_update_admin" ON announcements;
CREATE POLICY "announcements_update_admin" ON announcements FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "announcements_delete_admin" ON announcements;
CREATE POLICY "announcements_delete_admin" ON announcements FOR DELETE
  TO authenticated USING (is_admin());

-- ── NOTIFICATIONS POLICIES ──────────────────────────────
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own_or_admin" ON notifications;
CREATE POLICY "notifications_insert_own_or_admin" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── AUDIT LOG POLICIES ──────────────────────────────────
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
CREATE POLICY "audit_log_select_admin" ON audit_log FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "audit_log_insert_admin" ON audit_log;
CREATE POLICY "audit_log_insert_admin" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (is_admin());

-- ── TRIGGER: auto-create profile on signup ──────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
