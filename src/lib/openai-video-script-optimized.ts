import OpenAI from 'openai';
import { z } from 'zod';

// Structured output schema for video script
const VisualBeatSchema = z.object({
  timestamp: z.string(),
  visual: z.string(),
  narration: z.string(),
  cameraWork: z.string(),
});

const SceneSchema = z.object({
  sceneNumber: z.number(),
  duration: z.number(),
  visualBeats: z.array(VisualBeatSchema),
  description: z.string(),
  cameraWork: z.string(),
  lighting: z.string(),
  visualElements: z.array(z.string()),
  transition: z.string(),
});

const VideoScriptSchema = z.object({
  concept: z.string(),
  hook: z.string(),
  scenes: z.array(SceneSchema),
  musicSuggestion: z.string(),
  marketingIdeas: z.array(z.string()),
  totalDuration: z.number(),
  styleConsistency: z.string(),
  colorPalette: z.string(),
});

export interface OpenAIVideoScriptResult {
  concept: string;
  hook: string;
  scenes: Array<{
    sceneNumber: number;
    duration: number;
    visualBeats: Array<{
      timestamp: string;
      visual: string;
      narration: string;
      cameraWork: string;
    }>;
    description: string;
    cameraWork: string;
    lighting: string;
    visualElements: string[];
    transition: string;
  }>;
  musicSuggestion: string;
  marketingIdeas: string[];
  totalDuration: number;
  styleConsistency: string;
  colorPalette: string;
}

export interface OptimizedVideoScriptInput {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cuisine: string;
  targetDuration?: number; // seconds (default 45)
  style?: 'trendy' | 'professional' | 'casual' | 'educational'; // default 'trendy'
}

const OPTIMIZED_SYSTEM_PROMPT = `You are an expert food videographer and scriptwriter for viral short-form content (Instagram Reels, TikTok).

**Your Specialty:**
Creating VISUALLY-DRIVEN scripts where every second is a compelling visual moment optimized for AI video generation (Runway ML).

**Core Principles:**
1. **Visual-First Thinking**: Lead with striking visuals, not narration. Show, don't tell.
2. **3-Second Hook Rule**: First 3 seconds must grab attention with the most visually satisfying moment
3. **Cinematography Language**: Specify exact camera angles (overhead, close-up, dolly-in) for each beat
4. **Visual Continuity**: Track props, lighting, and composition across scenes for seamless flow
5. **Food Videography Best Practices**:
   - Natural/warm lighting for appetizing appeal
   - Shallow depth of field (blurred background, sharp foreground)
   - Close-ups on texture, steam, sizzle, pour, melt
   - Overhead shots for ingredient assembly
   - Slow motion for satisfying moments (cheese pull, sauce drizzle)
6. **Silent-Friendly**: Visuals must tell the story without sound (most viewers watch muted)
7. **Pacing**: Match cut rhythm to recipe energy (fast for action, slow for payoff)

**Runway ML Optimization:**
- Each scene gets a Runway-ready prompt (under 800 chars)
- Specific camera specs (not "nice shot" but "overhead, natural light, shallow focus")
- Continuity markers (same wooden spoon from Scene 1 in Scene 2)
- Lighting consistency (maintain warm, golden hour feel throughout)

**Output Structure:**
Generate a complete visual script with:
- Timestamped visual beats (what the camera shows)
- Camera work for each moment
- Props/elements tracking
- Transition types (match-cut, fade, quick-cut)
- Style consistency guidelines

Focus on visually APPETIZING moments: sizzling, pouring, melting, steam, texture reveals, final plating.`;

export async function generateOptimizedVideoScriptWithOpenAI(
  input: OptimizedVideoScriptInput
): Promise<OpenAIVideoScriptResult> {
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) throw new Error('No OpenAI API key configured');

  const openai = new OpenAI({ apiKey: API_KEY });

  const { title, description, ingredients, instructions, cuisine, targetDuration = 45, style = 'trendy' } = input;

  const ingredientsList = ingredients.slice(0, 5).join(', ') + (ingredients.length > 5 ? '...' : '');
  const keySteps = instructions.slice(0, 3).join(' → ');

  const styleGuidance = {
    trendy: 'Fast-paced, high-energy, trending music/text overlays, rapid cuts',
    professional: 'Smooth, cinematic, elegant transitions, sophisticated pacing',
    casual: 'Relatable, homey, authentic feel, steady pacing',
    educational: 'Clear, instructional, step-by-step focus, methodical pacing',
  };

  const userPrompt = `Create a ${targetDuration}-second ${style} video script for this recipe:

**Recipe:** "${title}"
**Description:** ${description}
**Cuisine:** ${cuisine}
**Key Ingredients:** ${ingredientsList}
**Cooking Flow:** ${keySteps}

**Target Audience:** Instagram/TikTok food lovers (watch on mute, scroll fast, crave visual satisfaction)

**Style:** ${styleGuidance[style]}

**Requirements:**
- Total duration: ~${targetDuration} seconds (split into 2-4 scenes)
- Hook in first 3 seconds (use most visually striking moment)
- Every visual beat needs camera work specification
- Include props/element tracking for visual continuity
- Specify transitions between scenes
- Optimize for Runway ML video generation (clear visual descriptions, cinematography specs)
- Focus on visually APPETIZING stages: sizzling, pouring, melting, plating, steam, texture

Return structured JSON matching the VideoScriptSchema.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: OPTIMIZED_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.85, // Higher for creative visual concepts
    });

    const content = response.choices[0].message?.content || '{}';
    const parsed = JSON.parse(content);

    // Validate with Zod
    const validated = VideoScriptSchema.safeParse(parsed);

    if (!validated.success) {
      console.warn('OpenAI response validation failed, using fallback structure:', validated.error);
      // Create a simplified valid structure
      return createFallbackStructure(input);
    }

    return validated.data as OpenAIVideoScriptResult;
  } catch (error) {
    console.error('OpenAI video script generation failed:', error);
    return createFallbackStructure(input);
  }
}

/**
 * Create a basic fallback structure if OpenAI fails or returns invalid data
 */
function createFallbackStructure(input: OptimizedVideoScriptInput): OpenAIVideoScriptResult {
  const { title, ingredients, instructions, targetDuration = 45 } = input;

  return {
    concept: `Visual cooking journey for ${title}`,
    hook: `Start with the most visually striking moment from ${title}`,
    scenes: [
      {
        sceneNumber: 1,
        duration: 15,
        visualBeats: [
          {
            timestamp: '0:00-0:05',
            visual: `Overhead shot of fresh ${ingredients[0] || 'ingredients'} arranged on cutting board`,
            narration: `Beautiful ${title} starts here`,
            cameraWork: 'Overhead, natural light, shallow focus',
          },
          {
            timestamp: '0:05-0:15',
            visual: `Close-up of hands ${instructions[0] || 'preparing ingredients'}`,
            narration: 'The key is fresh ingredients',
            cameraWork: 'Close-up, tracking hands, warm lighting',
          }
        ],
        description: 'Introduction and ingredient setup',
        cameraWork: 'Overhead establishing shot transitioning to close-up',
        lighting: 'Warm, natural kitchen lighting',
        visualElements: ingredients.slice(0, 3),
        transition: 'Quick cut to cooking action',
      },
      {
        sceneNumber: 2,
        duration: 20,
        visualBeats: [
          {
            timestamp: '0:15-0:25',
            visual: `Medium shot of ${instructions[1] || 'cooking process'}, steam rising`,
            narration: 'Watch the magic happen',
            cameraWork: 'Medium shot, slight dolly in, dramatic lighting',
          },
          {
            timestamp: '0:25-0:35',
            visual: 'Close-up of sizzling, bubbling, or transforming food',
            narration: 'The transformation',
            cameraWork: 'Extreme close-up, shallow depth of field',
          }
        ],
        description: 'Core cooking action and transformation',
        cameraWork: 'Medium to close-up progression',
        lighting: 'Warm, dramatic with visible steam',
        visualElements: ['pan', 'spatula', ingredients[1] || 'main ingredient'],
        transition: 'Match-cut on stirring action',
      },
      {
        sceneNumber: 3,
        duration: 10,
        visualBeats: [
          {
            timestamp: '0:35-0:45',
            visual: `Close-up of final plated ${title}, garnish being added`,
            narration: 'Perfection achieved',
            cameraWork: 'Close-up on plate, slow motion garnish drop',
          }
        ],
        description: 'Final plating and presentation',
        cameraWork: 'Close-up, static, perfect composition',
        lighting: 'Bright, natural, appetizing',
        visualElements: ['plate', 'garnish', 'final dish'],
        transition: 'Fade to end card',
      }
    ],
    musicSuggestion: 'Upbeat, modern instrumental (120-130 BPM)',
    marketingIdeas: [
      'Add trending sound/music',
      'Use text overlays for key ingredients',
      'Challenge viewers to recreate',
    ],
    totalDuration: targetDuration,
    styleConsistency: 'Warm, natural lighting throughout. Consistent kitchen setting. Same props and utensils across scenes.',
    colorPalette: 'Warm oranges, browns, fresh greens, natural wood tones',
  };
}
