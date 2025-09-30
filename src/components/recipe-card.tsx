import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Recipe } from '@/lib/types';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';

type RecipeCardProps = {
  recipe: Recipe;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const placeholder = PlaceHolderImages.find((p) => p.id === recipe.imageId);

  return (
    <Link href={`/recipes/${recipe.id}`} className="group">
      <Card className="h-full flex flex-col transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="aspect-video relative overflow-hidden rounded-t-lg">
            {placeholder && (
              <Image
                src={placeholder.imageUrl}
                alt={placeholder.description}
                data-ai-hint={placeholder.imageHint}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4">
          <Badge variant="secondary" className="mb-2 capitalize">
            {recipe.cuisine}
          </Badge>
          <CardTitle className="text-lg font-headline leading-snug">
            {recipe.title}
          </CardTitle>
        </CardContent>
        <CardFooter className="p-4 flex justify-between items-center text-sm text-muted-foreground">
          <span>By {recipe.author}</span>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{recipe.rating.toFixed(1)}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
