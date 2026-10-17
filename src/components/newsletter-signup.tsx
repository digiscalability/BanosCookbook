'use client';

import { Loader2, Mail } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** "Ammi's recipe of the week" email sign-up (posts to /api/newsletter). */
export function NewsletterSignup({ className }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Could not sign you up');
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you up');
      setState('error');
    }
  };

  return (
    <section
      aria-labelledby="newsletter-heading"
      className={cn('rounded-lg border bg-secondary/40 p-5 sm:p-6', className)}
    >
      <h2
        id="newsletter-heading"
        className="flex items-center gap-2 font-headline text-xl font-bold"
      >
        <Mail className="h-5 w-5" /> Ammi&apos;s recipe of the week
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One recipe from her handwritten notebook in your inbox each week. Unsubscribe anytime.
      </p>
      {state === 'done' ? (
        <p role="status" className="mt-4 text-sm font-medium">
          Thank you. Ammi&apos;s next recipe is on its way.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
            id="newsletter-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="sm:flex-1"
          />
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign up
          </Button>
        </form>
      )}
      {state === 'error' && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
