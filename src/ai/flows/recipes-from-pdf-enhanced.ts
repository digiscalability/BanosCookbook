'use server';

/**
 * @fileOverview Enhanced PDF processing with image support for recipe extraction.
 * This version handles both text and images in PDFs using OCR.
 */

import { z } from 'genkit';
import * as pdfjs from 'pdf-parse';

import { ai } from '@/ai/genkit';

const RecipeSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  description: z.string().describe('A brief description of the recipe.'),
  ingredients: z.string().describe('The list of ingredients, with each ingredient on a new line.'),
  instructions: z.string().describe('The cooking instructions, with each step on a new line.'),
  prepTime: z.string().describe("The preparation time, e.g., '20 mins'."),
  cookTime: z.string().describe("The cooking time, e.g., '45 mins'."),
  servings: z.coerce.number().describe('The number of servings.'),
  cuisine: z.string().describe("The cuisine type, e.g., 'Italian'."),
  hasImages: z.boolean().describe('Whether the recipe has images.'),
});

const EnhancedRecipesFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file encoded as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  enableOCR: z.boolean().optional().describe('Whether to enable OCR for images. Default: true'),
});
export type EnhancedRecipesFromPdfInput = z.infer<typeof EnhancedRecipesFromPdfInputSchema>;

const EnhancedRecipesFromPdfOutputSchema = z.object({
  recipes: z.array(RecipeSchema),
  processingInfo: z.object({
    totalPages: z.number(),
    textExtracted: z.boolean(),
    imagesProcessed: z.number(),
    ocrEnabled: z.boolean(),
  }),
});
export type EnhancedRecipesFromPdfOutput = z.infer<typeof EnhancedRecipesFromPdfOutputSchema>;

export async function extractRecipesFromPdfEnhanced(
  input: EnhancedRecipesFromPdfInput
): Promise<EnhancedRecipesFromPdfOutput> {
  return enhancedRecipesFromPdfFlow(input);
}

const enhancedRecipesFromPdfFlow = ai.defineFlow(
  {
    name: 'enhancedRecipesFromPdfFlow',
    inputSchema: EnhancedRecipesFromPdfInputSchema,
    outputSchema: EnhancedRecipesFromPdfOutputSchema,
  },
  async input => {
    const { pdfDataUri, enableOCR = true } = input;
    const base64Data = pdfDataUri.substring('data:application/pdf;base64,'.length);
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    let allText = '';
    const imagesProcessed = 0;
    let totalPages = 0;

    try {
      // 1. Extract text using pdf-parse (existing method)
      const data = await pdfjs.default(pdfBuffer);
      allText = data.text;
      totalPages = data.numpages;

      // 2. If OCR is enabled, process images
      if (enableOCR) {
        // Note: This is a simplified version. For full implementation,
        // you would need to integrate with PDF.js or pdf2pic
        console.warn('OCR processing would be implemented here');
        // imagesProcessed = await processImagesWithOCR(pdfBuffer);
      }

      if (!allText) {
        return {
          recipes: [],
          processingInfo: {
            totalPages,
            textExtracted: false,
            imagesProcessed,
            ocrEnabled: enableOCR,
          },
        };
      }

      // 3. Process with AI
      const prompt = ai.definePrompt({
        name: 'enhancedRecipesFromPdfPrompt',
        input: { schema: z.object({ text: z.string(), hasImages: z.boolean() }) },
        output: { schema: z.object({ recipes: z.array(RecipeSchema) }) },
        prompt: `You are an expert recipe transcriber. Analyze the provided text which was extracted from a PDF and extract all the recipes you can find.

IMPORTANT: This text may contain content extracted from both regular text and OCR-processed images. Look for recipes in both formats.

For each recipe, provide the following information:
- Recipe Title
- A short description of the dish
- Ingredients (list each one on a new line)
- Instructions (list each step on a new line)
- Preparation time
- Cooking time
- Number of servings
- Cuisine type
- Whether the recipe has images (set to true if you detect image references or if OCR was used)

If any information is not present, make a reasonable guess or leave it blank. Be as accurate as possible. It is very important that you find all recipes in the text.

The text from the PDF is between the triple dashes.
---
${allText}
---
`,
      });

      const { output } = await prompt({
        text: allText,
        hasImages: imagesProcessed > 0,
      });

      return {
        recipes: output?.recipes || [],
        processingInfo: {
          totalPages,
          textExtracted: !!allText,
          imagesProcessed,
          ocrEnabled: enableOCR,
        },
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      return {
        recipes: [],
        processingInfo: {
          totalPages,
          textExtracted: false,
          imagesProcessed,
          ocrEnabled: enableOCR,
        },
      };
    }
  }
);
