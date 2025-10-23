import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const GenerateVideoScriptInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  cuisine: z.string().optional(),
  targetDuration: z.number().min(15).max(90).default(45), // seconds
  style: z.enum(['trendy', 'professional', 'casual', 'educational']).default('trendy'),
});

// Enhanced structured output for video script with visual storytelling
const VisualBeatSchema = z.object({
  timestamp: z.string().describe('Timing marker (e.g., "0:00-0:05")'),
  visual: z
    .string()
    .describe("Specific visual action/moment (camera angle, what's shown, movement)"),
  narration: z.string().describe('Voice-over or text overlay for this moment'),
  cameraWork: z
    .string()
    .describe('Camera technique: close-up, overhead, dolly in, pan, static, handheld'),
  lighting: z.string().describe('Lighting mood: bright/natural, warm/golden hour, dramatic/moody'),
  props: z.array(z.string()).describe('Key props/ingredients visible in frame'),
  intensity: z.enum(['calm', 'medium', 'energetic']).describe('Pacing/energy level'),
});

const SceneBreakdownSchema = z.object({
  sceneNumber: z.number(),
  purpose: z.string().describe('Narrative purpose: hook, setup, action, payoff, CTA'),
  duration: z.number().describe('Target duration in seconds'),
  visualBeats: z.array(VisualBeatSchema),
  transition: z.string().describe('Transition to next scene: cut, fade, wipe, match-cut'),
});

const GenerateVideoScriptOutputSchema = z.object({
  concept: z.string().describe('One-line video concept/angle'),
  hook: z.string().describe('First 3 seconds - the attention grabber'),
  scenes: z.array(SceneBreakdownSchema),
  musicSuggestion: z.string().describe('Background music style/mood'),
  marketingIdeas: z.array(z.string()),
  totalDuration: z.number().describe('Total video duration in seconds'),
  runwayPromptHints: z.object({
    styleConsistency: z.string().describe('Visual style to maintain across all scenes'),
    colorPalette: z.string().describe('Color grading/palette suggestion'),
    overallPacing: z.string().describe('Pacing guidance for video editor'),
  }),
});

export type GenerateVideoScriptInput = z.infer<typeof GenerateVideoScriptInputSchema>;
export type GenerateVideoScriptOutput = z.infer<typeof GenerateVideoScriptOutputSchema>;

// Optimized system prompt for visual storytelling
const SYSTEM_PROMPT = `You are an expert food videographer and scriptwriter specializing in viral short-form video content for Instagram Reels and TikTok.

Your specialty is creating VISUALLY-DRIVEN scripts where every second has a clear, compelling visual moment. You understand:
- The 3-second rule: Hook viewers instantly with striking visuals
- Visual continuity: Props, lighting, and composition consistency across cuts
- Cinematography language: Overhead shots for assembly, close-ups for texture, dolly-ins for emphasis
- Pacing: Match visual rhythm to recipe energy (fast cuts for sizzling, slow motion for pouring)
- Food videography best practices: Natural light, shallow depth of field, appetizing color grading

**Key Principles:**
1. Lead with VISUALS, not narration - show, don't tell
2. Every scene must have a clear visual purpose (hook, reveal, transformation, payoff)
3. Use cinematography to create emotion (slow zoom on melting cheese = satisfaction)
4. Think in shots, not sentences - each beat is a camera setup
5. Plan for visual continuity - same props, lighting, and composition style across scenes
6. Optimize for silent viewing - visuals must tell the story without sound

**CRITICAL FORMATTING RULES:**
- DO NOT include production markers like [INTRO], [SCENE 1], [OUTRO]
- DO NOT include labels like "On-Screen Text:", "Narrator:", "(Voiceover)"
- DO NOT include "Step 1.", "Step 2." numbering
- Narration should be DIRECT SPEECH only - what the viewer hears/reads
- Visual descriptions should be DIRECT ACTIONS - what the camera shows
- Write narration as if you're speaking directly to the viewer
- Write visuals as camera/cinematography directions

**Good Narration Examples:**
✅ "These 1981 peanut pastries will blow your mind"
✅ "Start with flour, sugar, and shortening in a bowl"
✅ "Watch as the dough transforms into golden perfection"

**Bad Narration Examples (DON'T DO THIS):**
❌ "[INTRO: Scene opens...]"
❌ "On-Screen Text: Lost Recipe from 1981"
❌ "Narrator (Voiceover): These pastries..."
❌ "Step 1. Mix the ingredients"

**Output Structure:**
- Scenes with specific visual beats (camera angle, action, props, lighting)
- Camera work specs (overhead, close-up, pan, dolly, static)
- Transition types (cut, fade, match-cut for visual flow)
- Props/element tracking (to maintain continuity)
- Runway-friendly metadata (style consistency, color palette, pacing)

Generate a complete visual script broken into scenes, where each scene has timestamped visual beats ready for video generation.`;

export const generateVideoScriptOptimizedFlow = ai.defineFlow(
  {
    name: 'generateVideoScriptOptimizedFlow',
    inputSchema: GenerateVideoScriptInputSchema,
    outputSchema: GenerateVideoScriptOutputSchema,
  },
  async input => {
    const { title, description, ingredients, instructions, cuisine, targetDuration, style } = input;

    // Build context-rich user prompt
    const ingredientsList =
      ingredients.slice(0, 5).join(', ') + (ingredients.length > 5 ? '...' : '');
    const keySteps = instructions.slice(0, 3).join(' → ');

    const userPrompt = `Create a ${targetDuration}-second ${style} video script for this recipe:

**Recipe:** "${title}"
**Description:** ${description}
**Cuisine:** ${cuisine || 'Various'}
**Key Ingredients:** ${ingredientsList}
**Cooking Flow:** ${keySteps}

**Target Audience:** Instagram/TikTok food lovers who watch on mute, scroll fast, crave visual satisfaction

**Requirements:**
- Total duration: ~${targetDuration} seconds (split into 2-4 scenes)
- Style: ${style === 'trendy' ? 'Fast-paced, high-energy, trending sounds/text' : style === 'professional' ? 'Smooth, cinematic, elegant transitions' : style === 'casual' ? 'Relatable, homey, authentic feel' : 'Clear, instructional, step-by-step focus'}
- Every scene must have visual beats with specific camera work
- Hook in first 3 seconds (use most visually striking moment)
- Include props/element tracking for visual continuity
- Optimize for Runway ML video generation (clear visual descriptions, cinematography specs)

Focus on the most VISUALLY APPEALING stages of cooking: sizzling, pouring, melting, plating, steam, texture reveals.`;

    const result = await ai.generate({
      model: 'googleai/gemini-2.5-pro',
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      output: {
        schema: GenerateVideoScriptOutputSchema,
      },
      config: {
        temperature: 0.85, // Higher for creative visual concepts
        maxOutputTokens: 2000,
      },
    });

    return result.output as GenerateVideoScriptOutput;
  }
);
