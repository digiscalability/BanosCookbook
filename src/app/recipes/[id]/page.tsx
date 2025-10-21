import CommentSection from '@/components/comment-section';
import NutritionalInfo from '@/components/nutritional-info';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getRecipeById } from '@/lib/firestore-recipes';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle, ChefHat, Clock, Star, Users } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';

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

  const placeholder = PlaceHolderImages.find((p) => p.id === recipe.imageId);

  // Prefer recipe.imageUrl (generated/uploaded image) over imageId or placeholder
  const imageSrc = recipe.imageUrl || (recipe.imageId.startsWith('http') ? recipe.imageId : placeholder?.imageUrl) || '';
  const imageAlt = recipe.imageUrl ? `${recipe.title} - generated image` : (placeholder?.description || recipe.title);

  // Determine if we should use native img tag
  // Use native img for data URIs, signed URLs, or Firebase Storage URLs to avoid proxy issues
  const isDataUri = imageSrc.startsWith('data:');
  const isStorageUrl = imageSrc.includes('storage.googleapis.com') || imageSrc.includes('firebasestorage.googleapis.com');
  const isImageUrl = imageSrc.startsWith('http');
  const shouldUseImgTag = isDataUri || isStorageUrl || (process.env.NODE_ENV === 'development' && isImageUrl);

  const totalTime =
    parseInt(recipe.prepTime.split(' ')[0]) +
    parseInt(recipe.cookTime.split(' ')[0]);
  const ratingCount = recipe.ratingCount ?? 0;

  // Precompute the image element to keep JSX simple and avoid parser issues
  const imageElement = (isImageUrl || placeholder)
    ? shouldUseImgTag
      ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={imageAlt} className="w-full h-full object-cover absolute inset-0" />
      )
      : (
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
    : null;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 animate-in fade-in duration-500">
      <article>
        <header className="mb-6 sm:mb-8">
          <Badge variant="secondary" className="mb-2 capitalize text-xs sm:text-sm">
            {recipe.cuisine}
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-headline text-foreground mb-3 sm:mb-4 leading-tight">
            {recipe.title}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {recipe.description}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ChefHat className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>By {recipe.author}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Prep: {recipe.prepTime}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Cook: {recipe.cookTime}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Serves {recipe.servings}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Total: {totalTime} mins</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          <div className="lg:col-span-2">
            <div className="aspect-video relative overflow-hidden rounded-lg shadow-lg mb-6 sm:mb-8">
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
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold font-headline text-xs sm:text-sm">
                        {index + 1}
                      </div>
                      <p className="flex-1 pt-0.5 sm:pt-1 text-sm sm:text-base leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 sm:space-y-8 lg:sticky lg:top-24 h-fit">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-headline text-xl sm:text-2xl">Ingredients</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 sm:space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
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
