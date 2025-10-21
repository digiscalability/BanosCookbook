'use client';

import {
    createRecipe as apiCreateRecipe,
    deleteRecipe as apiDeleteRecipe,
    getRecipeById as apiGetRecipeById,
    updateRecipe as apiUpdateRecipe,
    getAllRecipes,
    type CreateRecipeData,
    type UpdateRecipeData,
} from '@/lib/firestore-recipes';
import type { Recipe } from '@/lib/types';
import { useEffect, useState } from 'react';

export function useFirestoreRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recipes from Firestore
  const loadRecipes = async (): Promise<Recipe[]> => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading recipes from Firestore...');
  const apiRecipes = await getAllRecipes();
  console.log('Loaded recipes:', apiRecipes.length);
  setRecipes(apiRecipes);
  return apiRecipes;
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load recipes on component mount
  useEffect(() => {
    loadRecipes();
  }, []);

  // Add a new recipe
  const addRecipe = async (recipeData: {
    title: string;
    description: string;
    ingredients: string;
    instructions: string;
    prepTime: string;
    cookTime: string;
    servings: number;
    cuisine: string;
    author: string;
    authorEmail?: string;
    selectedImageUrl?: string;
    postToInstagram?: boolean;
  }) => {
    try {
      setError(null);

      const createData: CreateRecipeData = {
        title: recipeData.title,
        description: recipeData.description,
        author: recipeData.author,
        authorEmail: recipeData.authorEmail,
        ingredients: recipeData.ingredients.split('\n').filter(ingredient => ingredient.trim()),
        instructions: recipeData.instructions.split('\n').filter(instruction => instruction.trim()),
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        cuisine: recipeData.cuisine,
        // Keep imageId for legacy compatibility (random placeholder ID)
        imageId: Math.floor(Math.random() * 10 + 1).toString(),
        // Store the actual generated image URL in imageUrl field
        imageUrl: recipeData.selectedImageUrl,
        postToInstagram: recipeData.postToInstagram,
        rating: 0,
        ratingCount: 0,
        comments: [],
      };

      const createdRecipe = await apiCreateRecipe(createData);
      setRecipes((prev) => [createdRecipe, ...prev]);
      return createdRecipe;
    } catch (err) {
      console.error('Error adding recipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to add recipe');
      throw err;
    }
  };

  // Get recipe by ID
  const getRecipeById = async (id: string): Promise<Recipe | null> => {
    try {
      setError(null);
      return await apiGetRecipeById(id);
    } catch (err) {
      console.error('Error getting recipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to get recipe');
      return null;
    }
  };

  // Update a recipe
  const updateRecipe = async (id: string, updates: Partial<CreateRecipeData>) => {
    try {
      setError(null);
      const payload: UpdateRecipeData = { ...updates };
      const updatedRecipe = await apiUpdateRecipe(id, payload);
      if (updatedRecipe) {
        setRecipes((prev) => prev.map((recipe) => (recipe.id === id ? updatedRecipe : recipe)));
      } else {
        await loadRecipes();
      }
    } catch (err) {
      console.error('Error updating recipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
      throw err;
    }
  };

  // Delete a recipe
  const deleteRecipe = async (id: string) => {
    try {
      setError(null);
      await apiDeleteRecipe(id);
      setRecipes((prev) => prev.filter((recipe) => recipe.id !== id));
    } catch (err) {
      console.error('Error deleting recipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      throw err;
    }
  };

  // Get recipe count
  const getRecipeCount = () => {
    return recipes.length;
  };

  // Refresh recipes
  const refreshRecipes = () => loadRecipes();

  return {
    recipes,
    loading,
    error,
    addRecipe,
    getRecipeById,
    updateRecipe,
    deleteRecipe,
    getRecipeCount,
    refreshRecipes,
  };
}
