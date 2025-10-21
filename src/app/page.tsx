
'use client';
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
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

function HomeContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const { recipes, loading, error, getRecipeCount } = useFirestoreRecipes();

  const normalizeCuisine = (value: string | null | undefined) => (typeof value === 'string' ? value.trim() : '');

  const filteredRecipes = recipes
    .filter((recipe) =>
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((recipe) =>
      filter === 'all' ? true : normalizeCuisine(recipe.cuisine) === filter
    );

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

  if (error) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 animate-in fade-in duration-500">
        <section className="text-center py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary mb-3 sm:mb-4">
            Banos Cookbook
          </h1>
          <p className="text-base sm:text-lg text-destructive max-w-2xl mx-auto px-4">
            Error loading recipes: {error}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 animate-in fade-in duration-500">
      <section className="text-center py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary mb-3 sm:mb-4">
          Banos Cookbook
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Preserving and sharing our most cherished family recipes, from our kitchen to yours.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {getRecipeCount()} recipes in the collection
        </p>
      </section>

      {/* Search and Filter */}
      <section className="mb-8 sm:mb-12">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for recipes..."
              className="pl-9 sm:pl-10 w-full h-10 sm:h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11">
              <SelectValue placeholder="Filter by cuisine" />
            </SelectTrigger>
            <SelectContent>
              {cuisines.map((cuisine) => (
                <SelectItem key={cuisine} value={cuisine} className="capitalize">
                  {cuisine === 'all' ? 'All Cuisines' : cuisine}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {filteredRecipes.map((recipe: Recipe, index) => {
            const isPriority = index < 4; // Priority for first 4 images (above the fold)
            return (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                priority={isPriority}
              />
            );
          })}
        </div>
        {filteredRecipes.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <p className="text-muted-foreground text-base sm:text-lg px-4">
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
