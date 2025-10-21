import RecipeForm from '@/components/recipe-form';

export default function AddRecipePage() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 lg:py-12 max-w-3xl animate-in fade-in duration-500">
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-headline">Share a Family Recipe</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 px-4">
          Add a new recipe to the cookbook. Fill in the details below.
        </p>
      </header>
      <RecipeForm />
    </div>
  );
}
