'use client';

import { Bookmark } from 'lucide-react';
import { useOptimistic, useTransition } from 'react';

import { saveRecipeAction } from '@/app/actions';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

import { Button } from './ui/button';

interface SaveButtonProps {
  recipeId: string;
  initialSaved?: boolean;
  initialCount?: number;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function SaveButton({
  recipeId,
  initialSaved = false,
  initialCount = 0,
  className,
  showCount = false,
  size = 'sm',
}: SaveButtonProps) {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [optimistic, setOptimistic] = useOptimistic<{ saved: boolean; count: number }>(
    { saved: initialSaved, count: initialCount },
    (_state, next: { saved: boolean; count: number }) => next
  );

  const handleToggle = () => {
    if (!user) {
      window.location.href = '/sign-in?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const next = {
      saved: !optimistic.saved,
      count: optimistic.saved ? optimistic.count - 1 : optimistic.count + 1,
    };
    startTransition(async () => {
      setOptimistic(next);
      await saveRecipeAction(recipeId, user.uid);
    });
  };

  return (
    <Button
      variant={optimistic.saved ? 'default' : 'outline'}
      size={size}
      onClick={(e) => { e.preventDefault(); handleToggle(); }}
      disabled={isPending}
      aria-label={optimistic.saved ? 'Unsave recipe' : 'Save recipe'}
      className={cn(
        'gap-1.5 transition-all',
        optimistic.saved && 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white',
        className
      )}
    >
      <Bookmark
        className={cn('h-4 w-4', optimistic.saved && 'fill-current')}
      />
      {showCount && optimistic.count > 0 && (
        <span className="text-xs">{optimistic.count}</span>
      )}
      {size !== 'icon' && (optimistic.saved ? 'Saved' : 'Save')}
    </Button>
  );
}
