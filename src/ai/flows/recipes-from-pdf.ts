'use server';

/**
 * @fileOverview A flow to generate recipe details from a PDF file.
 *
 * - extractRecipesFromPdf - A function that extracts recipes from a PDF.
 * - RecipesFromPdfInput - The input type for the extractRecipesFromPdf function.
 * - RecipesFromPdfOutput - The return type for the extractRecipesFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as pdfjs from 'pdf-parse';

const RecipeSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  description: z.string().describe('A brief description of the recipe.'),
  ingredients: z
    .string()
    .describe('The list of ingredients, with each ingredient on a new line.'),
  instructions: z
    .string()
    .describe('The cooking instructions, with each step on a new line.'),
  prepTime: z.string().describe("The preparation time, e.g., '20 mins'."),
  cookTime: z.string().describe("The cooking time, e.g., '45 mins'."),
  servings: z.coerce.number().describe('The number of servings.'),
  cuisine: z.string().describe("The cuisine type, e.g., 'Italian'."),
});

const RecipesFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file encoded as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type RecipesFromPdfInput = z.infer<typeof RecipesFromPdfInputSchema>;

const RecipesFromPdfOutputSchema = z.object({
  recipes: z.array(RecipeSchema),
});
export type RecipesFromPdfOutput = z.infer<typeof RecipesFromPdfOutputSchema>;
export type ExtractedRecipe = z.infer<typeof RecipeSchema>;

export async function extractRecipesFromPdf(
  input: RecipesFromPdfInput
): Promise<RecipesFromPdfOutput> {
  return recipesFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recipesFromPdfPrompt',
  input: {schema: z.object({text: z.string()})},
  output: {schema: RecipesFromPdfOutputSchema},
  prompt: `You are an expert recipe transcriber. Analyze the provided text which was extracted from a PDF and extract all the recipes you can find. For each recipe, provide the following information:
- Recipe Title
- A short description of the dish
- Ingredients (list each one on a new line)
- Instructions (list each step on a new line)
- Preparation time
- Cooking time
- Number of servings
- Cuisine type

If any information is not present, make a reasonable guess or leave it blank. Be as accurate as possible. It is very important that you find all recipes in the text.

The text from the PDF is between the triple dashes.
---
{{{text}}}
---
`,
});

const recipesFromPdfFlow = ai.defineFlow(
  {
    name: 'recipesFromPdfFlow',
    inputSchema: RecipesFromPdfInputSchema,
    outputSchema: RecipesFromPdfOutputSchema,
  },
  async input => {
    const {pdfDataUri} = input;
    const base64Data = pdfDataUri.substring(
      'data:application/pdf;base64,'.length
    );
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    const data = await pdfjs(pdfBuffer);
    const text = data.text;

    if (!text) {
      return {recipes: []};
    }
    
    const {output} = await prompt({text});
    return output || {recipes: []};
  }
);
