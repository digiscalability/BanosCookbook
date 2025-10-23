'use server';

/**
 * @fileOverview A flow to generate recipe details from an image of a handwritten recipe.
 *
 * - extractRecipeFromImage - A function that extracts recipe information from an image.
 * - RecipeFromImageInput - The input type for the extractRecipeFromImage function.
 * - RecipeFromImageOutput - The return type for the extractRecipeFromImage function.
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const RecipeFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a handwritten recipe, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RecipeFromImageInput = z.infer<typeof RecipeFromImageInputSchema>;

const RecipeFromImageOutputSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  description: z.string().describe('A brief description of the recipe.'),
  ingredients: z.string().describe('The list of ingredients, with each ingredient on a new line.'),
  instructions: z.string().describe('The cooking instructions, with each step on a new line.'),
  prepTime: z.string().describe("The preparation time, e.g., '20 mins'."),
  cookTime: z.string().describe("The cooking time, e.g., '45 mins'."),
  servings: z.coerce.number().describe('The number of servings.'),
  cuisine: z.string().describe("The cuisine type, e.g., 'Italian'."),
});
export type RecipeFromImageOutput = z.infer<typeof RecipeFromImageOutputSchema>;

export async function extractRecipeFromImage(
  input: RecipeFromImageInput
): Promise<RecipeFromImageOutput> {
  return recipeFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recipeFromImagePrompt',
  input: { schema: RecipeFromImageInputSchema },
  output: { schema: RecipeFromImageOutputSchema },
  prompt: `You are an expert recipe transcriber. Analyze the provided image of a handwritten recipe and extract the following information:
- Recipe Title
- A short description of the dish
- Ingredients (list each one on a new line)
- Instructions (list each step on a new line)
- Preparation time
- Cooking time
- Number of servings
- Cuisine type

If any information is not present, make a reasonable guess or leave it blank. Be as accurate as possible.

Recipe Photo: {{media url=photoDataUri}}
`,
});

const recipeFromImageFlow = ai.defineFlow(
  {
    name: 'recipeFromImageFlow',
    inputSchema: RecipeFromImageInputSchema,
    outputSchema: RecipeFromImageOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to extract recipe from image');
    }
    return output;
  }
);
