/**
 * Generate videos for multiple scenes using the optimized continuity system
 */
export async function generateMultiSceneVideo(
  recipeImageUrl: string,
  recipeTitle: string,
  multiSceneScript: {
    scenes: Array<{
      sceneNumber: number;
      description?: string;
      visualElements?: string[];
      script: string;
      advancedOptions?: SceneAdvancedOptions;
      duration?: number;
      transition?: string;
      imageUrls?: string[];
      keyframeUrl?: string;
      cameraWork?: string;
      lighting?: string;
      runwayPrompt?: string; // Pre-generated optimized prompt from AI flow
      continuityNotes?: string | { // Continuity metadata from optimized splitting
        propsFromPrevious?: string[];
        propsForNext?: string[];
        lightingConsistency?: string;
        compositionHint?: string;
      };
    }>;
  },
  model: RunwayModel = 'gen4_turbo',
  options?: RunwayRequestOptions
): Promise<{
  sceneVideos: Array<{
    sceneNumber: number;
    videoUrl: string;
    script: string;
    taskId?: string;
    promptText?: string;
    settings?: { model: RunwayModel; ratio: string; duration: number };
    referenceImage?: string;
    promptSummary?: string;
  }>;
  combinedInstructions: string;
}> {
  // Import the optimized prompt builder
  const { buildRunwayPromptWithContinuity, extractVisualContinuity, validateRunwayPrompt } = await import('./runway-prompt-optimizer');

  const sceneVideos: Array<{
    sceneNumber: number;
    videoUrl: string;
    script: string;
    taskId?: string;
    promptText?: string;
    settings?: { model: RunwayModel; ratio: string; duration: number };
    referenceImage?: string;
    promptSummary?: string;
  }> = [];

  const totalScenes = multiSceneScript.scenes.length;
  let previousSceneContinuity: ReturnType<typeof extractVisualContinuity> | undefined;

  for (const scene of multiSceneScript.scenes) {
    const sceneNumber = typeof scene.sceneNumber === 'number' ? scene.sceneNumber : sceneVideos.length + 1;
    const script = sanitizeSceneText(scene.script);
    const description = sanitizeSceneText(scene.description || '');
    const visuals = Array.isArray(scene.visualElements)
      ? scene.visualElements.map(sanitizeSceneText).filter(Boolean)
      : [];

    // Use pre-generated runwayPrompt if available (from optimized AI split flow)
    // Otherwise build one with continuity system
    let prompt: string;
    if (scene.runwayPrompt && scene.runwayPrompt.trim().length > 0) {
      prompt = scene.runwayPrompt;
      console.log(`✨ Using pre-generated optimized prompt for Scene ${sceneNumber} (${prompt.length} chars)`);

      // If continuity data is available, prepend continuity context
      if (previousSceneContinuity && scene.continuityNotes) {
        const continuityPrefix = `Continuing from previous scene: ${previousSceneContinuity.endingAction}. `;
        if (!prompt.toLowerCase().includes('continuing') && !prompt.toLowerCase().includes('from previous')) {
          prompt = continuityPrefix + prompt;
          // Trim to stay under limit
          if (prompt.length > 950) {
            prompt = continuityPrefix + scene.runwayPrompt.substring(0, 950 - continuityPrefix.length);
          }
        }
      }
    } else {
      // Fallback: build prompt dynamically (for legacy scenes or manual edits)
      console.log(`⚙️  Building prompt dynamically for Scene ${sceneNumber} (no pre-generated prompt found)`);
      prompt = buildRunwayPromptWithContinuity(
        {
          recipeTitle,
          script,
          description,
          visualElements: visuals,
          cameraWork: scene.cameraWork,
          lighting: scene.lighting,
          colorGrading: scene.advancedOptions?.colorGrading,
          negativePrompt: scene.advancedOptions?.negativePrompt,
          duration: scene.duration,
        },
        previousSceneContinuity ? {
          previousScene: previousSceneContinuity,
          sceneNumber,
          totalScenes,
          transition: scene.transition,
        } : undefined
      );
    }

    // Validate prompt quality
    const validation = validateRunwayPrompt(prompt);
    if (!validation.valid) {
      console.warn(`⚠️  Scene ${sceneNumber} prompt quality: ${validation.score}/100`, validation.warnings);
    } else {
      console.log(`✅ Scene ${sceneNumber} prompt quality: ${validation.score}/100`);
    }

    const ratio = typeof options?.ratio === 'string' ? options.ratio : '1280:720';
    const duration = typeof scene.duration === 'number' ? scene.duration : (typeof options?.duration === 'number' ? options.duration : 5);
    const requestOptions: Record<string, unknown> = {};
    if (typeof options?.maxRetries === 'number') requestOptions['maxRetries'] = options.maxRetries;
    if (typeof options?.timeoutMs === 'number') requestOptions['timeout'] = options.timeoutMs;

    const referenceImage = selectReferenceImage(scene, recipeImageUrl);

    console.log(`🎬 Generating Scene ${sceneNumber}/${totalScenes} with optimized prompt (${prompt.length} chars, quality: ${validation.score}/100)`);

    const task = await getRunwayClient().imageToVideo.create({
      model,
      promptImage: referenceImage,
      promptText: prompt,
      ratio: ratio as "1280:720" | "720:1280" | "1104:832" | "832:1104" | "960:960" | "1584:672" | "1280:768" | "768:1280",
      duration: duration as 2 | 3 | 5 | 4 | 6 | 7 | 8 | 9 | 10 | undefined,
    }, requestOptions as unknown as Record<string, unknown>).waitForTaskOutput();

    const videoUrl = task.output?.[0];
    if (!videoUrl) {
      throw new Error(`No video URL for scene ${sceneNumber}`);
    }

    sceneVideos.push({
      sceneNumber,
      videoUrl,
      script,
      taskId: task.id,
      promptText: prompt,
      settings: { model, ratio, duration },
      referenceImage,
      promptSummary: [description, visuals.join(', ')].filter(Boolean).join(' — ') || script.substring(0, 120),
    });
    console.log(`✅ Scene ${sceneNumber} video generated:`, videoUrl);

    // Extract continuity for next scene
    previousSceneContinuity = extractVisualContinuity({
      script,
      visualElements: visuals,
      cameraWork: scene.cameraWork,
      lighting: scene.lighting,
      colorGrading: scene.advancedOptions?.colorGrading,
    });
  }

  const normalizedForInstructions = {
    scenes: multiSceneScript.scenes.map((s, index) => ({
      sceneNumber: typeof s.sceneNumber === 'number' ? s.sceneNumber : index + 1,
      duration: typeof s.duration === 'number' ? s.duration : (options?.duration ?? 5),
      script: sanitizeSceneText(s.script),
      transition: s.transition,
      referenceImage: selectReferenceImage(s, recipeImageUrl),
    })),
  };

  const combinedInstructions = createVideoCombinationInstructions(normalizedForInstructions, sceneVideos);
  return {
    sceneVideos,
    combinedInstructions,
  };
}

/**
 * Check the status of a RunwayML video generation task
 */
export async function checkVideoStatus(taskId: string): Promise<{ status: string; progress?: number; output?: unknown }> {
  const client = getRunwayClient();
  const task = await client.tasks.retrieve(taskId);
  return {
    status: task.status,
    progress: task.progress,
    output: task.output,
  };
}
// Unified, model-aware prompt/config builder for scene-level video/image generation
export interface SceneAdvancedOptions {
  voiceOver?: { enabled?: boolean; text?: string; voice?: string };
  backgroundMusic?: { enabled?: boolean; genre?: string };
  animation?: { style?: string };
  colorGrading?: string;
  cameraShot?: string;
  duration?: number;
  aspectRatio?: string;
  negativePrompt?: string;
  personGeneration?: 'allow_all' | 'dont_allow' | 'allow_adult';
  overlays?: string[];
  transitions?: { enabled?: boolean; type?: string; duration?: number };
  effects?: { textOverlays?: boolean; backgroundMusic?: boolean; colorGrading?: string };
  generateAudio?: boolean;
}

export type SupportedModel = 'runwayml' | 'genkit' | 'google-genai' | 'openai-dalle' | 'gemini';

/**
 * Build a model-aware prompt and config for scene-level generation
 * @param modelType Which model family (runwayml, genkit, google-genai, openai-dalle, gemini)
 * @param recipeTitle Recipe title
 * @param sceneScript Full scene script/description
 * @param advOpts Advanced options (voice, music, animation, etc.)
 * @returns { prompt: string, config: object }
 */
export interface ScenePromptContext {
  sceneNumber: number;
  totalScenes: number;
  description?: string;
  visualElements?: string[];
  previousSummary?: string;
  previousVisuals?: string[];
  transition?: string;
  previousTransition?: string;
}

export function buildScenePromptAndConfig(
  modelType: SupportedModel,
  recipeTitle: string,
  sceneScript: string,
  advOpts: SceneAdvancedOptions = {},
  context?: ScenePromptContext
): { prompt: string; config: Record<string, unknown> } {
  const segments: string[] = [];

  if (context) {
    segments.push(`Scene ${context.sceneNumber} of ${context.totalScenes} for the recipe "${recipeTitle}".`);
    if (context.previousSummary) {
      segments.push(`Continue naturally from the prior moment where ${context.previousSummary}.`);
    } else {
      segments.push(`Open the story for "${recipeTitle}" with an inviting moment.`);
    }
    if (context.transition) {
      segments.push(`Lead with a ${context.transition.toLowerCase()} transition into the new action.`);
    }
    if (context.previousTransition) {
      segments.push(`Respect the previous transition (${context.previousTransition.toLowerCase()}) to keep pacing smooth.`);
    }
  } else {
    segments.push(`Recipe video: "${recipeTitle}".`);
  }

  if (context?.description) segments.push(`Focus on ${context.description}.`);
  if (context?.visualElements?.length) segments.push(`Key visuals: ${context.visualElements.join(', ')}.`);
  if (context?.previousVisuals?.length) segments.push(`Maintain continuity of props like ${context.previousVisuals.join(', ')}.`);

  const cleanedScript = sceneScript.replace(/\s+/g, ' ').trim();
  if (cleanedScript) segments.push(cleanedScript);

  let prompt = `${segments.join(' ')} Cinematic food storytelling, smooth camera movement, appetizing lighting, consistent kitchen setting.`;

  if (advOpts.cameraShot) prompt += ` Camera: ${advOpts.cameraShot}.`;
  if (advOpts.colorGrading) prompt += ` Color grading: ${advOpts.colorGrading}.`;
  if (advOpts.negativePrompt) prompt += ` Avoid: ${advOpts.negativePrompt}.`;

  const config: Record<string, unknown> = {};

  if (modelType === 'runwayml') {
    if (advOpts.duration) config.duration = advOpts.duration;
    if (advOpts.aspectRatio) config.ratio = advOpts.aspectRatio;
  }

  return { prompt, config };
}
// Supported Runway models
export type RunwayModel = 'gen4_turbo' | 'gen3a_turbo' | 'veo3';
export const RUNWAY_MODELS: { id: RunwayModel; name: string; description: string }[] = [
  { id: 'gen4_turbo', name: 'Gen-4 Turbo', description: 'Fast, high-quality food video generation (recommended)' },
  { id: 'gen3a_turbo', name: 'Gen-3 Alpha Turbo', description: 'Previous-gen, stylized video model' },
  { id: 'veo3', name: 'Veo 3', description: 'Experimental, cinematic video model (may be slower)' },
];
/**
 * OpenAI Video Generation Utility
 *
 * Note: As of 2025, OpenAI doesn't have a public text-to-video API.
 * This utility generates a storyboard image using DALL-E 3 based on the video script.
 * The image can be used as a preview/thumbnail for the video concept.
 *
 * When OpenAI releases a text-to-video API, this can be easily upgraded.
 */


export interface VideoGenerationInput {
  script: string;
  title: string;
  marketingIdeas?: string[];
}

export interface VideoGenerationResult {
  success: boolean;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

/**
 * Generates a video storyboard image using OpenAI's DALL-E 3
 */
// Ensure RUNWAYML_API_SECRET is set before importing the SDK
if (typeof process !== 'undefined' && process.env && !process.env.RUNWAYML_API_SECRET) {
  process.env.RUNWAYML_API_SECRET = process.env.RUNWAY_API_KEY || '';
}

// Set the environment variable that the SDK expects before any imports
if (typeof process !== 'undefined' && process.env && !process.env.RUNWAYML_API_SECRET && process.env.RUNWAY_API_KEY) {
  process.env.RUNWAYML_API_SECRET = process.env.RUNWAY_API_KEY;
}

import RunwayML, { TaskFailedError } from '@runwayml/sdk';

// Lazy client initialization to avoid module-level instantiation issues
let client: RunwayML | null = null;

export function getRunwayClient(): RunwayML {
  if (!client) {
    client = new RunwayML({
      apiKey: process.env.RUNWAYML_API_SECRET,
    });
  }
  return client;
}

export interface RunwayRequestOptions {
  ratio?: string; // e.g. '1280:720' or '1080:1920'
  duration?: number; // seconds
  timeoutMs?: number; // request timeout override
  maxRetries?: number; // retry override
  // Optional audio URL to be used/merged into the generated video if Runway supports it
  audioUrl?: string;
  promptOverride?: string;
  advancedOptions?: SceneAdvancedOptions;
}

/**
 * Generate a video from a recipe image and video script using Runway ML Gen-4 Turbo
 * @param recipeImageUrl - URL of the recipe image (from Firestore)
 * @param recipeTitle - Title of the recipe
 * @param videoScript - The video script/concept
 * @returns URL of the generated video
 */
/**
 * Intelligently truncate and optimize the video script for Runway ML prompt
 * Runway ML has a 1000 character limit for promptText
 *
 * @deprecated Use buildRunwayPromptWithContinuity from runway-prompt-optimizer.ts for better results
 */
export type SceneMeta = {
  voiceOver?: { enabled?: boolean; text?: string; voice?: string };
  backgroundMusic?: { enabled?: boolean; genre?: string };
  animation?: { style?: string };
  colorGrading?: string;
  cameraShot?: string; // e.g. 'close-up, top-down, dolly in'
};

export async function optimizePromptForRunway(recipeTitle: string, videoScript: string, meta?: SceneMeta): Promise<string> {
  // Import the new optimizer for better results
  const { buildRunwayPromptWithContinuity } = await import('./runway-prompt-optimizer');

  return buildRunwayPromptWithContinuity({
    recipeTitle,
    script: videoScript,
    cameraWork: meta?.cameraShot,
    lighting: undefined,
    colorGrading: meta?.colorGrading,
    visualElements: [],
  });
}
export async function generateRecipeVideo(
  recipeImageUrl: string,
  recipeTitle: string,
  videoScript: string,
  model: RunwayModel = 'gen4_turbo',
  options?: RunwayRequestOptions
): Promise<{ videoUrl: string; taskId?: string; promptText: string; settings: { model: RunwayModel; ratio: string; duration: number } }> {
  try {
    // OPTIMIZATION: Clean video script from production cues
    const { prepareForVideoGeneration } = await import('./text-pruning');
    const cleanedScript = prepareForVideoGeneration(videoScript);

    console.log('🎬 Generating video with Runway ML');
    console.log('Recipe:', recipeTitle);
    console.log('Image URL:', recipeImageUrl);
    console.log('Script cleaned:', videoScript.substring(0, 50), '→', cleanedScript.substring(0, 50));

      // Use unified builder for prompt/config unless a custom prompt override is supplied
      const advOpts = options?.advancedOptions || {};
      const overridePrompt = typeof options?.promptOverride === 'string' && options.promptOverride.trim().length > 0 ? options.promptOverride.trim() : undefined;
      const { prompt, config } = overridePrompt
        ? { prompt: overridePrompt, config: { ratio: options?.ratio, duration: options?.duration } }
        : buildScenePromptAndConfig('runwayml', recipeTitle, cleanedScript, advOpts);
      console.log('Prompt:', prompt.substring(0, 100) + '...');
      // Prepare request params
    const ratio = typeof config.ratio === 'string' ? config.ratio : (typeof options?.ratio === 'string' ? options.ratio : '1280:720');
    const duration = typeof config.duration === 'number' ? config.duration : (typeof options?.duration === 'number' ? options.duration : 5);
      const requestOptions: Record<string, unknown> = {};
      if (typeof options?.maxRetries === 'number') requestOptions['maxRetries'] = options!.maxRetries;
      if (typeof options?.timeoutMs === 'number') requestOptions['timeout'] = options!.timeoutMs;
      // Create a new image-to-video task using selected Runway model
      // Add audioUrl to the request if provided (some Runway SDK versions support audio merging)
      const createParams: Record<string, unknown> = {
        model,
        promptImage: recipeImageUrl,
        promptText: prompt,
        ratio: ratio as "1280:720" | "720:1280" | "1104:832" | "832:1104" | "960:960" | "1584:672" | "1280:768" | "768:1280",
        duration: duration as 2 | 3 | 5 | 4 | 6 | 7 | 8 | 9 | 10 | undefined,
      };
      if (options && typeof options === 'object' && (options as Record<string, unknown>).audioUrl) {
        createParams['audioUrl'] = (options as Record<string, unknown>).audioUrl;
      }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createPromise = getRunwayClient().imageToVideo.create(createParams as any, requestOptions as Record<string, unknown>);
      const task = await createPromise.waitForTaskOutput();
      const videoUrl = task.output?.[0];
      if (!videoUrl) {
        throw new Error('No video URL returned');
      }
      return {
        videoUrl,
        taskId: task.id,
        promptText: prompt,
        settings: { model, ratio, duration }
      };
    // Only new builder-based logic should remain above. Errors handled here:
  } catch (error) {
    if (error instanceof TaskFailedError) {
      const taskDetails = (error as TaskFailedError & { taskDetails?: unknown }).taskDetails;
      console.error('❌ Multi-scene video generation failed:', taskDetails);
      throw new Error(`Multi-scene video generation failed: ${JSON.stringify(taskDetails)}`);
    }
    console.error('❌ Error generating video:', error);
    throw error;
  }
}

function sanitizeSceneText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^[\-*\d.\s]+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectReferenceImage(
  scene: { imageUrls?: unknown; keyframeUrl?: unknown },
  fallback: string,
): string {
  if (Array.isArray(scene.imageUrls)) {
    for (const candidate of scene.imageUrls) {
      if (typeof candidate === 'string' && candidate.startsWith('http')) {
        return candidate;
      }
    }
  }

  if (typeof scene.keyframeUrl === 'string' && scene.keyframeUrl.startsWith('http')) {
    return scene.keyframeUrl;
  }

  return fallback;
}

/**
 * Create instructions for combining multiple scene videos
 */
function createVideoCombinationInstructions(
  multiSceneScript: {
    scenes: Array<{
      sceneNumber: number;
      duration: number;
      script: string;
      transition?: string;
      referenceImage?: string;
    }>;
  },
  sceneVideos: Array<{ sceneNumber: number; videoUrl: string; script: string; referenceImage?: string }>
): string {
  const instructions = [
    'MULTI-SCENE VIDEO COMBINATION INSTRUCTIONS',
    '==========================================',
    '',
    'Use CapCut, Adobe Premiere, or similar video editor to combine these scenes:',
    '',
  ];

  multiSceneScript.scenes.forEach((scene) => {
    const video = sceneVideos.find(v => v.sceneNumber === scene.sceneNumber);
    if (video) {
      instructions.push(`Scene ${scene.sceneNumber} (${scene.duration}s):`);
      instructions.push(`  Video: ${video.videoUrl}`);
      instructions.push(`  Script: "${scene.script}"`);
      const referenceImage = scene.referenceImage || video.referenceImage;
      if (referenceImage) {
        instructions.push(`  Reference image: ${referenceImage}`);
      }
      if (scene.transition) {
        instructions.push(`  Transition: ${scene.transition}`);
      }
      instructions.push('');
    }
  });

  instructions.push('Editing Tips:');
  instructions.push('- Add smooth transitions between scenes');
  instructions.push('- Overlay text with scene scripts');
  instructions.push('- Add background music that matches the energy');
  instructions.push('- Ensure total video is under 60 seconds for Reels');
  instructions.push('- Export at 1080x1920 (9:16) for vertical video');

  return instructions.join('\n');
}
