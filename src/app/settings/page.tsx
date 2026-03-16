'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedPage } from '@/components/auth/protected-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import {
  getUserProfileByUid,
  isUsernameTaken,
  slugifyUsername,
  updateUserProfile,
} from '@/lib/firestore-users';
import type { UserProfile } from '@/lib/types';

const schema = z.object({
  displayName: z.string().min(2).max(50),
  bio: z.string().max(200).optional(),
  instagram: z.string().max(50).optional(),
  tiktok: z.string().max(50).optional(),
  website: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof schema>;

function SettingsForm() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', bio: '', instagram: '', tiktok: '', website: '' },
  });

  useEffect(() => {
    if (!user) return;
    getUserProfileByUid(user.uid).then((p) => {
      setProfile(p);
      setLoadingProfile(false);
      if (p) {
        form.reset({
          displayName: p.displayName,
          bio: p.bio ?? '',
          instagram: p.socialLinks?.instagram ?? '',
          tiktok: p.socialLinks?.tiktok ?? '',
          website: p.socialLinks?.website ?? '',
        });
      }
    });
  }, [user, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, {
        displayName: values.displayName,
        bio: values.bio || undefined,
        socialLinks: {
          instagram: values.instagram || undefined,
          tiktok: values.tiktok || undefined,
          website: values.website || undefined,
        },
      });
      toast({ title: 'Profile updated' });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        {profile && (
          <p className="text-sm text-muted-foreground mt-1">
            Your public profile is at{' '}
            <button
              type="button"
              onClick={() => router.push(`/${profile.username}`)}
              className="text-primary underline underline-offset-4"
            >
              /{profile.username}
            </button>
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>What visitors see on your public cookbook page</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A short bio about you and your cooking style…" rows={3} {...field} />
                    </FormControl>
                    <FormDescription>Max 200 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">@</span>
                          <Input className="pl-7" placeholder="username" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tiktok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">@</span>
                          <Input className="pl-7" placeholder="username" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yoursite.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Username — read-only for now */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Username</CardTitle>
            <CardDescription>Your unique URL handle. Contact support to change it.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span>@{profile.username}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedPage>
      <SettingsForm />
    </ProtectedPage>
  );
}
