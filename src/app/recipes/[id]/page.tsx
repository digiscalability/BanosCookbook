import { CheckCircle, ChefHat, Clock, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import CommentSection from '@/components/comment-section';
import NutritionalInfo from '@/components/nutritional-info';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getRecipeById } from '@/lib/firestore-recipes';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type RecipePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipe = await getRecipeById(id);

  if (!recipe) {
    notFound();
  }

  const placeholder = PlaceHolderImages.find(p => p.id === recipe.imageId);

  // Prefer recipe.imageUrl (generated/uploaded image) over imageId or placeholder
  const imageSrc =
    recipe.imageUrl ||
    (recipe.imageId.startsWith('http') ? recipe.imageId : placeholder?.imageUrl) ||
    '';
  const imageAlt = recipe.imageUrl
    ? `${recipe.title} - generated image`
    : placeholder?.description || recipe.title;

  // Determine if we should use native img tag
  // Use native img for data URIs, signed URLs, or Firebase Storage URLs to avoid proxy issues
  const isDataUri = imageSrc.startsWith('data:');
  const isStorageUrl =
    imageSrc.includes('storage.googleapis.com') ||
    imageSrc.includes('firebasestorage.googleapis.com');
  const isImageUrl = imageSrc.startsWith('http');
  const shouldUseImgTag =
    isDataUri || isStorageUrl || (process.env.NODE_ENV === 'development' && isImageUrl);

  const totalTime =
    parseInt(recipe.prepTime.split(' ')[0]) + parseInt(recipe.cookTime.split(' ')[0]);
  const ratingCount = recipe.ratingCount ?? 0;

  // Precompute the image element to keep JSX simple and avoid parser issues
  const imageElement =
    isImageUrl || placeholder ? (
      shouldUseImgTag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Image
          src={imageSrc}
          alt={imageAlt}
          data-ai-hint={placeholder?.imageHint}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 50vw"
          className="object-cover"
          priority={true}
        />
      )
    ) : null;

  return (
    <div className="container mx-auto px-3 py-6 duration-500 animate-in fade-in sm:px-4 sm:py-8 lg:py-12">
      <article>
        <header className="mb-6 sm:mb-8">
          <Badge variant="secondary" className="mb-2 text-xs capitalize sm:text-sm">
            {recipe.cuisine}
          </Badge>
          <h1 className="mb-3 font-headline text-2xl font-bold leading-tight text-foreground sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
            {recipe.title}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg">
            {recipe.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:mt-4 sm:gap-x-6 sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>By {recipe.author}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Prep: {recipe.prepTime}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Cook: {recipe.cookTime}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Serves {recipe.servings}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Total: {totalTime} mins</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500 sm:h-4 sm:w-4" />
              {ratingCount > 0 ? (
                <span>
                  {recipe.rating.toFixed(1)} ({ratingCount})
                </span>
              ) : (
                <span>Not yet rated</span>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            <div className="relative mb-6 aspect-video overflow-hidden rounded-lg shadow-lg sm:mb-8">
              {imageElement}
            </div>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-headline text-xl sm:text-2xl">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 sm:space-y-6">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex gap-3 sm:gap-4">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary font-headline text-xs font-bold text-primary-foreground sm:h-8 sm:w-8 sm:text-sm">
                        {index + 1}
                      </div>
                      <p className="flex-1 pt-0.5 text-sm leading-relaxed sm:pt-1 sm:text-base">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <aside className="h-fit space-y-6 sm:space-y-8 lg:sticky lg:top-24">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-headline text-xl sm:text-2xl">Ingredients</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 sm:space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex gap-2 sm:gap-3">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <NutritionalInfo ingredients={recipe.ingredients} />
          </aside>
        </div>
      </article>

      <Separator className="my-8 sm:my-12" />

      <CommentSection
        recipeId={recipe.id}
        comments={recipe.comments}
        initialRating={recipe.rating}
        initialRatingCount={ratingCount}
      />
    </div>
  );
}
