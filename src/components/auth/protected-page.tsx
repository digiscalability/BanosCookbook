'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth-context';

interface ProtectedPageProps {
  children: ReactNode;
  /** Where to redirect after sign-in. Defaults to current path. */
  redirectTo?: string;
}

/**
 * Wraps a page that requires authentication.
 * Redirects to /sign-in with a ?redirect= param if the user isn't signed in.
 * Shows nothing while auth state is loading to avoid flash.
 */
export function ProtectedPage({ children, redirectTo }: ProtectedPageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const dest = redirectTo ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
      router.replace(`/sign-in?redirect=${encodeURIComponent(dest)}`);
    }
  }, [user, loading, router, redirectTo]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
