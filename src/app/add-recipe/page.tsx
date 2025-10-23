import RecipeForm from '@/components/recipe-form';

export default function AddRecipePage() {
  return (
    <div className="container mx-auto max-w-3xl px-3 py-6 duration-500 animate-in fade-in sm:px-4 sm:py-8 lg:py-12">
      <header className="mb-6 text-center sm:mb-8">
        <h1 className="font-headline text-2xl font-bold sm:text-3xl lg:text-4xl">
          Share a Family Recipe
        </h1>
        <p className="mt-2 px-4 text-sm text-muted-foreground sm:text-base">
          Add a new recipe to the cookbook. Fill in the details below.
        </p>
      </header>
      <RecipeForm />
    </div>
  );
}
