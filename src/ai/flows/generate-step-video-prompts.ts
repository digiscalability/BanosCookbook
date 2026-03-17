import { z } from 'zod';
import { buildVeoPrompt } from '../../lib/veo-prompt-optimizer';

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
  stepIndex: number;    // 0-based
  stepText: string;     // Original recipe instruction
  runwayPrompt: string; // Legacy Runway image-to-video prompt (≤900 chars) — kept for backward-compat
  veoPrompt?: string;   // Veo 3.1 text-to-video prompt (beat-by-beat sequential, no char limit)
  duration: number;     // Suggested clip duration in seconds (4, 6, or 8 for Veo)
  cameraAngle: string;  // e.g. "overhead", "close-up", "medium"
}

const CAMERA_ANGLES = [
  'overhead top-down shot',
  'close-up macro shot',
  'medium shot at counter height',
  'low angle looking up',
  'side profile shot',
] as const;

/** Heuristic duration based on step complexity (Veo 3.1 supports 4, 6, 8 seconds only) */
function suggestDuration(stepText: string): number {
  const lower = stepText.toLowerCase();
  // Long actions
  if (/simmer|bake|roast|marinate|rest|cook.*minute|boil|fill|ladle|scoop.*bowl/.test(lower)) return 8;
  // Quick actions
  if (/chop|dice|slice|mince|peel|crush|grate|season|add|pour/.test(lower)) return 4;
  // Default (stir, whisk, mix, fold, sauté, fry, etc.)
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

  const visualAction = stepText
    .replace(/^\d+[\.\)]\s*/, '')
    .replace(/\b(then|next|now|after that|once done)\b/gi, '')
    .trim()
    .substring(0, 120);

  const prompt = `${cameraAngle}, ${visualAction.toLowerCase()}, raw and partially-cooked ingredients at this stage of preparation, ${lightingNote}, food cinematography, shallow depth of field, professional kitchen, realistic hands and tools visible, no finished dish, no text or labels`;

  return prompt.substring(0, 900);
}

/** Build a Veo 3.1-optimised prompt without AI (deterministic fallback) */
function buildFallbackVeoPrompt(
  stepText: string,
  recipeTitle: string,
  cameraAngle: string,
  stepIndex: number,
  totalSteps: number
): string {
  return buildVeoPrompt({
    recipeTitle,
    stepText,
    cameraAngle,
    lighting: stepIndex === 0
      ? 'bright natural kitchen lighting'
      : stepIndex === totalSteps - 1
        ? 'warm golden kitchen lighting'
        : 'warm kitchen lighting, soft shadows',
  });
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

    const systemPrompt = `You are a professional food videographer and cinematographer specialising in Veo 3.1 text-to-video prompts.
Convert each cooking instruction step into two prompts: a legacy Runway prompt and a Veo 3.1 prompt.

RUNWAY PROMPT rules (runwayPrompt field, ≤900 chars):
- Start with camera angle (overhead shot / close-up macro / medium shot at counter height)
- Focus on the COOKING ACTION at that step, not the end result
- Include specific props and motion descriptors
- End with: food cinematography, shallow depth of field, professional kitchen

VEO 3.1 PROMPT rules (veoPrompt field, no character limit):
- Lead with shot type: e.g. "Close-up overhead shot looking straight down."
- ALWAYS establish a named source container if the step involves transferring substance
  (e.g. "large pot of steamed rice", "mixing bowl of batter")
- For fill/scoop/ladle/portion steps with multiple targets write EXPLICIT beat-by-beat choreography.
  Each beat: dip tool INTO source → lift heaped portion → transfer to numbered target → return tool to source.
  Example beat: "(1) The hands dip the wooden scoop deep into the pot of rice, lift a heaped portion,
  and place it into bowl 1. The scoop visibly returns to the pot before the next scoop."
- Use present-tense action verbs
- End with: "Avoid: no empty scoops, no skipping the source container, no food appearing without being scooped first."
- Append style: "Food cinematography, shallow depth of field, professional kitchen, warm lighting."

IMPORTANT:
- Never describe the finished dish
- Duration: 4 (quick prep), 6 (mixing/stirring), 8 (simmering/baking/multi-container fill)

Return a JSON array with objects:
{"stepIndex": 0, "stepText": "...", "runwayPrompt": "...", "veoPrompt": "...", "duration": 6, "cameraAngle": "..."}`;

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
        const rawVeoPrompt = typeof obj.veoPrompt === 'string' ? obj.veoPrompt : '';
        const duration = typeof obj.duration === 'number' ? Math.min(Math.max(obj.duration, 4), 8) : suggestDuration(stepText);
        const cameraAngle = typeof obj.cameraAngle === 'string' ? obj.cameraAngle : suggestCameraAngle(stepText);
        return {
          stepIndex: idx,
          stepText,
          runwayPrompt: rawPrompt.substring(0, 900) || buildFallbackPrompt(stepText, recipeTitle, cameraAngle, idx, totalSteps),
          veoPrompt: rawVeoPrompt || buildFallbackVeoPrompt(stepText, recipeTitle, cameraAngle, idx, totalSteps),
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
    const veoPrompt = buildFallbackVeoPrompt(stepText, recipeTitle, cameraAngle, idx, totalSteps);
    return { stepIndex: idx, stepText, runwayPrompt, veoPrompt, duration, cameraAngle } satisfies StepVideoPrompt;
  });
}

// Zod schema for Firestore storage validation
export const StepVideoSchema = z.object({
  stepIndex: z.number(),
  stepText: z.string(),
  runwayPrompt: z.string(),
  veoPrompt: z.string().optional(),
  duration: z.number(),
  cameraAngle: z.string(),
  videoUrl: z.string().optional(),
  videoGeneratedAt: z.unknown().optional(),
  stepKeyframeUrl: z.string().optional(),
});

export type StepVideoRecord = z.infer<typeof StepVideoSchema>;
