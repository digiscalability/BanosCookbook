'use client';

import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getSavedRecipesAction } from '@/app/actions';
import RecipeCard from '@/components/recipe-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import type { Recipe } from '@/lib/types';

export default function SavedRecipesPage() {
  const { user, loading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    getSavedRecipesAction(user.uid).then(result => {
      if (result.success && result.recipes) setRecipes(result.recipes);
      setLoading(false);
    });
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Bookmark className="h-8 w-8 mx-auto animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <Bookmark className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold">Your Saved Recipes</h1>
        <p className="text-muted-foreground">Sign in to save recipes and access them anytime.</p>
        <Button asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="h-6 w-6 text-amber-500 fill-amber-500" />
        <h1 className="text-2xl font-bold">Saved Recipes</h1>
        {recipes.length > 0 && (
          <span className="text-sm text-muted-foreground">({recipes.length})</span>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No saved recipes yet.</p>
          <p className="text-sm text-muted-foreground">
            Browse recipes and tap the bookmark icon to save them here.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Browse Recipes</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
          {recipes.map((recipe, i) => (
            <RecipeCard key={recipe.id} recipe={recipe} priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
