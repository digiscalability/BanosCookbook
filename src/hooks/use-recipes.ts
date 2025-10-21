'use client';

import { useState, useEffect } from 'react';
import { recipeStore } from '@/lib/recipe-store';
import type { Recipe } from '@/lib/types';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(recipeStore.getAllRecipes());

  useEffect(() => {
    // Subscribe to recipe store changes
    const unsubscribe = recipeStore.subscribe(() => {
      setRecipes(recipeStore.getAllRecipes());
    });

    return unsubscribe;
  }, []);

  const addRecipe = (recipeData: {
    title: string;
    description: string;
    ingredients: string;
    instructions: string;
    prepTime: string;
    cookTime: string;
    servings: number;
    cuisine: string;
    author?: string;
    selectedImageUrl?: string;
  }) => {
    return recipeStore.addRecipe(recipeData);
  };

  const getRecipeById = (id: string) => {
    return recipeStore.getRecipeById(id);
  };

  const getRecipeCount = () => {
    return recipeStore.getRecipeCount();
  };

  return {
    recipes,
    addRecipe,
    getRecipeById,
    getRecipeCount,
  };
}
