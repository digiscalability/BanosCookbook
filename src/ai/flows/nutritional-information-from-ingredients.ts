'use server';

/**
 * @fileOverview A flow to generate approximate nutritional information for a recipe based on its ingredients.
 *
 * - getNutritionalInformation - A function that generates nutritional information from a list of ingredients.
 * - NutritionalInformationInput - The input type for the getNutritionalInformation function.
 * - NutritionalInformationOutput - The return type for the getNutritionalInformation function.
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const NutritionalInformationInputSchema = z.object({
  ingredients: z.string().describe('A list of ingredients for the recipe.'),
});
export type NutritionalInformationInput = z.infer<typeof NutritionalInformationInputSchema>;

const NutritionalInformationOutputSchema = z.object({
  calories: z.string().describe('The approximate number of calories in the recipe.'),
  protein: z.string().describe('The approximate amount of protein in the recipe (in grams).'),
  carbs: z.string().describe('The approximate amount of carbohydrates in the recipe (in grams).'),
  fat: z.string().describe('The approximate amount of fat in the recipe (in grams).'),
});
export type NutritionalInformationOutput = z.infer<typeof NutritionalInformationOutputSchema>;

export async function getNutritionalInformation(
  input: NutritionalInformationInput
): Promise<NutritionalInformationOutput> {
  return nutritionalInformationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'nutritionalInformationPrompt',
  input: { schema: NutritionalInformationInputSchema },
  output: { schema: NutritionalInformationOutputSchema },
  prompt: `You are a nutritional expert. Please provide an approximate nutritional information (calories, protein, carbs, and fat) for the following recipe ingredients. Be as accurate as possible, but understand that these are only estimates.

Ingredients: {{{ingredients}}}

Make sure your response is well-formatted and easy to read.
`,
});

const nutritionalInformationFlow = ai.defineFlow(
  {
    name: 'nutritionalInformationFlow',
    inputSchema: NutritionalInformationInputSchema,
    outputSchema: NutritionalInformationOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate nutritional information');
    }
    return output;
  }
);
