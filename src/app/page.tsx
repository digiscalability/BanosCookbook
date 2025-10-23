'use client';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import RecipeCard from '@/components/recipe-card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestoreRecipes } from '@/hooks/use-firestore-recipes';
import type { Recipe } from '@/lib/types';

function HomeContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const { recipes, loading, error, getRecipeCount } = useFirestoreRecipes();

  const normalizeCuisine = (value: string | null | undefined) =>
    typeof value === 'string' ? value.trim() : '';

  const filteredRecipes = recipes
    .filter(recipe => recipe.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(recipe => (filter === 'all' ? true : normalizeCuisine(recipe.cuisine) === filter));

  const cuisines = useMemo(() => {
    const unique = new Set<string>();
    for (const recipe of recipes) {
      if (!recipe) continue;
      const value = normalizeCuisine(recipe.cuisine);
      if (value) unique.add(value);
    }
    return ['all', ...Array.from(unique)];
  }, [recipes]);

  if (loading) {
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

  if (error) {
    return (
      <div className="container mx-auto px-3 py-6 duration-500 animate-in fade-in sm:px-4 sm:py-8">
        <section className="py-8 text-center sm:py-12">
          <h1 className="mb-3 font-headline text-3xl font-bold text-primary sm:mb-4 sm:text-4xl md:text-5xl">
            Banos Cookbook
          </h1>
          <p className="mx-auto max-w-2xl px-4 text-base text-destructive sm:text-lg">
            Error loading recipes: {error}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-6 duration-500 animate-in fade-in sm:px-4 sm:py-8">
      <section className="py-8 text-center sm:py-12">
        <h1 className="mb-3 font-headline text-3xl font-bold text-primary sm:mb-4 sm:text-4xl md:text-5xl">
          Banos Cookbook
        </h1>
        <p className="mx-auto max-w-2xl px-4 text-base text-muted-foreground sm:text-lg">
          Preserving and sharing our most cherished family recipes, from our kitchen to yours.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {getRecipeCount()} recipes in the collection
        </p>
      </section>

      {/* Search and Filter */}
      <section className="mb-8 sm:mb-12">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:h-5 sm:w-5" />
            <Input
              type="search"
              placeholder="Search for recipes..."
              className="h-10 w-full pl-9 sm:h-11 sm:pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-10 w-full sm:h-11 sm:w-[180px]">
              <SelectValue placeholder="Filter by cuisine" />
            </SelectTrigger>
            <SelectContent>
              {cuisines.map(cuisine => (
                <SelectItem key={cuisine} value={cuisine} className="capitalize">
                  {cuisine === 'all' ? 'All Cuisines' : cuisine}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
          {filteredRecipes.map((recipe: Recipe, index) => {
            const isPriority = index < 4; // Priority for first 4 images (above the fold)
            return <RecipeCard key={recipe.id} recipe={recipe} priority={isPriority} />;
          })}
        </div>
        {filteredRecipes.length === 0 && (
          <div className="py-12 text-center sm:py-16">
            <p className="px-4 text-base text-muted-foreground sm:text-lg">
              No recipes found. Try a different search or filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
