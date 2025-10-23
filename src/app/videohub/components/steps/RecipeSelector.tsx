'use client';

import { useEffect, useState } from 'react';

import { StepWrapper } from '../shared/StepWrapper';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAllRecipes } from '@/lib/firestore-recipes';
import type { Recipe } from '@/lib/types';

import { useVideoHub } from '../../context/VideoHubProvider';

export function RecipeSelector() {
  const { state, selectRecipe } = useVideoHub();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadRecipes() {
      try {
        setLoading(true);
        const allRecipes = await getAllRecipes();
        setRecipes(allRecipes);
      } catch (error) {
        console.error('Failed to load recipes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRecipes();
  }, []);

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectRecipe = (recipe: Recipe) => {
    selectRecipe(recipe);
  };

  return (
    <StepWrapper
      stepNumber={1}
      title="Select a Recipe"
      description="Choose a recipe to create a video for"
      showNext={!!state.selectedRecipe}
      nextLabel="Continue to Script"
      nextDisabled={!state.selectedRecipe}
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <Input
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full"
        />

        {/* Recipes Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-gray-500">Loading recipes...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-gray-500">
              {recipes.length === 0 ? 'No recipes found. Create one first!' : 'No recipes match your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredRecipes.map(recipe => (
              <Card
                key={recipe.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  state.selectedRecipe?.id === recipe.id
                    ? 'ring-2 ring-green-500 shadow-md'
                    : ''
                }`}
                onClick={() => handleSelectRecipe(recipe)}
              >
                <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-200">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-100 to-green-200">
                      <span className="text-4xl">🍳</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="truncate font-semibold text-gray-900">{recipe.title}</h3>
                  <p className="line-clamp-2 text-sm text-gray-600">{recipe.description}</p>
                  <div className="mt-2 flex gap-1 text-xs text-gray-500">
                    <span>{recipe.cuisine}</span>
                    <span>•</span>
                    <span>{recipe.servings} servings</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
