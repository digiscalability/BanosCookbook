import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMultiSceneVideoScriptInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  cuisine: z.string().optional(),
  sceneCount: z.number().min(2).max(5).default(3), // 2-5 scenes
});

const GenerateMultiSceneVideoScriptOutputSchema = z.object({
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    duration: z.number(), // seconds
    description: z.string(),
    visualElements: z.array(z.string()),
    script: z.string(),
    transition: z.string().optional(),
  })),
  totalDuration: z.number(),
  marketingIdeas: z.array(z.string()).optional(),
});

export type GenerateMultiSceneVideoScriptInput = z.infer<typeof GenerateMultiSceneVideoScriptInputSchema>;
export type GenerateMultiSceneVideoScriptOutput = z.infer<typeof GenerateMultiSceneVideoScriptOutputSchema>;

const MULTI_SCENE_SYSTEM_PROMPT = `You are a professional video content creator specializing in multi-scene cooking videos for Instagram Reels and TikTok. Given a recipe, create a compelling multi-scene video script that tells a complete story.

Each scene should:
- Have a clear visual focus and purpose
- Build on the previous scene naturally
- Include smooth transitions
- Be optimized for short-form video (15-30 seconds total)
- Use engaging, trendy language

Structure the response as a JSON object with:
- scenes: Array of scene objects with sceneNumber, duration, description, visualElements, script, and transition
- totalDuration: Sum of all scene durations
- marketingIdeas: 2-3 engagement-boosting ideas

Make each scene 4-8 seconds long to fit within Reels limits. Focus on the most visually appealing and educational parts of the recipe.`;

export const generateMultiSceneVideoScriptFlow = ai.defineFlow({
  name: 'generateMultiSceneVideoScriptFlow',
  inputSchema: GenerateMultiSceneVideoScriptInputSchema,
  outputSchema: GenerateMultiSceneVideoScriptOutputSchema,
}, async (input) => {
  const { title, description, ingredients, instructions, cuisine, sceneCount } = input;

  const userPrompt = `Recipe Title: ${title}
Description: ${description}
Cuisine: ${cuisine || 'Various'}
Ingredients: ${ingredients.join(', ')}
Instructions: ${instructions.join(' ')}

Create a ${sceneCount}-scene video script for this recipe. Each scene should be 4-8 seconds long and focus on different aspects of the cooking process. Make it engaging and visually dynamic.`;

  // Use Gemini for multi-scene script generation
  const result = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
    prompt: `${MULTI_SCENE_SYSTEM_PROMPT}\n\n${userPrompt}`,
    config: {
      temperature: 0.8,
      maxOutputTokens: 1000,
    },
  });

  // Parse the JSON response
  try {
    const parsed = JSON.parse(result.text);
    return parsed;
  } catch (parseError) {
    console.error('Failed to parse multi-scene script JSON:', parseError);
    // Fallback: create a basic multi-scene structure
    return createFallbackMultiSceneScript(input);
  }
});

/**
 * Fallback function to create a basic multi-scene script if JSON parsing fails
 */
function createFallbackMultiSceneScript(input: GenerateMultiSceneVideoScriptInput): GenerateMultiSceneVideoScriptOutput {
  const { title, ingredients, instructions, sceneCount } = input;
  const scenes = [];
  let totalDuration = 0;

  // Remove generic intro/outro from instructions if present
  let steps = instructions.map(s => s.trim()).filter(Boolean);
  const introRegex = /welcome|let'?s get started|today we'?re|in this video|introduction|hi,? i'?m|hello/i;
  const outroRegex = /enjoy|thanks for watching|that'?s it|bon appétit|see you next time|hope you enjoy/i;
  if (steps.length > 2) {
    if (introRegex.test(steps[0])) steps = steps.slice(1);
    if (outroRegex.test(steps[steps.length - 1])) steps = steps.slice(0, -1);
  }

  // If not enough steps, fallback to using description/ingredients
  if (steps.length < sceneCount) {
    steps = [
      `Let's make ${title}!`,
      `Ingredients: ${ingredients.slice(0, 3).join(', ')}`,
  ...(instructions.length ? instructions : [input.description]),
    ].filter(Boolean);
  }

  // Distribute steps into scenes, skipping generic intro/outro
  const chunkSize = Math.ceil(steps.length / sceneCount);
  for (let i = 0; i < sceneCount; i++) {
    const chunk = steps.slice(i * chunkSize, (i + 1) * chunkSize);
    let script = chunk.join(' ');
    // Remove markdown artifacts
    script = script.replace(/^[\-*\d.\s]+/gm, '').replace(/[*_`>]/g, '').trim();
    // Scene description
    let description = '';
    if (i === 0) {
      description = 'Start of recipe (no generic intro)';
    } else if (i === sceneCount - 1) {
      description = 'Final step (no generic outro)';
    } else {
      description = `Step ${i + 1}`;
    }
    scenes.push({
      sceneNumber: i + 1,
      duration: 5 + (i === sceneCount - 1 ? 2 : 0),
      description,
      visualElements: ['Cooking action', 'Food transformation', 'Ingredients', 'Plating'],
      script,
      transition: i === sceneCount - 1 ? 'Fade to finish' : 'Quick transition',
    });
    totalDuration += 5 + (i === sceneCount - 1 ? 2 : 0);
  }

  return {
    scenes,
    totalDuration,
    marketingIdeas: [
      "Ask viewers what ingredient they'd add",
      'Challenge to recreate in their kitchen',
      'Tag friends who love this cuisine'
    ],
  };
}
