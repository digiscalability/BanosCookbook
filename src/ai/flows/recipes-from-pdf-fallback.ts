'use server';

/**
 * @fileOverview Fallback PDF processing for when OCR is not available.
 * This version focuses on text extraction and manual processing guidance.
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
});

const FallbackRecipesFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file encoded as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type FallbackRecipesFromPdfInput = z.infer<typeof FallbackRecipesFromPdfInputSchema>;

const FallbackRecipesFromPdfOutputSchema = z.object({
  recipes: z.array(RecipeSchema),
  processingInfo: z.object({
    totalPages: z.number(),
    textExtracted: z.boolean(),
    textLength: z.number(),
    isImagePDF: z.boolean(),
    processingTime: z.number(),
    recommendations: z.array(z.string()),
  }),
  rawText: z.string().optional().describe('Raw extracted text for debugging.'),
});
export type FallbackRecipesFromPdfOutput = z.infer<typeof FallbackRecipesFromPdfOutputSchema>;

export async function extractRecipesFromPdfFallback(
  input: FallbackRecipesFromPdfInput
): Promise<FallbackRecipesFromPdfOutput> {
  return fallbackRecipesFromPdfFlow(input);
}

const fallbackRecipesFromPdfFlow = ai.defineFlow(
  {
    name: 'fallbackRecipesFromPdfFlow',
    inputSchema: FallbackRecipesFromPdfInputSchema,
    outputSchema: FallbackRecipesFromPdfOutputSchema,
  },
  async input => {
    const startTime = Date.now();
    const { pdfDataUri } = input;

    const base64Data = pdfDataUri.substring('data:application/pdf;base64,'.length);
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    let allText = '';
    let totalPages = 0;
    let textExtracted = false;
    let isImagePDF = false;
    const recommendations: string[] = [];

    try {
      // Step 1: Try text extraction with multiple methods
      let textData;

      try {
        // Method 1: Standard parsing
        textData = await pdfjs.default(pdfBuffer, {
          max: 0,
          version: 'v1.10.100',
        });
        allText = textData.text || '';
        totalPages = textData.numpages || 0;
        textExtracted = true;
      } catch (error) {
        console.warn('Standard PDF parsing failed:', error);

        try {
          // Method 2: Minimal parsing
          textData = await pdfjs.default(pdfBuffer, { max: 0 });
          allText = textData.text || '';
          totalPages = textData.numpages || 0;
          textExtracted = true;
        } catch (fallbackError) {
          console.warn('Fallback PDF parsing also failed:', fallbackError);
          allText = '';
          totalPages = 0;
          textExtracted = false;
        }
      }

      // Step 2: Analyze PDF type and generate recommendations
      const textLength = allText.length;
      isImagePDF = textLength < 100;

      if (isImagePDF) {
        recommendations.push('This appears to be an image-based PDF (scanned cookbook)');
        recommendations.push('OCR processing is required but GraphicsMagick is not installed');
        recommendations.push(
          'Consider pre-processing the PDF with OCR tools like Adobe Acrobat or online OCR services'
        );
        recommendations.push(
          'Alternative: Upload the PDF to Google Drive and open with Google Docs for automatic OCR'
        );
      } else if (textLength > 1000) {
        recommendations.push('Good text content detected - text extraction should work');
        recommendations.push('Try using text-only or hybrid processing mode');
      } else {
        recommendations.push('Limited text content - may need OCR processing');
        recommendations.push('Consider using OCR tools to convert the PDF to text');
      }

      // Step 3: Extract recipes if we have text
      let recipes: Array<{
        title: string;
        description: string;
        ingredients: string;
        instructions: string;
        prepTime: string;
        cookTime: string;
        servings: number;
        cuisine: string;
      }> = [];

      if (allText && allText.trim().length > 50) {
        try {
          const recipePrompt = ai.definePrompt({
            name: 'fallbackRecipePrompt',
            input: { schema: z.object({ text: z.string() }) },
            output: { schema: z.object({ recipes: z.array(RecipeSchema) }) },
            prompt: `Extract recipes from this text. Look for cooking instructions, ingredients, and recipe information. If no clear recipes are found, return an empty array.

Text to analyze:
---
${allText}
---

Extract any recipes you can find with the following information:
- Recipe title
- Description
- Ingredients list
- Cooking instructions
- Preparation time
- Cooking time
- Number of servings
- Cuisine type`,
          });

          const { output: recipeResult } = await recipePrompt({ text: allText });
          recipes = recipeResult?.recipes || [];
        } catch (recipeError) {
          console.warn('Recipe extraction failed:', recipeError);
          recipes = [];
        }
      } else {
        recommendations.push('No sufficient text content for recipe extraction');
        recommendations.push('This PDF may require OCR processing to extract recipes');
      }

      return {
        recipes,
        processingInfo: {
          totalPages,
          textExtracted,
          textLength,
          isImagePDF,
          processingTime: Date.now() - startTime,
          recommendations,
        },
        rawText: allText,
      };
    } catch (error) {
      console.error('Error in fallback PDF processing:', error);
      return {
        recipes: [],
        processingInfo: {
          totalPages: 0,
          textExtracted: false,
          textLength: 0,
          isImagePDF: true,
          processingTime: Date.now() - startTime,
          recommendations: [
            'PDF processing failed completely',
            'This may be a corrupted or unsupported PDF format',
            'Try converting the PDF to a different format or use OCR tools',
          ],
        },
        rawText: '',
      };
    }
  }
);
