import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const onboardingSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(4, 'Phone is required'),
  department_id: z.string().uuid('Select a department'),
  job_title: z.string().min(2, 'Job title is required'),
  employee_code: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(4, 'Phone is required'),
  job_title: z.string().min(1, 'Job title is required'),
  department_id: z.string().uuid().nullable(),
  employee_code: z.string().optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(2, 'Department name is required'),
  description: z.string().optional(),
  head_id: z.string().uuid().nullable().optional(),
});

export const holidaySchema = z.object({
  name: z.string().min(2, 'Holiday name is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['public', 'company']),
  description: z.string().optional(),
});

export const leaveRequestSchema = z
  .object({
    leave_type_id: z.string().uuid('Select a leave type'),
    from_date: z.string().min(1, 'Start date is required'),
    to_date: z.string().min(1, 'End date is required'),
    reason: z.string().min(3, 'Please provide a reason'),
  })
  .refine((data) => new Date(data.from_date) <= new Date(data.to_date), {
    message: 'End date must be after or equal to start date',
    path: ['to_date'],
  });

export const announcementSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  body: z.string().min(5, 'Body is required'),
});

export const employeeCreateSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  department_id: z.string().uuid().nullable().optional(),
  job_title: z.string().optional(),
  role: z.enum(['admin', 'employee']),
  employee_code: z.string().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;
export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;
export type DepartmentValues = z.infer<typeof departmentSchema>;
export type HolidayValues = z.infer<typeof holidaySchema>;
export type LeaveRequestValues = z.infer<typeof leaveRequestSchema>;
export type AnnouncementValues = z.infer<typeof announcementSchema>;
export type EmployeeCreateValues = z.infer<typeof employeeCreateSchema>;
