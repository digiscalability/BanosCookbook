import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const SplitScriptInputSchema = z.object({
  script: z.string(),
  sceneCount: z.number().min(2).max(10).default(3),
  visualContext: z
    .object({
      recipeTitle: z.string(),
      keyIngredients: z.array(z.string()).optional(),
      cookingTechniques: z.array(z.string()).optional(),
    })
    .optional(),
});

// Enhanced scene structure with visual continuity markers
const OptimizedSceneSchema = z.object({
  sceneNumber: z.number(),
  script: z.string().describe('Narration/text for this scene'),
  description: z.string().describe('Visual summary of scene action'),
  visualElements: z.array(z.string()).describe('Key visual elements, props, ingredients visible'),
  cameraWork: z
    .string()
    .describe('Primary camera technique: overhead, close-up, wide, tracking, static'),
  lighting: z.string().describe('Lighting style: natural, warm, dramatic, bright'),
  colorPalette: z.string().describe('Dominant colors in frame'),
  keyMoments: z.array(z.string()).describe('Specific visual beats within the scene'),
  runwayPrompt: z.string().describe('Optimized prompt for Runway ML video generation'),
  transitionTo: z
    .string()
    .describe(
      'How to transition to next scene: match-cut on [object], fade through [action], quick cut'
    ),
  continuityNotes: z.object({
    propsFromPrevious: z
      .array(z.string())
      .describe('Props/elements that should carry over from previous scene'),
    propsForNext: z.array(z.string()).describe('Props/elements to maintain for next scene'),
    lightingConsistency: z.string().describe('Lighting consistency requirement'),
    compositionHint: z.string().describe('Composition guidance for visual flow'),
  }),
  duration: z.number().describe('Suggested scene duration in seconds'),
  pacing: z.enum(['slow', 'medium', 'fast']).describe('Scene pacing/energy'),
});

const SplitScriptOutputSchema = z.object({
  scenes: z.array(OptimizedSceneSchema),
  overallStyle: z.string().describe('Unified visual style across all scenes'),
  continuityGuidelines: z.string().describe('Global continuity rules for the video'),
});

export type SplitScriptInput = z.infer<typeof SplitScriptInputSchema>;
export type SplitScriptOutput = z.infer<typeof SplitScriptOutputSchema>;

const SPLIT_SCRIPT_OPTIMIZED_PROMPT = `You are an expert video editor and cinematographer specializing in food content. Your task is to split a recipe video script into semantically coherent scenes optimized for AI video generation (Runway ML).

**Key Principles:**
1. **Semantic Boundaries**: Split on natural action transitions, not arbitrary text breaks
   - Bad: Mid-sentence or mid-action splits
   - Good: Complete visual moments (ingredient added → mixed → result shown)

2. **Visual Continuity**: Each scene must build on the previous visually
   - Track props/ingredients across scenes (wooden spoon in Scene 1 → same spoon in Scene 2)
   - Maintain lighting consistency (if Scene 1 is golden hour, Scene 2 should match)
   - Composition flow (overhead in Scene 1 → close-up in Scene 2 = intentional zoom progression)

3. **Runway-Optimized Prompts**: Generate prompts that are:
   - Cinematography-first (camera angle → action → lighting)
   - Under 800 characters (Runway limit: 1000, leave buffer)
   - Specific visual language (not "cook the dish" but "overhead shot of olive oil drizzling into sizzling pan, steam rising, golden lighting")
   - Include continuity cues ("continuing from the previous mixing action...")

4. **Scene Pacing**: Distribute duration based on visual complexity
   - Simple actions (pouring): 3-5 seconds
   - Complex actions (assembly): 5-8 seconds
   - Payoff moments (final plating): 4-7 seconds

5. **Avoid Generic Intros/Outros**: Skip "Welcome to..." or "Thanks for watching" - focus on core cooking action

6. **Transition Planning**: Specify how scenes connect visually
   - Match-cut: "Close-up of knife cutting → cut tomato on cutting board"
   - Action continuity: "Hand stirring → stir completes, camera pulls back"
   - Fade through: "Steam fades → reveals plated dish"

**Output Requirements:**
- Each scene has a Runway-optimized prompt ready for image-to-video generation
- Continuity notes track props, lighting, composition between scenes
- Visual elements list ensures consistent styling
- Transition specs guide the video editor/combiner

Split the script into {sceneCount} visually coherent scenes that tell a complete story.`;

export const splitScriptIntoScenesOptimizedFlow = ai.defineFlow(
  {
    name: 'splitScriptIntoScenesOptimizedFlow',
    inputSchema: SplitScriptInputSchema,
    outputSchema: SplitScriptOutputSchema,
  },
  async input => {
    const { script, sceneCount, visualContext } = input;

    const contextInfo = visualContext
      ? `
**Recipe Context:**
- Title: ${visualContext.recipeTitle}
- Key Ingredients: ${visualContext.keyIngredients?.join(', ') || 'N/A'}
- Techniques: ${visualContext.cookingTechniques?.join(', ') || 'N/A'}
`
      : '';

    const userPrompt = `Split this recipe video script into ${sceneCount} scenes with full visual continuity planning:

${contextInfo}

**Script to Split:**
${script}

**Requirements:**
- ${sceneCount} semantically coherent scenes (complete visual moments)
- Each scene has a Runway-ready prompt (under 800 chars, cinematography-focused)
- Continuity tracking (props, lighting, composition between scenes)
- Natural transitions (match-cuts, action continuity, fades)
- Skip any generic intro/outro phrases
- Focus on the most visually compelling cooking actions

Generate optimized scenes for seamless AI video generation.`;

    try {
      const result = await ai.generate({
        model: 'googleai/gemini-2.5-pro',
        prompt: `${SPLIT_SCRIPT_OPTIMIZED_PROMPT}\n\n${userPrompt}`,
        output: {
          schema: SplitScriptOutputSchema,
        },
        config: {
          temperature: 0.6, // Balanced: creative but consistent
          maxOutputTokens: 2500,
        },
      });

      return result.output as SplitScriptOutput;
    } catch (error) {
      console.error('Optimized scene splitting failed, using enhanced fallback:', error);
      return createEnhancedFallbackScenes(input);
    }
  }
);

/**
 * Enhanced fallback: Intelligently split script with basic continuity awareness
 */
function createEnhancedFallbackScenes(input: SplitScriptInput): SplitScriptOutput {
  const { script, sceneCount, visualContext } = input;

  // Remove generic intro/outro patterns
  const cleanScript = removeGenericIntroOutro(script);

  // Split on semantic boundaries (action verbs, ingredient mentions, technique changes)
  const semanticChunks = splitOnSemanticBoundaries(cleanScript);

  // Distribute chunks into scenes
  const chunkSize = Math.ceil(semanticChunks.length / sceneCount);
  const scenes: z.infer<typeof OptimizedSceneSchema>[] = [];

  let previousProps: string[] = [];
  const globalLighting = 'warm, natural kitchen lighting';
  const globalStyle =
    'Cinematic food videography, shallow depth of field, appetizing color grading';

  for (let i = 0; i < sceneCount; i++) {
    const chunk = semanticChunks.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
    const sceneNumber = i + 1;

    // Extract visual elements from text
    const visualElements = extractVisualElements(chunk);
    const cameraWork = suggestCameraWork(sceneNumber, sceneCount);

    // Build Runway-optimized prompt
    const runwayPrompt = buildRunwayPrompt({
      recipeTitle: visualContext?.recipeTitle || 'Recipe',
      sceneNumber,
      totalScenes: sceneCount,
      script: chunk,
      cameraWork,
      visualElements,
      previousProps,
      lighting: globalLighting,
    });

    scenes.push({
      sceneNumber,
      script: chunk,
      description: chunk.slice(0, 150),
      visualElements,
      cameraWork,
      lighting: globalLighting,
      colorPalette: 'Warm oranges, browns, fresh greens',
      keyMoments: [chunk.slice(0, 100)],
      runwayPrompt,
      transitionTo: sceneNumber < sceneCount ? 'Quick cut on action' : 'Fade to finish',
      continuityNotes: {
        propsFromPrevious: previousProps,
        propsForNext: visualElements.slice(0, 2),
        lightingConsistency: globalLighting,
        compositionHint: `Maintain ${cameraWork} aesthetic`,
      },
      duration: 5 + (sceneNumber === sceneCount ? 2 : 0),
      pacing: sceneNumber === 1 ? 'fast' : sceneNumber === sceneCount ? 'medium' : 'medium',
    });

    previousProps = visualElements.slice(0, 2);
  }

  return {
    scenes,
    overallStyle: globalStyle,
    continuityGuidelines:
      'Maintain warm, natural lighting and consistent kitchen setting throughout. Use same wooden utensils and ceramic bowls across scenes for visual continuity.',
  };
}

/**
 * Remove generic intro/outro patterns from script
 */
function removeGenericIntroOutro(script: string): string {
  const introRegex =
    /^(welcome|hi|hello|today we're|let's|in this video|introduction).{0,100}?\./im;
  const outroRegex = /(enjoy|thanks for watching|bon appétit|see you|hope you).{0,100}?$/im;

  return script.replace(introRegex, '').replace(outroRegex, '').trim();
}

/**
 * Split script on semantic boundaries (actions, ingredients, techniques)
 */
function splitOnSemanticBoundaries(script: string): string[] {
  // Split on action verbs and ingredient mentions
  const actionMarkers =
    /(?<=\.)[\s]*(?=[A-Z][a-z]*\s+(heat|add|mix|stir|cook|pour|chop|dice|blend|season|garnish|serve))/g;
  const chunks = script.split(actionMarkers).filter(Boolean);

  // If splitting resulted in too few chunks, fall back to sentence splitting
  if (chunks.length < 2) {
    return script
      .split(/\.\s+/)
      .filter(Boolean)
      .map(s => s + '.');
  }

  return chunks;
}

/**
 * Extract visual elements (ingredients, tools, techniques) from text
 */
function extractVisualElements(text: string): string[] {
  const elements: Set<string> = new Set();

  // Common cooking tools and ingredients patterns
  const patterns = [
    /\b(pan|pot|bowl|knife|spoon|spatula|whisk|cutting board|plate|dish)\b/gi,
    /\b(oil|butter|salt|pepper|garlic|onion|tomato|cheese|sauce|herbs?)\b/gi,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) matches.forEach(m => elements.add(m.toLowerCase()));
  });

  return Array.from(elements).slice(0, 5);
}

/**
 * Suggest camera work based on scene position
 */
function suggestCameraWork(sceneNumber: number, totalScenes: number): string {
  if (sceneNumber === 1) return 'Overhead shot, establishing ingredients';
  if (sceneNumber === totalScenes) return 'Close-up on final plating';
  return sceneNumber % 2 === 0 ? 'Close-up on cooking action' : 'Medium wide shot, hands in frame';
}

/**
 * Build Runway-optimized prompt from scene data
 */
function buildRunwayPrompt(params: {
  recipeTitle: string;
  sceneNumber: number;
  totalScenes: number;
  script: string;
  cameraWork: string;
  visualElements: string[];
  previousProps: string[];
  lighting: string;
}): string {
  const { recipeTitle, sceneNumber, script, cameraWork, visualElements, previousProps, lighting } =
    params;
  // totalScenes is kept in params for future use (e.g., final scene handling)

  const continuityPhrase =
    sceneNumber > 1 && previousProps.length > 0
      ? `Continuing from previous scene with ${previousProps.join(', ')} visible. `
      : '';

  const cleanScript = script.replace(/\s+/g, ' ').trim().slice(0, 300);

  return `${continuityPhrase}${cameraWork} of ${recipeTitle}. ${cleanScript}. ${visualElements.length > 0 ? `Key elements: ${visualElements.join(', ')}.` : ''} ${lighting}, cinematic food videography, shallow depth of field, appetizing.`.slice(
    0,
    800
  );
}
