'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Building2, Eye, EyeOff, MailCheck, ArrowRight, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { signupSchema, type SignupValues } from '@/lib/validation/schemas';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupValues) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name },
        },
      });
      if (error) throw error;

      if (data.user) {
        setRegisteredEmail(values.email);
        setEmailSent(true);
        toast.success('Account created! Check your email for a confirmation link.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const resendEmail = async () => {
    if (!registeredEmail) return;
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      });
      if (error) throw error;
      toast.success('Confirmation email resent.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend email');
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {emailSent ? (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 ring-1 ring-blue-100">
              <MailCheck className="h-8 w-8 text-blue-600" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Check your email</h1>
            <p className="mt-2 text-sm text-slate-500">
              We&apos;ve sent a confirmation link to{' '}
              <span className="font-semibold text-slate-700">{registeredEmail}</span>.
              Click the link in the email to verify your account, then sign in.
            </p>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">Didn&apos;t receive the email?</p>
                  <p className="text-xs text-slate-500">Check your spam folder, or resend the confirmation email.</p>
                </div>
              </div>
              <button
                onClick={resendEmail}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Resend confirmation email
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <Button onClick={() => router.push('/login')} className="w-full gap-2">
                Go to sign in <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setEmailSent(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Use a different email
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="signup-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900">HRMS</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Get started with the HR portal in minutes.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" placeholder="John Doe" {...register('full_name')} />
                {errors.full_name && <p className="text-xs text-rose-500">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
                {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
                After registration, you&apos;ll receive a confirmation email. Click the link in the email to verify your account, then sign in.
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
