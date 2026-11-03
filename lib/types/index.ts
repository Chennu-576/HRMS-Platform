export type AppRole = 'admin' | 'employee';
export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type EmployeeStatus = 'active' | 'inactive';
export type HolidayType = 'public' | 'company';

export interface Department {
  id: string;
  name: string;
  head_id: string | null;
  description: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: AppRole;
  department_id: string | null;
  job_title: string;
  phone: string;
  employee_code: string;
  joined_at: string;
  status: EmployeeStatus;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  check_in: string | null;
  check_out: string | null;
  date: string;
  status: AttendanceStatus;
  work_hours: number;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  default_balance: number;
  is_paid: boolean;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  balance: number;
  used: number;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: HolidayType;
  description: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Joined variants for convenience
export interface ProfileWithDepartment extends Profile {
  departments: Department | null;
}

export interface LeaveRequestWithDetails extends LeaveRequest {
  leave_types: LeaveType | null;
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      departments: {
        Row: Department;
        Insert: Partial<Department>;
        Update: Partial<Department>;
      };
      attendance: {
        Row: Attendance;
        Insert: Partial<Attendance>;
        Update: Partial<Attendance>;
      };
      leave_types: {
        Row: LeaveType;
        Insert: Partial<LeaveType>;
        Update: Partial<LeaveType>;
      };
      leave_balances: {
        Row: LeaveBalance;
        Insert: Partial<LeaveBalance>;
        Update: Partial<LeaveBalance>;
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Partial<LeaveRequest>;
        Update: Partial<LeaveRequest>;
      };
      holidays: {
        Row: Holiday;
        Insert: Partial<Holiday>;
        Update: Partial<Holiday>;
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement>;
        Update: Partial<Announcement>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Partial<AuditLog>;
        Update: Partial<AuditLog>;
      };
    };
  };
}
