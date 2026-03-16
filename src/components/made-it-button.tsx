'use client';

import { ChefHat } from 'lucide-react';
import { useState, useTransition } from 'react';

import { madeItAction } from '@/app/actions';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

import { Button } from './ui/button';

interface MadeItButtonProps {
  recipeId: string;
  initialMade?: boolean;
  initialCount?: number;
  className?: string;
}

export function MadeItButton({
  recipeId,
  initialMade = false,
  initialCount = 0,
  className,
}: MadeItButtonProps) {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [optimistic, setOptimistic] = useState<{ made: boolean; count: number }>(
    { made: initialMade, count: initialCount }
  );

  const handleToggle = () => {
    if (!user) {
      window.location.href = '/sign-in?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const next = {
      made: !optimistic.made,
      count: optimistic.made ? optimistic.count - 1 : optimistic.count + 1,
    };
    startTransition(async () => {
      setOptimistic(next);
      await madeItAction(recipeId, user.uid);
    });
  };

  return (
    <Button
      variant={optimistic.made ? 'default' : 'outline'}
      size="sm"
      onClick={(e) => { e.preventDefault(); handleToggle(); }}
      disabled={isPending}
      aria-label={optimistic.made ? 'You made this!' : 'Mark as made'}
      className={cn(
        'gap-1.5 transition-all',
        optimistic.made && 'bg-green-600 hover:bg-green-700 border-green-600 text-white',
        className
      )}
    >
      <ChefHat className="h-4 w-4" />
      {optimistic.made ? `Made it! (${optimistic.count})` : optimistic.count > 0 ? `Made it (${optimistic.count})` : 'Made it'}
    </Button>
  );
}
