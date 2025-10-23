'use client';

import { useEffect, useState } from 'react';

import { recipeStore } from '@/lib/recipe-store';
import type { Recipe } from '@/lib/types';

interface ClientRecipeProviderProps {
  children: (recipes: Recipe[], getRecipeCount: () => number) => React.ReactNode;
}

export function ClientRecipeProvider({ children }: ClientRecipeProviderProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Subscribe to recipe store changes
    const unsubscribe = recipeStore.subscribe(() => {
      setRecipes(recipeStore.getAllRecipes());
    });

    // Initial load
    setRecipes(recipeStore.getAllRecipes());

    return unsubscribe;
  }, []);

  const getRecipeCount = () => {
    return recipeStore.getRecipeCount();
  };

  // Don't render until we're on the client side
  if (!isClient) {
    return (
      <div className="container mx-auto px-3 py-6 duration-500 animate-in fade-in sm:px-4 sm:py-8">
        <section className="py-8 text-center sm:py-12">
          <h1 className="mb-3 font-headline text-3xl font-bold text-primary sm:mb-4 sm:text-4xl md:text-5xl">
            Banos Cookbook
          </h1>
          <p className="mx-auto max-w-2xl px-4 text-base text-muted-foreground sm:text-lg">
            Loading recipes...
          </p>
        </section>
      </div>
    );
  }

  return <>{children(recipes, getRecipeCount)}</>;
}
