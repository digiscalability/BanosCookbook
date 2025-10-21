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
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 animate-in fade-in duration-500">
        <section className="text-center py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary mb-3 sm:mb-4">
            Banos Cookbook
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Loading recipes...
          </p>
        </section>
      </div>
    );
  }

  return <>{children(recipes, getRecipeCount)}</>;
}
