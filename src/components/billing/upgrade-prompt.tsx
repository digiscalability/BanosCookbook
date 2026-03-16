'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import type { CreditTier } from '@/lib/firestore-credits';

interface UpgradePromptProps {
  tier: CreditTier;
  remaining: number;
  onDismiss?: () => void;
}

export function UpgradePrompt({ tier, remaining: _remaining, onDismiss }: UpgradePromptProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<'creator' | 'pro' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const description =
    tier === 'free'
      ? "You've used your 2 free videos this month. Upgrade to keep creating!"
      : tier === 'creator'
      ? "You've used all 15 videos this month. Upgrade to Pro for unlimited videos!"
      : "You've reached your video limit.";

  const handleUpgrade = async (targetTier: 'creator' | 'pro') => {
    if (!user) {
      window.location.href = '/sign-up';
      return;
    }
    setLoading(targetTier);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: targetTier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <CardTitle className="text-base text-amber-900">Video limit reached</CardTitle>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-600 hover:text-amber-900 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-amber-800">{description}</p>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </CardContent>
      <CardFooter className="flex gap-2 flex-wrap pt-0">
        {tier === 'free' && (
          <Button
            size="sm"
            onClick={() => handleUpgrade('creator')}
            disabled={loading !== null}
          >
            {loading === 'creator' ? 'Redirecting…' : 'Upgrade to Creator ($19/mo)'}
          </Button>
        )}
        <Button
          size="sm"
          variant={tier === 'free' ? 'outline' : 'default'}
          onClick={() => handleUpgrade('pro')}
          disabled={loading !== null}
        >
          {loading === 'pro' ? 'Redirecting…' : 'Upgrade to Pro ($49/mo)'}
        </Button>
      </CardFooter>
    </Card>
  );
}
