'use server';

/**
 * @fileOverview State-of-the-art PDF processing with AI-powered OCR for image-heavy PDFs.
 * This implementation uses hybrid text extraction + OCR + AI enhancement for maximum accuracy.
 */

import { z } from 'genkit';
import * as pdfjs from 'pdf-parse';
import pdf2pic from 'pdf2pic';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

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
  difficulty: z
    .string()
    .optional()
    .describe("The difficulty level, e.g., 'Easy', 'Medium', 'Hard'."),
  tags: z
    .array(z.string())
    .optional()
    .describe('Recipe tags like "vegetarian", "gluten-free", etc.'),
  nutritionInfo: z.string().optional().describe('Nutritional information if available.'),
  source: z.string().optional().describe('Source of the recipe if mentioned.'),
});

const AdvancedRecipesFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file encoded as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  processingMode: z
    .enum(['text-only', 'ocr-only', 'hybrid', 'auto'])
    .default('auto')
    .describe('Processing mode for PDF extraction.'),
  ocrLanguage: z.string().default('eng').describe('OCR language code.'),
  imageQuality: z
    .enum(['low', 'medium', 'high'])
    .default('high')
    .describe('Image processing quality.'),
  enableAIEnhancement: z
    .boolean()
    .default(true)
    .describe('Enable AI-powered text cleaning and enhancement.'),
});
export type AdvancedRecipesFromPdfInput = z.infer<typeof AdvancedRecipesFromPdfInputSchema>;

const AdvancedRecipesFromPdfOutputSchema = z.object({
  recipes: z.array(RecipeSchema),
  processingInfo: z.object({
    totalPages: z.number(),
    processingMode: z.enum(['text-only', 'ocr-only', 'hybrid', 'auto']),
    textExtracted: z.boolean(),
    imagesProcessed: z.number(),
    ocrAccuracy: z.number().optional(),
    processingTime: z.number(),
    aiEnhanced: z.boolean(),
  }),
  rawText: z.string().optional().describe('Raw extracted text for debugging.'),
});
export type AdvancedRecipesFromPdfOutput = z.infer<typeof AdvancedRecipesFromPdfOutputSchema>;

export async function extractRecipesFromPdfAdvanced(
  input: AdvancedRecipesFromPdfInput
): Promise<AdvancedRecipesFromPdfOutput> {
  return advancedRecipesFromPdfFlow(input);
}

// AI-powered text cleaning and enhancement
const textCleaningPrompt = ai.definePrompt({
  name: 'textCleaningPrompt',
  input: { schema: z.object({ text: z.string(), source: z.string() }) },
  output: { schema: z.object({ cleanedText: z.string(), confidence: z.number() }) },
  prompt: `You are an expert text processor specializing in recipe extraction from PDFs. Your task is to clean and enhance raw text extracted from PDFs (including OCR text) to make it more readable and structured for recipe extraction.

IMPORTANT INSTRUCTIONS:
1. Fix common OCR errors (like "1" instead of "I", "0" instead of "O")
2. Correct spacing and formatting issues
3. Standardize measurements (cups, tablespoons, etc.)
4. Fix broken words across lines
5. Remove page numbers, headers, footers
6. Preserve recipe structure and formatting
7. Maintain ingredient lists and instructions
8. Keep cooking times and temperatures intact

Source: {{source}}
Text to clean:
---
{{text}}
---

Return the cleaned text and a confidence score (0-1) indicating how well you could clean the text.`,
});

// Advanced recipe extraction with AI enhancement
const advancedRecipePrompt = ai.definePrompt({
  name: 'advancedRecipePrompt',
  input: { schema: z.object({ text: z.string(), processingInfo: z.object({}) }) },
  output: { schema: z.object({ recipes: z.array(RecipeSchema) }) },
  prompt: `You are an expert recipe transcriber and culinary analyst. Extract ALL recipes from the provided text with maximum accuracy and detail.

CRITICAL REQUIREMENTS:
1. Find EVERY recipe in the text - don't miss any
2. Extract comprehensive information for each recipe
3. Standardize measurements and cooking times
4. Identify cuisine types accurately
5. Extract difficulty levels when possible
6. Find nutritional information if present
7. Extract tags (vegetarian, gluten-free, etc.)
8. Preserve original source information

RECIPE EXTRACTION GUIDELINES:
- Look for recipe titles (often in bold, caps, or special formatting)
- Extract complete ingredient lists with measurements
- Capture step-by-step instructions
- Identify prep time, cook time, and total time
- Determine serving sizes
- Classify cuisine types
- Extract cooking methods and techniques
- Find dietary restrictions and tags
- Look for nutritional information
- Preserve any source citations

PROCESSING INFO: {{processingInfo}}

TEXT TO ANALYZE:
---
{{text}}
---

Extract ALL recipes with maximum detail and accuracy.`,
});

const advancedRecipesFromPdfFlow = ai.defineFlow(
  {
    name: 'advancedRecipesFromPdfFlow',
    inputSchema: AdvancedRecipesFromPdfInputSchema,
    outputSchema: AdvancedRecipesFromPdfOutputSchema,
  },
  async input => {
    const startTime = Date.now();
    const {
      pdfDataUri,
      processingMode = 'auto',
      ocrLanguage = 'eng',
      imageQuality = 'high',
      enableAIEnhancement = true,
    } = input;

    const base64Data = pdfDataUri.substring('data:application/pdf;base64,'.length);
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    let allText = '';
    let imagesProcessed = 0;
    let totalPages = 0;
    let ocrAccuracy = 0;
    let processingModeUsed = processingMode;

    try {
      // Step 1: Extract basic text first with error handling
      let textData;
      let basicText = '';

      try {
        textData = await pdfjs.default(pdfBuffer, {
          // Add options to handle problematic PDFs
          max: 0, // Parse all pages
          version: 'v1.10.100', // Use specific version
        });
        basicText = textData.text || '';
        totalPages = textData.numpages || 0;
      } catch (pdfError) {
        console.warn(
          'PDF parsing failed, trying alternative method:',
          pdfError instanceof Error ? pdfError.message : String(pdfError)
        );
        // Fallback: try with minimal options
        try {
          textData = await pdfjs.default(pdfBuffer, { max: 0 });
          basicText = textData.text || '';
          totalPages = textData.numpages || 0;
        } catch (fallbackError) {
          console.warn(
            'PDF parsing completely failed:',
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          );
          basicText = '';
          totalPages = 0;
        }
      }

      // Step 2: Determine processing strategy
      if (processingMode === 'auto') {
        // Smart detection: if text is substantial and clean, use text-only
        const textQuality = assessTextQuality(basicText);
        if (textQuality > 0.7) {
          processingModeUsed = 'text-only';
        } else if (textQuality > 0.3) {
          processingModeUsed = 'hybrid';
        } else {
          processingModeUsed = 'ocr-only';
        }
      }

      // Step 3: Process based on determined strategy
      if (processingModeUsed === 'text-only') {
        allText = basicText;
      } else if (processingModeUsed === 'ocr-only' || processingModeUsed === 'hybrid') {
        // Convert PDF to images and process with OCR
        const ocrResults = await processWithOCR(pdfBuffer, {
          language: ocrLanguage,
          quality: imageQuality,
        });

        imagesProcessed = ocrResults.imagesProcessed;
        ocrAccuracy = ocrResults.accuracy;

        if (processingModeUsed === 'hybrid') {
          // Combine text and OCR results
          allText = `${basicText}\n\n--- OCR EXTRACTED TEXT ---\n\n${ocrResults.text}`;
        } else {
          allText = ocrResults.text;
        }
      }

      // Step 4: AI-powered text enhancement with retry logic
      let finalText = allText;
      let aiEnhanced = false;

      if (enableAIEnhancement && allText) {
        try {
          const { output: cleanedResult } = await textCleaningPrompt({
            text: allText,
            source: `PDF with ${processingModeUsed} processing`,
          });

          if (cleanedResult && cleanedResult.confidence > 0.5) {
            finalText = cleanedResult.cleanedText;
            aiEnhanced = true;
          }
        } catch (aiError) {
          console.warn(
            'AI enhancement failed, using raw text:',
            aiError instanceof Error ? aiError.message : String(aiError)
          );
          // Continue with raw text if AI fails
        }
      }

      // Step 5: Extract recipes with AI
      if (!finalText || finalText.trim().length < 50) {
        return {
          recipes: [],
          processingInfo: {
            totalPages,
            processingMode: processingModeUsed,
            textExtracted: false,
            imagesProcessed,
            ocrAccuracy,
            processingTime: Date.now() - startTime,
            aiEnhanced,
          },
          rawText: finalText,
        };
      }

      let recipeResult;
      try {
        const { output } = await advancedRecipePrompt({
          text: finalText,
          processingInfo: {
            mode: processingModeUsed,
            pages: totalPages,
            images: imagesProcessed,
            ocrAccuracy,
          },
        });
        recipeResult = output;
      } catch (recipeError) {
        console.warn(
          'Recipe extraction failed, trying fallback:',
          recipeError instanceof Error ? recipeError.message : String(recipeError)
        );
        // Fallback: try with basic recipe extraction
        try {
          const { output: fallbackResult } = await ai.definePrompt({
            name: 'fallbackRecipePrompt',
            input: { schema: z.object({ text: z.string() }) },
            output: { schema: z.object({ recipes: z.array(RecipeSchema) }) },
            prompt: `Extract recipes from this text. Find any cooking instructions, ingredients, or recipe information.`,
          })({ text: finalText });
          recipeResult = fallbackResult;
        } catch (fallbackError) {
          console.warn(
            'Fallback recipe extraction also failed:',
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          );
          recipeResult = { recipes: [] };
        }
      }

      return {
        recipes: recipeResult?.recipes || [],
        processingInfo: {
          totalPages,
          processingMode: processingModeUsed,
          textExtracted: !!allText,
          imagesProcessed,
          ocrAccuracy,
          processingTime: Date.now() - startTime,
          aiEnhanced,
        },
        rawText: finalText,
      };
    } catch (error) {
      console.error('Error in advanced PDF processing:', error);
      return {
        recipes: [],
        processingInfo: {
          totalPages,
          processingMode: processingModeUsed,
          textExtracted: false,
          imagesProcessed,
          ocrAccuracy: 0,
          processingTime: Date.now() - startTime,
          aiEnhanced: false,
        },
        rawText: '',
      };
    }
  }
);

// Helper function to assess text quality
function assessTextQuality(text: string): number {
  if (!text || text.length < 100) return 0;

  // Check for common recipe indicators
  const recipeIndicators = [
    'ingredients',
    'instructions',
    'prep time',
    'cook time',
    'servings',
    'cups',
    'tablespoons',
    'teaspoons',
    'degrees',
    'minutes',
    'hours',
  ];

  const foundIndicators = recipeIndicators.filter(indicator =>
    text.toLowerCase().includes(indicator)
  ).length;

  // Check for proper formatting (ingredients lists, numbered steps)
  const hasIngredients = /ingredients?/i.test(text);
  const hasInstructions = /instructions?|directions?/i.test(text);
  const hasMeasurements = /\d+\s*(cups?|tablespoons?|teaspoons?|oz|pounds?)/i.test(text);

  // Calculate quality score
  const indicatorScore = foundIndicators / recipeIndicators.length;
  const structureScore =
    (hasIngredients ? 0.3 : 0) + (hasInstructions ? 0.3 : 0) + (hasMeasurements ? 0.4 : 0);

  return Math.min(1, (indicatorScore + structureScore) / 2);
}

// Advanced OCR processing with image optimization
async function processWithOCR(
  pdfBuffer: Buffer,
  options: { language: string; quality: string }
): Promise<{ text: string; imagesProcessed: number; accuracy: number }> {
  const { language, quality } = options;

  try {
    // Check if GraphicsMagick/ImageMagick is available
    let convert;
    try {
      convert = pdf2pic.fromBuffer(pdfBuffer, {
        density: quality === 'high' ? 300 : quality === 'medium' ? 200 : 150,
        saveFilename: 'page',
        savePath: './temp',
        format: 'png',
        width: quality === 'high' ? 2000 : quality === 'medium' ? 1500 : 1000,
      });
    } catch (gmError) {
      console.warn(
        'GraphicsMagick/ImageMagick not available, skipping OCR:',
        gmError instanceof Error ? gmError.message : String(gmError)
      );
      return {
        text: '',
        imagesProcessed: 0,
        accuracy: 0,
      };
    }

    const results = await convert.bulk(-1); // Convert all pages
    const ocrTexts = [];
    let totalConfidence = 0;

    // Process each image with optimized OCR
    for (const result of results) {
      try {
        // Enhance image quality before OCR
        const enhancedImageBuffer = await sharp(result.path)
          .resize(2000, 2800, { fit: 'inside', withoutEnlargement: true })
          .normalize()
          .sharpen()
          .png()
          .toBuffer();

        // OCR with optimized settings
        const worker = await createWorker(language);
        const tessParams: Record<string, string | number> = {
          tessedit_char_whitelist:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}"\'/\\-:;',
          tessedit_pageseg_mode: 6, // Uniform block of text
          tessedit_ocr_engine_mode: 1, // LSTM OCR Engine
        };
        await worker.setParameters(tessParams as unknown as Record<string, unknown>);

        const {
          data: { text, confidence },
        } = await worker.recognize(enhancedImageBuffer);
        await worker.terminate();

        ocrTexts.push(text);
        totalConfidence += confidence;
      } catch (ocrError) {
        console.warn(
          'OCR failed for page:',
          ocrError instanceof Error ? ocrError.message : String(ocrError)
        );
        ocrTexts.push('');
        totalConfidence += 0;
      }
    }

    return {
      text: ocrTexts.join('\n\n'),
      imagesProcessed: results.length,
      accuracy: results.length > 0 ? totalConfidence / results.length : 0,
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      text: '',
      imagesProcessed: 0,
      accuracy: 0,
    };
  }
}
