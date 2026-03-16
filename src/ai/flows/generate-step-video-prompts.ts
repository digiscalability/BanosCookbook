import { z } from 'zod';

/**
 * Converts each recipe instruction step into a Runway ML-optimized cinematic visual prompt.
 *
 * Uses OpenAI GPT-4o-mini (fast + cheap) to turn plain cooking steps like
 * "Dice the onions finely" into Runway-ready prompts like:
 * "Overhead shot, chef's knife dicing yellow onion on wooden cutting board,
 *  fine pieces falling apart, warm kitchen lighting, shallow depth of field,
 *  food cinematography style"
 *
 * Output is stored in Firestore at recipe_step_videos/{recipeId} so subsequent
 * calls are instant (no re-generation needed).
 */

export interface StepVideoPrompt {
  stepIndex: number;   // 0-based
  stepText: string;    // Original recipe instruction
  runwayPrompt: string; // Optimized prompt for Runway image-to-video (≤900 chars)
  duration: number;    // Suggested clip duration in seconds (5–10)
  cameraAngle: string; // e.g. "overhead", "close-up", "medium"
}

const CAMERA_ANGLES = [
  'overhead top-down shot',
  'close-up macro shot',
  'medium shot at counter height',
  'low angle looking up',
  'side profile shot',
] as const;

/** Heuristic duration based on step complexity */
function suggestDuration(stepText: string): number {
  const lower = stepText.toLowerCase();
  // Long actions
  if (/simmer|bake|roast|marinate|rest|cook.*minute|boil/.test(lower)) return 8;
  // Medium actions
  if (/sauté|fry|stir|whisk|mix|fold|knead|blend/.test(lower)) return 7;
  // Quick actions
  if (/chop|dice|slice|mince|peel|crush|grate|season|add|pour/.test(lower)) return 5;
  // Default
  return 6;
}

/** Heuristic camera angle based on step type */
function suggestCameraAngle(stepText: string): string {
  const lower = stepText.toLowerCase();
  if (/knife|chop|dice|slice|mince|cut|peel/.test(lower)) return 'overhead top-down shot';
  if (/stir|whisk|mix|fold|blend/.test(lower)) return 'close-up macro shot';
  if (/bake|oven|roast|grill/.test(lower)) return 'medium shot at counter height';
  if (/pour|drizzle|sprinkle|season/.test(lower)) return 'close-up macro shot';
  if (/plate|serve|garnish|present/.test(lower)) return 'overhead top-down shot';
  return 'medium shot at counter height';
}

/** Build a Runway-optimized prompt without AI (deterministic fallback) */
function buildFallbackPrompt(
  stepText: string,
  recipeTitle: string,
  cameraAngle: string,
  stepIndex: number,
  totalSteps: number
): string {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const lightingNote = isFirst
    ? 'bright natural kitchen lighting'
    : isLast
      ? 'warm golden kitchen lighting, appetizing finish'
      : 'warm kitchen lighting, soft shadows';

  // Clean up the step for a visual description
  const visualAction = stepText
    .replace(/^\d+[\.\)]\s*/, '') // Remove leading numbers
    .replace(/\b(then|next|now|after that|once done)\b/gi, '')
    .trim()
    .substring(0, 120);

  const prompt = `${cameraAngle}, ${visualAction.toLowerCase()}, ${lightingNote}, food cinematography, shallow depth of field, professional kitchen, appetizing presentation, 4K quality, no text or labels`;

  return prompt.substring(0, 900);
}

/**
 * Generate optimized Runway prompts for all recipe steps using OpenAI.
 * Falls back to deterministic prompts if OpenAI is unavailable.
 */
export async function generateStepVideoPrompts(
  recipeTitle: string,
  recipeDescription: string,
  ingredients: string[],
  steps: string[]
): Promise<StepVideoPrompt[]> {
  const totalSteps = steps.length;

  // Try OpenAI first for high-quality cinematic prompts
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('No OpenAI key');

    const stepsText = steps.map((s, i) => `Step ${i + 1}: ${s}`).join('\n');
    const ingredientsList = ingredients.slice(0, 10).join(', ');

    const systemPrompt = `You are a professional food videographer and cinematographer.
Convert each cooking instruction step into an optimized Runway ML image-to-video prompt.

Rules for each prompt:
- Start with camera angle (overhead shot / close-up macro / medium shot at counter height)
- Describe the specific visual action happening (hands, ingredients, tools)
- Include lighting (warm kitchen lighting / bright natural light / soft shadows)
- End with: food cinematography, shallow depth of field, professional kitchen
- Maximum 900 characters per prompt
- Be specific and visual — describe what the CAMERA SEES, not abstract concepts
- Use action verbs: sizzling, drizzling, folding, dicing, etc.

Return a JSON array with objects:
{"stepIndex": 0, "stepText": "...", "runwayPrompt": "...", "duration": 6, "cameraAngle": "..."}

Duration guide:
- Chopping/prep actions: 5s
- Mixing/stirring: 6s
- Sautéing/cooking: 7s
- Simmering/baking: 8s
- Plating/serving: 7s`;

    const userPrompt = `Recipe: "${recipeTitle}"
Key ingredients: ${ingredientsList}

Steps to convert:
${stepsText}

Return a JSON array (one entry per step).`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message?.content ?? '{}';

    // Parse — OpenAI may return { steps: [...] } or just an array
    const parsed = JSON.parse(content) as { steps?: unknown[] } | unknown[];
    const rawSteps: unknown[] = Array.isArray(parsed)
      ? parsed
      : (parsed as { steps?: unknown[] }).steps ?? [];

    // Validate and normalise
    const validated = rawSteps
      .map((item) => {
        const obj = item as Record<string, unknown>;
        const idx = typeof obj.stepIndex === 'number' ? obj.stepIndex : 0;
        const stepText = typeof obj.stepText === 'string' ? obj.stepText : (steps[idx] ?? '');
        const rawPrompt = typeof obj.runwayPrompt === 'string' ? obj.runwayPrompt : '';
        const duration = typeof obj.duration === 'number' ? Math.min(Math.max(obj.duration, 4), 10) : suggestDuration(stepText);
        const cameraAngle = typeof obj.cameraAngle === 'string' ? obj.cameraAngle : suggestCameraAngle(stepText);
        return {
          stepIndex: idx,
          stepText,
          runwayPrompt: rawPrompt.substring(0, 900) || buildFallbackPrompt(stepText, recipeTitle, cameraAngle, idx, totalSteps),
          duration,
          cameraAngle,
        } satisfies StepVideoPrompt;
      })
      .filter(s => s.runwayPrompt.length > 10);

    if (validated.length === steps.length) {
      return validated;
    }
  } catch (err) {
    console.warn('[generateStepVideoPrompts] OpenAI failed, using fallback:', err instanceof Error ? err.message : err);
  }

  // Deterministic fallback — always works, no API needed
  return steps.map((stepText, idx) => {
    const cameraAngle = suggestCameraAngle(stepText);
    const duration = suggestDuration(stepText);
    const runwayPrompt = buildFallbackPrompt(stepText, recipeTitle, cameraAngle, idx, totalSteps);
    return { stepIndex: idx, stepText, runwayPrompt, duration, cameraAngle } satisfies StepVideoPrompt;
  });
}

// Zod schema for Firestore storage validation
export const StepVideoSchema = z.object({
  stepIndex: z.number(),
  stepText: z.string(),
  runwayPrompt: z.string(),
  duration: z.number(),
  cameraAngle: z.string(),
  videoUrl: z.string().optional(),
  videoGeneratedAt: z.unknown().optional(),
});

export type StepVideoRecord = z.infer<typeof StepVideoSchema>;
