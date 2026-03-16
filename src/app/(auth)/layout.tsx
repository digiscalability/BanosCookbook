import type { ReactNode } from 'react';

/** Minimal layout for auth pages — no header/footer chrome needed. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {children}
    </div>
  );
}
