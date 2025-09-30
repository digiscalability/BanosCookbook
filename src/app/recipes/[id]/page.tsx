import { notFound } from 'next/navigation';
import Image from 'next/image';
import { recipes } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, ChefHat, CheckCircle } from 'lucide-react';
import NutritionalInfo from '@/components/nutritional-info';
import CommentSection from '@/components/comment-section';

type RecipePageProps = {
  params: {
    id: string;
  };
};

export default function RecipePage({ params }: RecipePageProps) {
  const recipe = recipes.find((r) => r.id === params.id);

  if (!recipe) {
    notFound();
  }

  const placeholder = PlaceHolderImages.find((p) => p.id === recipe.imageId);
  const totalTime =
    parseInt(recipe.prepTime.split(' ')[0]) +
    parseInt(recipe.cookTime.split(' ')[0]);

  return (
    <div className="container mx-auto px-4 py-12 animate-in fade-in duration-500">
      <article>
        <header className="mb-8">
          <Badge variant="secondary" className="mb-2 capitalize">
            {recipe.cuisine}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-4">
            {recipe.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {recipe.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              <span>By {recipe.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Prep: {recipe.prepTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Cook: {recipe.cookTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Serves {recipe.servings}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <div className="aspect-video relative overflow-hidden rounded-lg shadow-lg mb-8">
              {placeholder && (
                <Image
                  src={placeholder.imageUrl}
                  alt={placeholder.description}
                  data-ai-hint={placeholder.imageHint}
                  fill
                  className="object-cover"
                />
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-6">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold font-headline">
                        {index + 1}
                      </div>
                      <p className="flex-1 pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-8 lg:sticky lg:top-24 h-fit">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Ingredients</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <NutritionalInfo ingredients={recipe.ingredients} />
          </aside>
        </div>
      </article>

      <Separator className="my-12" />

      <CommentSection recipeId={recipe.id} comments={recipe.comments} />
    </div>
  );
}
