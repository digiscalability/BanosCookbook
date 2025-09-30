'use client';

import { useState } from 'react';
import { recipes } from '@/lib/data';
import RecipeCard from '@/components/recipe-card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredRecipes = recipes
    .filter((recipe) =>
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((recipe) =>
      filter === 'all' ? true : recipe.cuisine === filter
    );

  const cuisines = ['all', ...Array.from(new Set(recipes.map((r) => r.cuisine)))];

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-4">
          Family Cookbook Hub
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Preserving and sharing our most cherished family recipes, from our kitchen to yours.
        </p>
      </section>

      <section className="mb-12">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for recipes..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
        {filteredRecipes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No recipes found. Try a different search or filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
