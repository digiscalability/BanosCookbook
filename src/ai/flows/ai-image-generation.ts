'use server';

/**
 * @fileOverview Advanced AI image generation for recipes using Google's Imagen
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const AIImageGenerationInputSchema = z.object({
  title: z.string().describe('The recipe title'),
  description: z.string().describe('Recipe description'),
  cuisine: z.string().describe('Cuisine type'),
  ingredients: z.string().describe('Key ingredients'),
  referenceUrls: z
    .array(z.string())
    .optional()
    .describe('Optional reference image URLs scraped from the web for style guidance'),
});

export type AIImageGenerationInput = z.infer<typeof AIImageGenerationInputSchema>;

const AIImageGenerationOutputSchema = z.object({
  images: z
    .array(
      z.object({
        url: z.string().describe('Generated image URL'),
        description: z.string().describe('Image description'),
        style: z.string().describe('Image style'),
        prompt: z.string().describe('AI prompt used'),
      })
    )
    .describe('Generated images'),
});

export type AIImageGenerationOutput = z.infer<typeof AIImageGenerationOutputSchema>;

export async function generateAIImages(
  input: AIImageGenerationInput
): Promise<AIImageGenerationOutput> {
  return aiImageGenerationFlow(input);
}

const aiImageGenerationFlow = ai.defineFlow(
  {
    name: 'aiImageGenerationFlow',
    inputSchema: AIImageGenerationInputSchema,
    outputSchema: AIImageGenerationOutputSchema,
  },
  async input => {
    try {
      // Unused helper function - kept for future reference URL handling
      // const MAX_EMBED_BYTES = 3 * 1024 * 1024; // 3 MB
      // async function fetchToDataUri(url: string): Promise<string | null> {...}

      // Simplified prompt builder
      const createIntelligentPrompt = (
        title: string,
        cuisine: string,
        ingredients: string,
        description: string,
        style: string
      ) => {
        const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
        const basePrompt = `${cleanTitle}, ${cuisine}. Key ingredients: ${ingredients}. ${style} view. Appetizing, natural lighting, high quality.`;
        return basePrompt;
      };

      // Use Google Gemini 2.5 Flash Image to generate actual AI images
      try {
        // Try GOOGLE_AI_API_KEY first (dedicated for image generation)
        const apiKey =
          process.env.GOOGLE_AI_API_KEY ||
          process.env.GOOGLE_API_KEY ||
          process.env.GOOGLE_GENAI_API_KEY ||
          process.env.GEMINI_API_KEY;

        if (!apiKey) {
          console.warn('No Google AI API key found, using Unsplash fallback');
          throw new Error('No API key');
        }

        console.warn('🎨 Generating AI images using Gemini 2.5 Flash Image for:', input.title);
        console.warn('🔑 Using API key:', apiKey.substring(0, 15) + '...');

        // Generate 2 different style images
        const styles = ['professional', 'close-up'];
        const imagePromises = styles.map(async style => {
          const promptText = createIntelligentPrompt(
            input.title,
            input.cuisine,
            input.ingredients,
            input.description,
            style
          );
          console.warn(`📝 Intelligent prompt for ${style}:`, promptText.substring(0, 250) + '...');

          try {
            // Call Gemini 2.5 Flash Image API (Free tier with new API key)
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
              {
                method: 'POST',
                headers: {
                  'x-goog-api-key': apiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: promptText,
                        },
                      ],
                    },
                  ],
                }),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ Gemini Image API failed (${response.status}):`, errorText);
              return null;
            }

            const data = (await response.json()) as {
              candidates?: Array<{
                content?: {
                  parts?: Array<{
                    text?: string;
                    inlineData?: {
                      mimeType: string;
                      data: string;
                    };
                  }>;
                };
              }>;
            };

            console.warn(
              `📦 Gemini API response for ${style}:`,
              JSON.stringify(data, null, 2).substring(0, 500)
            );

            // Extract the base64 image from Gemini response
            const parts = data.candidates?.[0]?.content?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  const imageBase64 = part.inlineData.data;
                  const mimeType = part.inlineData.mimeType || 'image/png';
                  const dataUri = `data:${mimeType};base64,${imageBase64}`;

                  console.warn(
                    `✅ Generated ${style} image (${(imageBase64.length / 1024).toFixed(1)}KB)`
                  );

                  return {
                    url: dataUri,
                    description: `${input.title} - ${style} view`,
                    style: style,
                    prompt: promptText,
                  };
                }
              }
            }

            console.warn('No image data found in Gemini response for', style);
            return null;
          } catch (err) {
            console.warn(`Failed to generate ${style} AI image:`, err);
            return null;
          }
        });

        const generatedImages = (await Promise.all(imagePromises)).filter(img => img !== null);

        if (generatedImages.length > 0) {
          console.warn(
            `🎉 Successfully generated ${generatedImages.length} AI images for:`,
            input.title
          );
          return { images: generatedImages } as AIImageGenerationOutput;
        }

        console.warn('⚠️  AI generation returned no images, using placeholder SVGs');
      } catch (aiErr) {
        console.warn('AI generation error, using placeholder SVGs:', aiErr);
      }

      // Fallback: Create placeholder SVG images (NO Unsplash!)
      function createPlaceholderSVG(title: string, style: string): string {
        const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '');
        const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-${style}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#f0f0f0;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#grad-${style})"/>
          <circle cx="400" cy="250" r="60" fill="#d0d0d0" opacity="0.5"/>
          <rect x="350" y="330" width="100" height="120" rx="8" fill="#d0d0d0" opacity="0.5"/>
          <text x="400" y="490" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#999" text-anchor="middle">
            ${cleanTitle}
          </text>
          <text x="400" y="530" font-family="Arial, sans-serif" font-size="18" fill="#aaa" text-anchor="middle">
            ${style} view
          </text>
          <text x="400" y="570" font-family="Arial, sans-serif" font-size="14" fill="#bbb" text-anchor="middle">
            AI image placeholder
          </text>
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      }

      const styles = ['professional', 'close-up'];
      const placeholderImages = styles.map(style => {
        const promptText = createIntelligentPrompt(
          input.title,
          input.cuisine,
          input.ingredients,
          input.description,
          style
        );
        return {
          url: createPlaceholderSVG(input.title, style),
          description: `${input.title} - ${style} view`,
          style: style,
          prompt: promptText,
        };
      });

      console.warn('🖼️  Using placeholder SVG images for:', input.title);
      return { images: placeholderImages };
    } catch (error) {
      console.error('AI image generation flow failed:', error);

      // Emergency fallback - simple placeholder SVGs
      function createPlaceholderSVG(title: string, style: string): string {
        const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
          <rect width="800" height="600" fill="#f5f5f5"/>
          <text x="400" y="300" font-family="Arial, sans-serif" font-size="24" fill="#999" text-anchor="middle">
            ${title} - ${style}
          </text>
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      }

      const emergencyImages = [
        {
          url: createPlaceholderSVG(input.title, 'professional'),
          description: `${input.title} - professional view`,
          style: 'professional',
          prompt: `Professional food photography of ${input.title}`,
        },
        {
          url: createPlaceholderSVG(input.title, 'close-up'),
          description: `${input.title} - close-up`,
          style: 'close-up',
          prompt: `Close-up of ${input.title}`,
        },
      ];
      return { images: emergencyImages };
    }
  }
);
