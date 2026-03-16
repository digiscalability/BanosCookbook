'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CookingPot } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import {
  createUserProfile,
  findAvailableUsername,
  getUserProfileByUid,
  isUsernameTaken,
  slugifyUsername,
} from '@/lib/firestore-users';

const schema = z
  .object({
    displayName: z.string().min(2, 'Name must be at least 2 characters').max(50),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30)
      .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const redirect = searchParams?.get('redirect') ?? '/';

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const handleUsernameBlur = async () => {
    const raw = form.getValues('username');
    if (!raw || raw.length < 3) return;
    setCheckingUsername(true);
    try {
      const taken = await isUsernameTaken(slugifyUsername(raw));
      if (taken) form.setError('username', { message: 'Username is already taken' });
    } finally {
      setCheckingUsername(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const username = slugifyUsername(values.username);
    const taken = await isUsernameTaken(username);
    if (taken) {
      form.setError('username', { message: 'Username is already taken' });
      return;
    }
    try {
      await signUp(values.email, values.password, values.displayName);
      // At this point Firebase has created the auth user; get UID from auth
      const { auth } = await import('@/lib/firebase');
      const uid = auth.currentUser?.uid;
      if (uid) {
        await createUserProfile(uid, {
          username,
          displayName: values.displayName,
          email: values.email,
        });
      }
      router.push(redirect);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      toast({ title: 'Sign up failed', description: friendlyAuthError(message), variant: 'destructive' });
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      const existing = await getUserProfileByUid(user.uid);
      if (!existing) {
        const username = await findAvailableUsername(user.displayName ?? user.email ?? 'chef');
        await createUserProfile(user.uid, {
          username,
          displayName: user.displayName ?? 'Chef',
          email: user.email ?? '',
          photoURL: user.photoURL ?? undefined,
        });
      }
      router.push(redirect);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign in failed';
      toast({ title: 'Google sign in failed', description: message, variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-2 flex justify-center">
          <CookingPot className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create your cookbook</CardTitle>
        <CardDescription>Start preserving and sharing your recipes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={googleLoading || form.formState.isSubmitting}
        >
          {googleLoading ? (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input placeholder="Maria Banos" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                        @
                      </span>
                      <Input
                        className="pl-7"
                        placeholder="chef_maria"
                        autoComplete="username"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        onBlur={handleUsernameBlur}
                      />
                      {checkingUsername && (
                        <span className="absolute inset-y-0 right-3 flex items-center">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting || googleLoading}
            >
              {form.formState.isSubmitting ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href={`/sign-in?redirect=${encodeURIComponent(redirect)}`} className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function friendlyAuthError(msg: string): string {
  if (msg.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (msg.includes('weak-password')) return 'Password is too weak. Use at least 6 characters.';
  if (msg.includes('network')) return 'Network error. Check your connection.';
  return msg;
}
