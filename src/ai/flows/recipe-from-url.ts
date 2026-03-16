'use server';

/**
 * @fileOverview A Genkit flow that fetches and parses a recipe from a given URL.
 *
 * - recipeFromUrl - The flow function
 * - RecipeFromUrlInput - Input type
 * - RecipeFromUrlOutput - Output type
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';

const RecipeFromUrlInputSchema = z.object({
  url: z.string().url().describe('The URL of the recipe page to parse.'),
});
export type RecipeFromUrlInput = z.infer<typeof RecipeFromUrlInputSchema>;

const RecipeFromUrlOutputSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  description: z.string().describe('A brief description of the recipe.'),
  ingredients: z.string().describe('The list of ingredients, each on a new line.'),
  instructions: z.string().describe('The cooking instructions, each step on a new line.'),
  prepTime: z.string().describe("The preparation time, e.g., '20 mins'."),
  cookTime: z.string().describe("The cooking time, e.g., '45 mins'."),
  servings: z.coerce.number().describe('The number of servings.'),
  cuisine: z.string().describe("The cuisine type, e.g., 'Italian'."),
  imageUrl: z.string().optional().describe('The main image URL of the recipe, if found.'),
});
export type RecipeFromUrlOutput = z.infer<typeof RecipeFromUrlOutputSchema>;

export async function recipeFromUrl(input: RecipeFromUrlInput): Promise<RecipeFromUrlOutput> {
  return recipeFromUrlFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recipeFromUrlPrompt',
  input: { schema: RecipeFromUrlInputSchema },
  output: { schema: RecipeFromUrlOutputSchema },
  prompt: `You are an expert recipe extractor. Fetch the webpage at the following URL and extract the recipe information.

URL: {{{url}}}

Extract the following fields:
- title: The recipe name
- description: A short description of the dish (1-3 sentences)
- ingredients: All ingredients listed, one per line (include quantities)
- instructions: Step-by-step cooking instructions, one step per line
- prepTime: Preparation time (e.g. "15 mins")
- cookTime: Cooking time (e.g. "30 mins")
- servings: Number of servings (as a number)
- cuisine: The cuisine type (e.g. "Italian", "Mexican", "American")
- imageUrl: The main recipe image URL if available (or omit if not found)

If a field is not clearly available, make a reasonable guess based on the recipe content. Return all text fields as plain text without HTML markup.`,
});

const recipeFromUrlFlow = ai.defineFlow(
  {
    name: 'recipeFromUrlFlow',
    inputSchema: RecipeFromUrlInputSchema,
    outputSchema: RecipeFromUrlOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to extract recipe from URL');
    }
    return output;
  }
);
