'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Sparkles, FileText, Upload } from 'lucide-react';
import {
  extractRecipeDataFromImage,
  extractRecipeDataFromPdf,
} from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ExtractedRecipe } from '@/ai/flows/recipes-from-pdf';

const recipeFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters.'),
  ingredients: z.string().min(10, 'Please list at least one ingredient.'),
  instructions: z
    .string()
    .min(20, 'Instructions must be at least 20 characters.'),
  prepTime: z.string().min(1, 'Prep time is required.'),
  cookTime: z.string().min(1, 'Cook time is required.'),
  servings: z.coerce.number().min(1, 'Servings must be at least 1.'),
  cuisine: z.string().min(2, 'Cuisine is required.'),
  photo: z.any().optional(),
  pdf: z.any().optional(),
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export default function RecipeForm() {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPdfRecipes, setExtractedPdfRecipes] = useState<
    ExtractedRecipe[]
  >([]);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      title: '',
      description: '',
      ingredients: '',
      instructions: '',
      prepTime: '',
      cookTime: '',
      servings: 4,
      cuisine: '',
    },
  });

  function onSubmit(data: RecipeFormValues) {
    console.log(data);
    toast({
      title: 'Recipe Submitted!',
      description: 'Your recipe has been successfully submitted for review.',
    });
    form.reset();
  }

  const handleImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    toast({
      title: 'Reading your recipe...',
      description: 'The AI is analyzing the photo. This might take a moment.',
    });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const photoDataUri = reader.result as string;
      const result = await extractRecipeDataFromImage(photoDataUri);

      if (result.success && result.data) {
        const {
          title,
          description,
          ingredients,
          instructions,
          prepTime,
          cookTime,
          servings,
          cuisine,
        } = result.data;
        form.reset({
          title,
          description,
          ingredients,
          instructions,
          prepTime,
          cookTime,
          servings,
          cuisine,
        });
        toast({
          title: 'Recipe data extracted!',
          description: 'The form has been pre-filled. Please review and submit.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Oh no! Something went wrong.',
          description:
            result.error || 'Could not extract recipe data from the image.',
        });
      }
      setIsExtracting(false);
    };
    reader.onerror = error => {
      console.error('Error reading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error reading file',
        description: 'Could not read the selected image file.',
      });
      setIsExtracting(false);
    };
  };

  const handlePdfFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    toast({
      title: 'Reading your PDF...',
      description:
        'The AI is analyzing the file. This might take a few moments.',
    });

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const pdfDataUri = reader.result as string;
      const result = await extractRecipeDataFromPdf(pdfDataUri);

      if (result.success && result.data?.recipes) {
        if (result.data.recipes.length > 0) {
          setExtractedPdfRecipes(result.data.recipes);
          setIsPdfDialogOpen(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'No Recipes Found',
            description: 'The AI could not find any recipes in this PDF.',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Oh no! Something went wrong.',
          description: result.error || 'Could not extract recipes from the PDF.',
        });
      }

      setIsExtracting(false);
    };
    reader.onerror = error => {
      console.error('Error reading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error reading file',
        description: 'Could not read the selected PDF file.',
      });
      setIsExtracting(false);
    };
  };

  const handleSelectPdfRecipe = (recipe: ExtractedRecipe) => {
    form.reset({
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      cuisine: recipe.cuisine,
    });
    setIsPdfDialogOpen(false);
    toast({
      title: 'Recipe data populated!',
      description: 'The form has been pre-filled. Please review and submit.',
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Photo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="file"
                          id="photo-upload"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          disabled={isExtracting}
                          className="hidden"
                        />
                         <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <Loader2 className="mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2" />
                          )}
                          {isExtracting ? 'Reading...' : 'Auto-fill from Photo'}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a photo of one handwritten recipe.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pdf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe PDF</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="file"
                          id="pdf-upload"
                          accept="application/pdf"
                          onChange={handlePdfFileChange}
                          disabled={isExtracting}
                          className="hidden"
                        />
                         <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById('pdf-upload')?.click()}
                          disabled={isExtracting}
                        >
                          {isExtracting ? (
                            <Loader2 className="mr-2 animate-spin" />
                          ) : (
                            <FileText className="mr-2" />
                          )}
                          {isExtracting ? 'Reading...' : 'Auto-fill from PDF'}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a PDF with one or more recipes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grandma's Apple Pie" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short and sweet story about your recipe..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="ingredients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingredients</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List each ingredient on a new line."
                        rows={10}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      One ingredient per line for best results.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Step-by-step instructions. One step per line."
                        rows={10}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      One step per line for a numbered list.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <FormField
                control={form.control}
                name="prepTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prep Time</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 20 mins" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cookTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cook Time</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 45 mins" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="servings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servings</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuisine</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Italian" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" size="lg" disabled={isExtracting}>
              Submit Recipe
            </Button>
          </form>
        </Form>
      </CardContent>
      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recipes Found in PDF</DialogTitle>
            <DialogDescription>
              We found {extractedPdfRecipes.length} recipes in your PDF. Select
              one to fill the form.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
            {extractedPdfRecipes.map((recipe, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{recipe.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {recipe.description}
                  </p>
                  <Button
                    variant="link"
                    className="p-0 h-auto mt-2"
                    onClick={() => handleSelectPdfRecipe(recipe)}
                  >
                    Use this recipe
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
