import RecipeForm from '@/components/recipe-form';

export default function AddRecipePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl animate-in fade-in duration-500">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Share a Family Recipe</h1>
        <p className="text-muted-foreground mt-2">
          Add a new recipe to the cookbook. Fill in the details below.
        </p>
      </header>
      <RecipeForm />
    </div>
  );
}
