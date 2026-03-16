'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface PricingUpgradeButtonsProps {
  tier: 'creator' | 'pro';
  label: string;
}

export function PricingUpgradeButtons({ tier, label }: PricingUpgradeButtonsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!user) {
      window.location.href = '/sign-up';
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
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
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <Button
        className="w-full"
        onClick={handleUpgrade}
        disabled={loading}
      >
        {loading ? 'Redirecting…' : label}
      </Button>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
