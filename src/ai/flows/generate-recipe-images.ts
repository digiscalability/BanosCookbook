import { z } from 'genkit';

import { ai } from '@/ai/genkit';

import type { AIImageGenerationInput } from './ai-image-generation';
import { generateAIImages } from './ai-image-generation';

const GenerateRecipeImagesInputSchema = z.object({
  title: z.string().describe('The title of the recipe'),
  description: z.string().describe('A brief description of the recipe'),
  cuisine: z.string().describe('The cuisine type'),
  ingredients: z.string().describe('List of ingredients'),
});

export type GenerateRecipeImagesInput = z.infer<typeof GenerateRecipeImagesInputSchema>;

const GeneratedImageSchema = z.object({
  url: z.string().describe('The URL of the generated image'),
  description: z.string().describe('A brief description of what the image shows'),
  style: z.string().describe('The visual style of the image'),
});

const GenerateRecipeImagesOutputSchema = z.object({
  images: z.array(GeneratedImageSchema).describe('Array of generated images'),
});

export type GenerateRecipeImagesOutput = z.infer<typeof GenerateRecipeImagesOutputSchema>;

export async function generateRecipeImages(
  input: GenerateRecipeImagesInput
): Promise<GenerateRecipeImagesOutput> {
  return generateRecipeImagesFlow(input);
}

// Unused - AI generation is handled by ai-image-generation.ts
// const prompt = ai.definePrompt({
//   name: 'generateRecipeImagesPrompt',
//   input: { schema: GenerateRecipeImagesInputSchema },
//   output: { schema: GenerateRecipeImagesOutputSchema },
//   prompt: `You are an expert food photographer and AI image generator. Based on the recipe details provided, generate 1-2 high-quality, appetizing images that would represent this dish well.
//
// Recipe Details:
// - Title: {{title}}
// - Description: {{description}}
// - Cuisine: {{cuisine}}
// - Key Ingredients: {{ingredients}}
//
// If provided, there may be reference image URLs in a 'referenceUrls' field. Use those as visual references and produce an original image inspired by them (do not copy). Return an array of images with url, description and style.`,
// });

const generateRecipeImagesFlow = ai.defineFlow(
  {
    name: 'generateRecipeImagesFlow',
    inputSchema: GenerateRecipeImagesInputSchema,
    outputSchema: GenerateRecipeImagesOutputSchema,
  },
  async input => {
    // Unused helper functions - kept for reference
    // const generateRecipeSpecificImages = async (title: string, cuisine: string, ingredients: string) => {...};
    // const getCuisineFallbackImages = (cuisine: string, title: string) => {...};

    try {
      // Step 1: Call AI image generator FIRST to generate custom images
      console.warn('🚀 Starting AI image generation for:', input.title);

      try {
        const aiInput: AIImageGenerationInput = {
          title: input.title,
          description: input.description,
          cuisine: input.cuisine,
          ingredients: input.ingredients,
          referenceUrls: [], // No reference URLs needed - AI will generate fresh
        };

        const aiResult = await generateAIImages(aiInput);
        if (aiResult && Array.isArray(aiResult.images) && aiResult.images.length > 0) {
          console.warn('✅ AI generation returned', aiResult.images.length, 'images');
          return aiResult;
        }

        console.warn('⚠️  AI generation returned no images (will use placeholders from AI flow)');
        // Note: generateAIImages already returns placeholder SVGs if AI fails
        return aiResult;
      } catch (err) {
        console.error('❌ Image generation failed completely:', err);
        // Return empty - let the AI image generation flow handle placeholders
        return { images: [] };
      }
    } catch (err) {
      console.error('Image generation flow failed:', err);
      return { images: [] };
    }
  }
);
