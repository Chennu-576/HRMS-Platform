'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export function useRequireAuth() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    setAuthed(true);
  }, [user, loading, router]);

  return { user, profile, loading, authed };
}

export function useRequireRole(role: 'admin' | 'employee') {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (profile && profile.role !== role) {
      router.replace(profile.role === 'admin' ? '/admin' : '/employee');
      return;
    }
    setReady(true);
  }, [user, profile, loading, role, router]);

  return { user, profile, loading, ready };
}

export function AuthGuard({ children, role }: { children: React.ReactNode; role?: 'admin' | 'employee' }) {
  const { loading, ready } = useRequireRole(role || 'employee');

  if (loading || !ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }
  return <>{children}</>;
}
