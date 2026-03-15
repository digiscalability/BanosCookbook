'use server';

import type { GeneratedImage } from '@/components/recipe-image-selector';
import type { RunwayModel } from '@/lib/openai-video-gen';
import { generateVideoScriptWithOpenAI } from '@/lib/openai-video-script';
import type { VideoCombinationOptions } from '@/lib/video-combination';

// Type definitions
export interface SplitScene {
  sceneNumber: number;
  script: string;
  description?: string;
  videoUrl?: string;
  imageUrls?: string[];
  advancedOptions?: AdvancedOptions;
  voiceOverUrl?: string;
  voiceoverMeta?: (VoiceOverMetadata & { url?: string; updatedAt?: string }) | null;
  voiceOverMeta?: (VoiceOverMetadata & { url?: string; updatedAt?: string }) | null;
  voiceOverGeneratedAt?: Date | string | number;
  videoGeneratedAt?: Date | string | number;
  imageGeneratedAt?: Date | string | number;
  subtitleLines?: string[];
  promptSummary?: string;
  promptPreview?: string;
  referenceImage?: string;
  // Optimized scene splitting fields
  visualElements?: string[];
  cameraWork?: string;
  lighting?: string;
  colorPalette?: string;
  keyMoments?: string[];
  runwayPrompt?: string; // Pre-generated optimized Runway prompt
  continuityNotes?:
    | string
    | {
        // Can be string or structured object from optimized flow
        propsFromPrevious?: string[];
        propsForNext?: string[];
        lightingConsistency?: string;
        compositionHint?: string;
      };
  duration?: number;
  pacing?: 'slow' | 'medium' | 'fast';
  transitionTo?: string;
}

interface NutritionalInfo {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

interface RecipeFromImage {
  title: string;
  description: string;
  cuisine: string;
  ingredients: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: number;
}

interface RecipesFromPdf {
  recipes: Array<{
    title: string;
    description: string;
    cuisine: string;
    ingredients: string;
    instructions: string;
    prepTime: string;
    cookTime: string;
    servings: number;
  }>;
}

interface AdvancedRecipesFromPdf {
  recipes: Array<{
    title: string;
    description: string;
    ingredients: string;
    instructions: string;
    prepTime: string;
    cookTime: string;
    servings: number;
    cuisine: string;
    difficulty?: string;
    tags?: string[];
    nutritionInfo?: string;
    source?: string;
  }>;
  processingInfo: {
    totalPages: number;
    processingMode: string;
    textExtracted: boolean;
    imagesProcessed: number;
    processingTime: number;
    aiEnhanced: boolean;
    ocrAccuracy?: number;
  };
}

interface RecipeSummary {
  id: string;
  title: string;
  createdAt: Date;
}

// Per-scene advanced options used across actions
interface AdvancedOptions {
  duration?: number;
  animation?: { enabled?: boolean; style?: string; [key: string]: unknown };
  voice?: {
    enabled?: boolean;
    voiceId?: string;
    url?: string;
    text?: string;
    pitch?: number;
    rate?: number;
    [key: string]: unknown;
  };
  music?: { enabled?: boolean; genre?: string; volume?: number; [key: string]: unknown };
  cameraShot?: string;
  colorGrading?: string;
}

/**
 * Generate an image for a single scene using Gemini (via Genkit flow)
 */
export async function generateSceneImageAction({
  recipeId,
  sceneNumber,
  title,
  description,
  cuisine,
  ingredients,
  sceneScript,
  sceneDescription,
}: {
  recipeId?: string;
  sceneNumber?: number;
  title: string;
  description: string;
  cuisine: string;
  ingredients: string;
  sceneScript: string;
  sceneDescription?: string;
}): Promise<{
  success: boolean;
  imageUrls?: string[];
  images?: GeneratedImage[];
  error?: string;
}> {
  try {
    // Compose a scene-specific description for the image prompt
    const sceneDesc = sceneDescription || sceneScript || description;
    const promptDescription = `Scene: ${sceneDesc}\nRecipe: ${title} (${cuisine})`;
    const { generateRecipeImages } = await import('@/ai/flows/generate-recipe-images');
    const result = await generateRecipeImages({
      title,
      description: promptDescription,
      cuisine,
      ingredients,
    });
    if (result.images && result.images.length > 0) {
      if (recipeId) {
        try {
          await Promise.all(
            result.images
              .filter(image => typeof image.url === 'string' && image.url.length > 0)
              .map((image, index) =>
                logVideoHubAsset({
                  recipeId,
                  type: 'image',
                  url: image.url,
                  sceneNumber,
                  source: typeof sceneNumber === 'number' ? 'scene-image' : 'recipe-image',
                  metadata: {
                    variantIndex: index,
                    sceneDescription,
                    sceneScript,
                    title,
                  },
                  prompt: promptDescription,
                })
              )
          );
        } catch (logErr) {
          console.warn(
            'Failed to log scene image asset:',
            logErr instanceof Error ? logErr.message : logErr
          );
        }
      }

      return { success: true, imageUrls: result.images.map(img => img.url), images: result.images };
    }
    return { success: false, error: 'No images generated' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
/**
 * Save (update) scenes for a multi-scene video script (order, script, description, videoUrl)
 */
export async function saveMultiSceneVideoScenesAction(
  recipeId: string,
  scenes: Array<{
    id: string;
    sceneNumber: number;
    script: string;
    description?: string;
    videoUrl?: string;
    imageUrls?: string[];
    advancedOptions?: AdvancedOptions;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await ensureFirestore();

    type NormalizedSceneRecord = {
      id: string;
      sceneNumber: number;
      script: string;
      description: string;
      videoUrl?: string;
      imageUrls: string[];
      advancedOptions?: AdvancedOptions;
    };

    const normalized: NormalizedSceneRecord[] = [];

    for (const scene of scenes ?? []) {
      const sceneNumber = Number(scene.sceneNumber);
      if (!Number.isFinite(sceneNumber) || sceneNumber <= 0) {
        continue;
      }

      const imageUrls = Array.isArray(scene.imageUrls)
        ? scene.imageUrls.filter(
            (url): url is string => typeof url === 'string' && url.trim().length > 0
          )
        : [];

      const advancedOptions = normalizeAdvancedOptions(scene.advancedOptions);

      const normalizedScene: NormalizedSceneRecord = {
        id: String(scene.id),
        sceneNumber,
        script: typeof scene.script === 'string' ? scene.script : '',
        description: typeof scene.description === 'string' ? scene.description : '',
        imageUrls,
      };

      const videoUrl = typeof scene.videoUrl === 'string' ? scene.videoUrl : undefined;
      if (videoUrl !== undefined) {
        normalizedScene.videoUrl = videoUrl;
      }

      if (advancedOptions) {
        normalizedScene.advancedOptions = advancedOptions;
      }

      normalized.push(normalizedScene);
    }

    normalized.sort((a, b) => a.sceneNumber - b.sceneNumber);

    // Persist: use set with merge so we create the document if it doesn't exist
    const payload = removeUndefinedDeep({
      scenes: normalized,
      updatedAt: new Date(),
    });

    await db.collection('multi_scene_video_scripts').doc(recipeId).set(payload, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving multi-scene video scenes:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function generateSceneAssetsBatchAction(
  recipeId: string,
  options?: { regenerate?: boolean }
): Promise<{
  success: boolean;
  processed: number;
  summary: Array<{
    sceneNumber: number;
    imageCount: number;
    voiceGenerated: boolean;
    prompt: string;
  }>;
  error?: string;
}> {
  try {
    const db = await ensureFirestore();

    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, processed: 0, summary: [], error: 'Recipe not found' };
    }
    const recipe = recipeDoc.data() || {};
    const recipeTitle =
      typeof recipe.title === 'string' && recipe.title.length > 0
        ? recipe.title
        : 'Untitled Recipe';
    const recipeDescription = typeof recipe.description === 'string' ? recipe.description : '';
    const recipeCuisine = typeof recipe.cuisine === 'string' ? recipe.cuisine : '';
    const recipeIngredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.join(', ')
      : typeof recipe.ingredients === 'string'
        ? recipe.ingredients
        : '';

    const splitRef = db.collection('split_scenes').doc(recipeId);
    const multiRef = db.collection('multi_scene_video_scripts').doc(recipeId);

    const [splitDoc, multiDoc] = await Promise.all([splitRef.get(), multiRef.get()]);

    const baseScenes: SplitScene[] =
      multiDoc.exists && Array.isArray(multiDoc.data()?.scenes)
        ? (multiDoc.data()?.scenes as SplitScene[])
        : splitDoc.exists && Array.isArray(splitDoc.data()?.scenes)
          ? (splitDoc.data()?.scenes as SplitScene[])
          : [];

    if (baseScenes.length === 0) {
      return {
        success: false,
        processed: 0,
        summary: [],
        error: 'No scenes available. Split the script first.',
      };
    }

    const { optimizePromptForRunway } = await import('@/lib/openai-video-gen');

    const summary: Array<{
      sceneNumber: number;
      imageCount: number;
      voiceGenerated: boolean;
      prompt: string;
    }> = [];
    const updatedScenes: SplitScene[] = [];
    const splitScenesForUpdate: SplitScene[] =
      splitDoc.exists && Array.isArray(splitDoc.data()?.scenes)
        ? (splitDoc.data()?.scenes as SplitScene[])
        : [];

    for (const scene of baseScenes) {
      const sceneNumber = Number(scene.sceneNumber) || updatedScenes.length + 1;
      const script = cleanSceneText(scene.script);
      const description = typeof scene.description === 'string' ? scene.description : '';
      const existingImages = Array.isArray(scene.imageUrls)
        ? scene.imageUrls.filter(u => typeof u === 'string' && u.length > 0)
        : [];
      const existingVoiceUrl =
        typeof scene.voiceOverUrl === 'string' && scene.voiceOverUrl.trim().length > 0
          ? scene.voiceOverUrl
          : typeof scene.advancedOptions?.voice?.url === 'string' &&
              scene.advancedOptions.voice.url.trim().length > 0
            ? scene.advancedOptions.voice.url
            : undefined;
      let voiceUrl: string | undefined = existingVoiceUrl;
      let voiceoverMeta = scene.voiceoverMeta ?? scene.voiceOverMeta ?? null;
      const regenerate = !!options?.regenerate;

      const prompt = await optimizePromptForRunway(recipeTitle, script, {
        cameraShot: scene.advancedOptions?.cameraShot,
        colorGrading: scene.advancedOptions?.colorGrading,
        voiceOver: scene.advancedOptions?.voice,
        backgroundMusic: scene.advancedOptions?.music,
        animation: scene.advancedOptions?.animation,
      });

      let imageUrls = existingImages;
      if (regenerate || imageUrls.length === 0) {
        try {
          const imageResult = await generateSceneImageAction({
            recipeId,
            sceneNumber,
            title: recipeTitle,
            description: recipeDescription,
            cuisine: recipeCuisine,
            ingredients: recipeIngredients,
            sceneScript: script,
            sceneDescription: description,
          });
          if (
            imageResult.success &&
            Array.isArray(imageResult.imageUrls) &&
            imageResult.imageUrls.length > 0
          ) {
            imageUrls = imageResult.imageUrls;
          }
        } catch (err) {
          console.warn(
            `Scene ${sceneNumber}: image generation skipped`,
            err instanceof Error ? err.message : err
          );
        }
      }

      if (regenerate || !voiceUrl) {
        try {
          const voiceResult = await generateVoiceOverAction(
            script,
            scene.advancedOptions?.voice?.voiceId,
            {
              recipeId,
              sceneNumber,
              context: 'scene-batch',
            }
          );
          if (voiceResult.success && voiceResult.url) {
            voiceUrl = voiceResult.url;
            voiceoverMeta = voiceResult.metadata
              ? {
                  ...voiceResult.metadata,
                  url: voiceResult.url,
                  updatedAt: new Date().toISOString(),
                }
              : voiceoverMeta;
          }
        } catch (err) {
          console.warn(
            `Scene ${sceneNumber}: voiceover generation skipped`,
            err instanceof Error ? err.message : err
          );
        }
      }

      const subtitleLines =
        Array.isArray(scene.subtitleLines) && scene.subtitleLines.length > 0
          ? scene.subtitleLines
          : buildSubtitleLines(script);

      const duration =
        typeof scene.advancedOptions?.duration === 'number'
          ? scene.advancedOptions.duration
          : estimateSceneDuration(script);

      const referenceImage =
        imageUrls.length > 0
          ? imageUrls[0]
          : scene.referenceImage ||
            (typeof recipe.imageUrl === 'string' ? recipe.imageUrl : undefined) ||
            undefined;

      const advancedOptions: AdvancedOptions = {
        ...(scene.advancedOptions || {}),
        duration,
        voice: {
          ...(scene.advancedOptions?.voice || {}),
          enabled: true,
          text: script,
          url: voiceUrl,
        },
        animation: scene.advancedOptions?.animation || { enabled: true, style: 'subtle_kenburns' },
      };

      const mergedScene: SplitScene = {
        ...scene,
        sceneNumber,
        script,
        description,
        imageUrls,
        voiceOverUrl: voiceUrl,
        voiceoverMeta,
        voiceOverMeta: voiceoverMeta,
        subtitleLines,
        advancedOptions,
        promptSummary: prompt,
        promptPreview: prompt,
        referenceImage,
      };

      updatedScenes.push(mergedScene);

      // Sync changes into split_scenes representation as well
      if (splitScenesForUpdate.length > 0) {
        const idx = splitScenesForUpdate.findIndex(
          item => Number(item.sceneNumber) === sceneNumber
        );
        if (idx >= 0) {
          splitScenesForUpdate[idx] = { ...splitScenesForUpdate[idx], ...mergedScene };
        }
      }

      summary.push({
        sceneNumber,
        imageCount: imageUrls.length,
        voiceGenerated: !!voiceUrl,
        prompt,
      });
    }

    if (updatedScenes.length > 0) {
      const sanitizedScenes = updatedScenes.map(scene =>
        removeUndefinedDeep({
          ...scene,
          videoGeneratedAt: scene.videoGeneratedAt ?? undefined,
        })
      );

      await multiRef.set(
        removeUndefinedDeep({
          scenes: sanitizedScenes,
          updatedAt: new Date(),
        }),
        { merge: true }
      );

      if (splitScenesForUpdate.length > 0) {
        const sanitizedSplitScenes = splitScenesForUpdate.map(scene => removeUndefinedDeep(scene));
        await splitRef.set(
          removeUndefinedDeep({
            scenes: sanitizedSplitScenes,
            updatedAt: new Date(),
          }),
          { merge: true }
        );
      }
    }

    return { success: true, processed: updatedScenes.length, summary };
  } catch (error) {
    console.error('Error generating scene assets batch:', error);
    return {
      success: false,
      processed: 0,
      summary: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function cleanSceneText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^[\-*\d.\s]+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSubtitleLines(script: string): string[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map(segment => cleanSceneText(segment))
    .filter(segment => segment.length > 0);

  if (sentences.length > 0) {
    return sentences;
  }

  return script
    .split(/\n+/)
    .map(line => cleanSceneText(line))
    .filter(line => line.length > 0);
}

function estimateSceneDuration(script: string): number {
  const words = script.split(/\s+/).filter(Boolean).length;
  if (words === 0) return 4;
  const seconds = Math.ceil(words / 3.5); // ~210 wpm pacing
  return Math.min(10, Math.max(4, seconds));
}
/**
 * Generate a video for a single split scene (from split_scenes)
 */
export async function generateSplitSceneVideoAction(
  recipeId: string,
  sceneNumber: number
): Promise<{
  success: boolean;
  videoUrl?: string;
  error?: string;
}> {
  try {
    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }
    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }
    if (!recipe.imageUrl) {
      return {
        success: false,
        error: 'Recipe must have an image. Please add an image to the recipe first.',
      };
    }

    // Get the split scene from split_scenes
    const splitScenesDoc = await db.collection('split_scenes').doc(recipeId).get();
    if (!splitScenesDoc.exists || !splitScenesDoc.data()?.scenes) {
      return { success: false, error: 'No split scenes found. Please split the script first.' };
    }
    const splitScenes = splitScenesDoc.data()?.scenes ?? [];
    const scene = splitScenes.find((s: SplitScene) => s.sceneNumber === sceneNumber);
    if (!scene) {
      return { success: false, error: `Scene ${sceneNumber} not found.` };
    }
    if (!scene.script) {
      return { success: false, error: 'Scene script missing.' };
    }

    // Import the video generation utility
    const { generateRecipeVideo } = await import('@/lib/openai-video-gen');

    // Generate the video for this scene. If a voiceOverUrl exists for the scene, pass it to the generator
    const audioUrl = scene.voiceOverUrl || scene.advancedOptions?.voice?.url || undefined;
    const genResult = await generateRecipeVideo(
      recipe.imageUrl,
      recipe.title + ` (Scene ${sceneNumber})`,
      scene.script,
      undefined,
      audioUrl ? { audioUrl } : undefined
    );
    const videoUrl = typeof genResult === 'string' ? genResult : genResult.videoUrl;

    // Save the video URL to the split_scenes document (update the scene)
    const updatedScenes = splitScenes.map((s: SplitScene) =>
      s.sceneNumber === sceneNumber ? { ...s, videoUrl, videoGeneratedAt: new Date() } : s
    );
    await db.collection('split_scenes').doc(recipeId).update({
      scenes: updatedScenes,
    });

    try {
      const advDuration = (scene as { advancedOptions?: { duration?: unknown } }).advancedOptions
        ?.duration;
      const storedDuration = (scene as { duration?: unknown }).duration;
      const resolvedDuration =
        typeof advDuration === 'number'
          ? advDuration
          : typeof storedDuration === 'number'
            ? storedDuration
            : undefined;

      const voiceUrl =
        (scene as { voiceOverUrl?: unknown }).voiceOverUrl &&
        typeof (scene as { voiceOverUrl?: unknown }).voiceOverUrl === 'string'
          ? (scene as { voiceOverUrl: string }).voiceOverUrl
          : ((scene as { advancedOptions?: { voice?: { url?: string } } }).advancedOptions?.voice
              ?.url ?? undefined);
      const voiceMeta =
        (scene as { voiceoverMeta?: Record<string, unknown> }).voiceoverMeta ||
        (scene as { voiceOverMeta?: Record<string, unknown> }).voiceOverMeta ||
        null;

      await logVideoHubAsset({
        recipeId,
        type: 'video',
        url: videoUrl,
        sceneNumber,
        source: 'scene-video',
        duration: resolvedDuration,
        metadata: voiceMeta
          ? { ...voiceMeta, url: voiceUrl }
          : voiceUrl
            ? { voiceOverUrl: voiceUrl }
            : undefined,
      });
    } catch (logErr) {
      console.warn(
        'Failed to log split scene video asset:',
        logErr instanceof Error ? logErr.message : logErr
      );
    }

    return {
      success: true,
      videoUrl,
    };
  } catch (error) {
    console.error('❌ Error generating split scene video:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fetch history (previous generated videos) for a scene
 */
export async function getSceneHistoryAction(
  recipeId: string,
  sceneNumber: number
): Promise<{
  success: boolean;
  history?: Array<{ videoUrl: string; generatedAt?: unknown }>;
  error?: string;
}> {
  try {
    const db = await ensureFirestore();
    const histories: Array<{ videoUrl: string; generatedAt?: unknown }> = [];

    // Check split_scenes first
    try {
      const splitDoc = await db.collection('split_scenes').doc(recipeId).get();
      if (splitDoc.exists) {
        const data = splitDoc.data();
        const scenes = data?.scenes || [];
        const match = scenes.find(
          (s: unknown) =>
            Number((s as Record<string, unknown>)['sceneNumber']) === Number(sceneNumber)
        );
        if (match && (match as Record<string, unknown>)['videoUrl']) {
          histories.push({
            videoUrl: (match as Record<string, unknown>)['videoUrl'] as string,
            generatedAt: (match as Record<string, unknown>)['videoGeneratedAt'],
          });
        }
      }
    } catch {
      // ignore split_scenes read errors, continue to other sources
    }

    // Also scan combined multi_scene_video_scripts.sceneVideos for older entries
    try {
      const msDoc = await db.collection('multi_scene_video_scripts').doc(recipeId).get();
      if (msDoc.exists) {
        const msData = msDoc.data();
        const sceneVideos = msData?.sceneVideos || msData?.scenes || [];
        for (const sv of sceneVideos) {
          if (Number(sv.sceneNumber) === Number(sceneNumber) && sv.videoUrl) {
            histories.push({ videoUrl: sv.videoUrl, generatedAt: sv.videoGeneratedAt });
          }
        }
      }
    } catch {
      // ignore
    }

    // De-duplicate by URL
    const unique: Record<string, { videoUrl: string; generatedAt?: unknown }> = {};
    histories.forEach(h => {
      if (h.videoUrl) unique[h.videoUrl] = h;
    });

    return { success: true, history: Object.values(unique) };
  } catch (error) {
    console.error('Error fetching scene history:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Finalize or un-finalize a scene (lock/unlock for regeneration)
 */
export async function finalizeSceneAction(
  recipeId: string,
  sceneNumber: number,
  finalized: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await ensureFirestore();
    const ref = db.collection('split_scenes').doc(recipeId);
    const doc = await ref.get();
    if (!doc.exists) return { success: false, error: 'No scenes found' };
    const scenes = doc.data()?.scenes || [];
    const updated = scenes.map((s: unknown) => {
      const obj = s as Record<string, unknown>;
      return Number(obj['sceneNumber'] as unknown as number) === Number(sceneNumber)
        ? { ...obj, finalized, status: finalized ? 'finalized' : 'draft' }
        : obj;
    });
    await ref.update({ scenes: updated, updatedAt: new Date() });
    return { success: true };
  } catch (error) {
    console.error('Error finalizing scene:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Generate a lightweight storyboard image for a scene (fast preview)
 */
export async function generateSceneStoryboardAction(
  recipeId: string,
  sceneNumber: number
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const db = await ensureFirestore();
    const splitDoc = await db.collection('split_scenes').doc(recipeId).get();
    if (!splitDoc.exists) return { success: false, error: 'No split scenes found' };
    const scenes = splitDoc.data()?.scenes || [];
    const scene = scenes.find(
      (s: unknown) => Number((s as Record<string, unknown>)['sceneNumber']) === Number(sceneNumber)
    ) as Record<string, unknown> | undefined;
    if (!scene) return { success: false, error: 'Scene not found' };

    // Compose prompt for small storyboard image
    const prompt = String(scene.runwayPrompt || scene.description || scene.script || '').slice(
      0,
      1000
    );
    const { generateRecipeImages } = await import('@/ai/flows/generate-recipe-images');
    const images = await generateRecipeImages({
      title: `Storyboard ${recipeId}#${sceneNumber}`,
      description: prompt,
      cuisine: '',
      ingredients: '',
    });
    const image = images.images?.[0];
    if (!image || !image.url) return { success: false, error: 'No image generated' };

    // persist imageUrl in scene
    const updatedScenes = scenes.map((s: unknown) => {
      const obj = s as Record<string, unknown>;
      return Number(obj['sceneNumber'] as unknown as number) === Number(sceneNumber)
        ? { ...obj, imageUrl: image.url, imageGeneratedAt: new Date() }
        : obj;
    });
    await db
      .collection('split_scenes')
      .doc(recipeId)
      .update({ scenes: updatedScenes, updatedAt: new Date() });

    try {
      await logVideoHubAsset({
        recipeId,
        type: 'image',
        url: image.url,
        sceneNumber,
        source: 'storyboard',
        metadata: { prompt },
      });
    } catch (logErr) {
      console.warn(
        'Failed to log storyboard asset:',
        logErr instanceof Error ? logErr.message : logErr
      );
    }

    return { success: true, imageUrl: image.url };
  } catch (error) {
    console.error('Error generating storyboard image:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Server Action wrapper to check Runway task status
 */
export async function checkRunwayTaskStatusAction(taskId: string): Promise<{
  success: boolean;
  status?: string;
  progress?: number;
  output?: unknown;
  error?: string;
}> {
  try {
    const { checkVideoStatus } = await import('@/lib/openai-video-gen');
    const res = await checkVideoStatus(taskId);
    return { success: true, status: res.status, progress: res.progress, output: res.output };
  } catch (error) {
    console.error('Error checking runway task status:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Server Action: Fetch split scenes for a recipe using Admin SDK
 * Use this when client-side reads are blocked by Firestore rules.
 */
export async function getSplitScenesForRecipeAction(
  recipeId: string
): Promise<{ success: boolean; scenes?: SplitScene[]; error?: string }> {
  try {
    const db = await ensureFirestore();
    const doc = await db.collection('split_scenes').doc(recipeId).get();
    if (!doc.exists) return { success: true, scenes: [] };
    const data = doc.data();
    const scenes = (data?.scenes || []) as SplitScene[];
    return { success: true, scenes };
  } catch (error) {
    console.error('Error in getSplitScenesForRecipeAction:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
// --- Scene splitting from main script ---
export async function splitMainScriptIntoScenesAction(
  recipeId: string,
  sceneCount: number = 3
): Promise<{ success: boolean; scenes?: SplitScene[]; error?: string }> {
  try {
    const db = await ensureFirestore();
    // Get the main script from video_scripts
    const scriptDoc = await db.collection('video_scripts').doc(recipeId).get();
    if (!scriptDoc.exists || !scriptDoc.data()?.script) {
      return { success: false, error: 'No main script found for this recipe.' };
    }
    const script = scriptDoc.data()?.script ?? '';
    // Get recipe for context
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    const recipeTitle = recipeDoc.exists && recipeDoc.data() ? recipeDoc.data()?.title : 'Recipe';

    // Use the OPTIMIZED AI flow to split the script with semantic boundaries and Runway prompts
    const { splitScriptIntoScenesOptimizedFlow } = await import(
      '@/ai/flows/split-script-into-scenes-optimized'
    );
    const { scenes } = await splitScriptIntoScenesOptimizedFlow({
      script,
      sceneCount,
      visualContext: {
        recipeTitle: String(recipeTitle),
      },
    });
    // Save to Firestore (new collection: split_scenes)
    await db.collection('split_scenes').doc(recipeId).set({
      recipeId,
      scenes,
      sceneCount,
      createdAt: new Date(),
    });
    return { success: true, scenes };
  } catch (error) {
    console.error('Error splitting main script into scenes:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Server Action: Generate voiceover audio for given text and store in Firebase Storage.
 * Tries Gemini TTS (if GOOGLE_GENAI_API_KEY/GOOGLE_API_KEY present) and falls back to ElevenLabs.
 */
export interface VoiceOverMetadata {
  voiceId?: string;
  bytes: number;
  durationEstimate: number;
  textHash: string;
  source: 'gemini' | 'elevenlabs' | 'unknown';
  createdAt: string;
  context?: string;
  recipeId?: string;
  sceneNumber?: number;
}

export async function generateVoiceOverAction(
  text: string,
  voiceId?: string,
  options?: { recipeId?: string; sceneNumber?: number; context?: string }
): Promise<{ success: boolean; url?: string; metadata?: VoiceOverMetadata; error?: string }> {
  try {
    if (!text || !text.trim()) return { success: false, error: 'No text provided' };

    // OPTIMIZATION: Remove production cues and clean text for natural speech
    const { prepareForVoiceover } = await import('@/lib/text-pruning');
    const cleanedText = prepareForVoiceover(text);

    if (!cleanedText || cleanedText.length < 10) {
      return {
        success: false,
        error: 'Text contains only cues/markers. Please provide actual narration content.',
      };
    }

    const normalizedText = cleanedText.trim().replace(/\s+/g, ' ');
    if (normalizedText.length < 12) {
      return {
        success: false,
        error: 'Voiceover text is too short. Please provide at least a full sentence.',
      };
    }
    if (normalizedText.length > 4000) {
      return {
        success: false,
        error: 'Voiceover text is too long. Try trimming it under 4000 characters.',
      };
    }

    console.warn(
      `🎙️ Voiceover text cleaned: "${text.substring(0, 50)}..." → "${normalizedText.substring(0, 50)}..."`
    );

    const words = normalizedText.split(/\s+/).length;
    const durationEstimate = Math.max(3, Math.round((words / 180) * 60)); // ~180 wpm

    const { createHash } = await import('crypto');
    const textHash = createHash('sha256').update(normalizedText).digest('hex');
    const activeVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM';

    // Prefer Gemini TTS via Google GenAI if API key is available
    const apiKey =
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY;
    let audioBuffer: ArrayBuffer | null = null;
    let audioSource: VoiceOverMetadata['source'] = 'unknown';

    if (apiKey) {
      try {
        // Use the new Google GenAI TTS endpoint (example)
        const resp = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-tts:generateAudio',
          {
            method: 'POST',
            headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: { text }, audioConfig: { audioEncoding: 'mp3' } }),
          }
        );
        if (resp.ok) {
          const json = await resp.json();
          // The API may return base64 audio in `audioContent` or inline data in candidates
          const b64 =
            json.audioContent || json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (b64) {
            audioBuffer = Uint8Array.from(Buffer.from(b64, 'base64')).buffer;
            audioSource = 'gemini';
          }
        } else {
          console.warn('Gemini TTS request failed, status:', resp.status);
        }
      } catch (err) {
        console.warn('Gemini TTS error:', err instanceof Error ? err.message : String(err));
      }
    }

    // Fallback to ElevenLabs if Gemini not available or failed
    if (!audioBuffer) {
      try {
        const elevenKey = process.env.ELEVENLABS_API_KEY;
        if (!elevenKey) throw new Error('No ElevenLabs key');
        const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${activeVoiceId}`, {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenKey,
          },
          body: JSON.stringify({ text: normalizedText, model_id: 'eleven_monolingual_v1' }),
        });
        if (!resp.ok) throw new Error('ElevenLabs TTS failed: ' + resp.statusText);
        const blob = await resp.blob();
        audioBuffer = await blob.arrayBuffer();
        audioSource = 'elevenlabs';
      } catch (err) {
        console.error('ElevenLabs TTS failed:', err instanceof Error ? err.message : String(err));
      }
    }

    if (!audioBuffer) {
      return {
        success: false,
        error:
          'Failed to generate audio. Make sure a Google GenAI or ElevenLabs API key is configured and try again.',
      };
    }

    // Convert to Blob and upload to storage using audio-utils helper
    const { uploadAudioToStorage } = await import('@/lib/audio-utils');

    const ab = audioBuffer as ArrayBuffer;
    const uint8 = new Uint8Array(ab);
    const buffer = Buffer.from(uint8);
    const blobLike = new Blob([buffer], { type: 'audio/mpeg' });
    const filename = `voiceover-${Date.now()}.mp3`;
    const url = await uploadAudioToStorage(blobLike, filename);

    const bytes = buffer.byteLength;
    const voiceoverMetadata: VoiceOverMetadata = {
      voiceId: activeVoiceId,
      bytes,
      durationEstimate,
      textHash,
      source: audioSource,
      createdAt: new Date().toISOString(),
      context: options?.context,
      recipeId: options?.recipeId,
      sceneNumber: options?.sceneNumber,
    };

    if (options?.recipeId) {
      try {
        await logVideoHubAsset({
          recipeId: options.recipeId,
          type: 'audio',
          url,
          sceneNumber: options.sceneNumber,
          source: options.context || 'voiceover',
          voiceId: activeVoiceId,
          metadata: { ...voiceoverMetadata },
        });
      } catch (logErr) {
        console.warn(
          'Failed to log voiceover asset:',
          logErr instanceof Error ? logErr.message : logErr
        );
      }
    }

    return { success: true, url, metadata: voiceoverMetadata };
  } catch (error) {
    console.error('Error in generateVoiceOverAction:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Mark a scene's voiceOver URL in the split_scenes document */
export async function markSceneVoiceOverAction(
  recipeId: string,
  sceneNumber: number,
  voiceOverUrl: string,
  metadata?: Partial<VoiceOverMetadata>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await ensureFirestore();
    const docRef = db.collection('split_scenes').doc(recipeId);
    const doc = await docRef.get();
    if (!doc.exists) return { success: false, error: 'No split scenes found' };
    const data = doc.data() || {};
    const scenes = data.scenes || [];
    const generatedAt = new Date();
    const updated = scenes.map((s: Record<string, unknown>) => {
      if (Number(s.sceneNumber) !== Number(sceneNumber)) return s;
      const next = {
        ...s,
        voiceOverUrl,
        voiceOverGeneratedAt: generatedAt,
        voiceOverMeta: metadata
          ? {
              ...(typeof s.voiceOverMeta === 'object' && s.voiceOverMeta ? s.voiceOverMeta : {}),
              ...metadata,
              url: voiceOverUrl,
              updatedAt: generatedAt.toISOString(),
            }
          : s.voiceOverMeta,
        voiceoverMeta: metadata
          ? {
              ...(typeof (s as { voiceoverMeta?: Record<string, unknown> }).voiceoverMeta ===
              'object'
                ? (s as { voiceoverMeta: Record<string, unknown> }).voiceoverMeta
                : {}),
              ...metadata,
              url: voiceOverUrl,
              updatedAt: generatedAt.toISOString(),
            }
          : (s as { voiceoverMeta?: Record<string, unknown> }).voiceoverMeta,
      };
      return next;
    });
    await docRef.update({ scenes: updated, updatedAt: generatedAt });
    return { success: true };
  } catch (error) {
    console.error('Error marking scene voiceover:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface VideoHubStatusData {
  recipeId: string;
  scriptReady: boolean;
  imageReady: boolean;
  scenesReady: boolean;
  voiceoverReady: boolean;
  assetsReady: boolean;
  shareReady: boolean;
  sceneStats: { total: number; videosReady: number; voiceoversReady: number };
  assetStats: { videos: number; audios: number; images: number };
  combinedVideoReady: boolean;
  nextAction: {
    key: 'script' | 'image' | 'scenes' | 'voice' | 'assets' | 'share';
    label: string;
    helper: string;
  } | null;
  suggestions: string[];
  lastUpdated?: string;
}

export async function getVideoHubStatusAction(
  recipeId: string
): Promise<{ success: boolean; data?: VideoHubStatusData; error?: string }> {
  try {
    if (!recipeId) return { success: false, error: 'Recipe ID required' };
    const db = await ensureFirestore();

    const [recipeSnap, scriptSnap, splitSnap, assetsSnap] = await Promise.all([
      db.collection('recipes').doc(recipeId).get(),
      db.collection('video_scripts').doc(recipeId).get(),
      db.collection('split_scenes').doc(recipeId).get(),
      db.collection('video_generation_assets').where('recipeId', '==', recipeId).get(),
    ]);

    if (!recipeSnap.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeSnap.data() ?? {};
    const imageUrl = typeof recipe.imageUrl === 'string' ? recipe.imageUrl : '';
    const imageReady = Boolean(imageUrl && !imageUrl.startsWith('data:'));

    const scriptData = scriptSnap.exists ? (scriptSnap.data() ?? {}) : {};
    const scriptReady =
      typeof scriptData.script === 'string' && scriptData.script.trim().length > 0;

    const splitData = splitSnap.exists ? (splitSnap.data() ?? {}) : {};
    const rawScenes: Array<Record<string, unknown>> = Array.isArray(splitData.scenes)
      ? splitData.scenes
      : [];
    const sceneTotal = rawScenes.length;
    const videosReady = rawScenes.filter(
      scene => typeof scene.videoUrl === 'string' && (scene.videoUrl as string).trim().length > 0
    ).length;
    const voiceoversReady = rawScenes.filter(scene => {
      if (typeof scene.voiceOverUrl === 'string' && scene.voiceOverUrl.trim().length > 0)
        return true;
      const meta =
        (scene.voiceOverMeta as Record<string, unknown> | undefined) ||
        (scene.voiceoverMeta as Record<string, unknown> | undefined);
      if (meta && typeof meta.url === 'string' && meta.url.trim().length > 0) return true;
      const advanced = scene.advancedOptions as { voice?: { url?: string } } | undefined;
      return Boolean(advanced?.voice?.url);
    }).length;
    const scenesReady = sceneTotal > 0 && videosReady === sceneTotal;
    const voiceoverReady = sceneTotal > 0 && voiceoversReady === sceneTotal;

    const assetStats = { videos: 0, audios: 0, images: 0 };
    let latestAssetTimestamp: Date | undefined;
    assetsSnap.forEach(doc => {
      const data = doc.data() ?? {};
      const type = data.type as string | undefined;
      if (type === 'video') assetStats.videos += 1;
      else if (type === 'audio') assetStats.audios += 1;
      else if (type === 'image') assetStats.images += 1;
      const updated = data.updatedAt ?? data.createdAt;
      if (updated && typeof (updated as { toDate?: () => Date }).toDate === 'function') {
        try {
          const d = (updated as { toDate: () => Date }).toDate();
          if (d instanceof Date && !Number.isNaN(d.getTime())) {
            if (!latestAssetTimestamp || latestAssetTimestamp < d) latestAssetTimestamp = d;
          }
        } catch {
          /* ignore */
        }
      }
    });
    const assetsReady = assetStats.videos > 0;

    const combinedVideoReady = Boolean(
      splitData?.combinedVideo &&
        typeof splitData.combinedVideo.url === 'string' &&
        splitData.combinedVideo.url.trim().length > 0
    );

    const shareReady = assetsReady && scriptReady && imageReady;

    let nextAction: VideoHubStatusData['nextAction'] = null;
    const suggestions: string[] = [];

    if (!scriptReady) {
      nextAction = {
        key: 'script',
        label: 'Generate video script',
        helper: 'Create the narrative before producing media.',
      };
      suggestions.push('Generate a video script to unlock scene tools.');
    } else if (!imageReady) {
      nextAction = {
        key: 'image',
        label: 'Add a recipe image',
        helper: 'Upload or generate a recipe cover image to enable video generation.',
      };
      suggestions.push('Add a public image URL so Runway can render the scene.');
    } else if (sceneTotal === 0) {
      nextAction = {
        key: 'scenes',
        label: 'Split script into scenes',
        helper: 'Break the script into beats to generate individual clips.',
      };
      suggestions.push('Use “Split Script into Scenes” to create manageable segments.');
    } else if (!voiceoverReady) {
      nextAction = {
        key: 'voice',
        label: 'Generate voiceovers',
        helper: 'Add narration so clips feel polished.',
      };
      suggestions.push('Generate voiceovers for each scene to boost engagement.');
    } else if (!assetsReady) {
      nextAction = {
        key: 'assets',
        label: 'Generate scene videos',
        helper: 'Render clips to populate your asset library.',
      };
      suggestions.push('Generate videos to fill the asset library.');
    } else if (!combinedVideoReady) {
      nextAction = {
        key: 'assets',
        label: 'Combine scenes',
        helper: 'Stitch clips into a final video or share them individually.',
      };
      suggestions.push('Combine individual scenes into a single reel for sharing.');
    } else if (!shareReady) {
      nextAction = {
        key: 'share',
        label: 'Share to Instagram',
        helper: 'Publish your finished video to reach your audience.',
      };
      suggestions.push('Share the combined video directly to Instagram.');
    } else {
      suggestions.push('Everything looks good! Schedule your next recipe.');
    }

    const data: VideoHubStatusData = {
      recipeId,
      scriptReady,
      imageReady,
      scenesReady,
      voiceoverReady,
      assetsReady,
      shareReady,
      sceneStats: { total: sceneTotal, videosReady, voiceoversReady },
      assetStats,
      combinedVideoReady,
      nextAction,
      suggestions,
      lastUpdated: latestAssetTimestamp ? latestAssetTimestamp.toISOString() : undefined,
    };

    return { success: true, data };
  } catch (error) {
    console.error('Error building video hub status:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// import { generateVideoScriptFlow } from '@/ai/flows/generate-video-script';
// Do not import server-only modules at the top level. Import inside server-only functions as needed.
let getDb: (() => FirebaseFirestore.Firestore) | undefined;
let getAdmin: (() => typeof import('firebase-admin')) | undefined;
async function ensureFirestore(): Promise<FirebaseFirestore.Firestore> {
  if (!getDb) {
    const adminConfig = await import('../../config/firebase-admin');
    getDb = adminConfig.getDb;
  }

  const db = typeof getDb === 'function' ? getDb() : undefined;
  if (!db) {
    throw new Error('Firestore instance is not initialized');
  }
  return db;
}

async function ensureFirebaseAdmin(): Promise<typeof import('firebase-admin')> {
  // Ensure the lazy initializer is loaded so the app is initialized
  if (!getAdmin) {
    const adminConfig = await import('../../config/firebase-admin');
    getAdmin = adminConfig.getAdmin;
  }

  // Initialize the app (side-effect) if needed
  try {
    // Ensure the admin app is initialized (side-effect). We don't need the
    // returned app instance here, only need to guarantee initialization.
    if (typeof getAdmin === 'function') getAdmin();
    // Also return the firebase-admin module (not the app instance) because
    // callers expect access to helpers like admin.firestore.FieldValue
    const adminModule = await import('firebase-admin');
    if (!adminModule) throw new Error('Failed to import firebase-admin module');
    return adminModule as typeof import('firebase-admin');
  } catch {
    throw new Error('Firebase Admin SDK is not initialized');
  }
}

type FirestoreTimestampLike = { toDate: () => Date; toMillis: () => number };

function isFirestoreTimestamp(value: unknown): value is FirestoreTimestampLike {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { toDate?: unknown }).toDate === 'function' &&
      typeof (value as { toMillis?: unknown }).toMillis === 'function'
  );
}

function cleanForFirestore(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (isFirestoreTimestamp(value)) return value;

  if (Array.isArray(value)) {
    const cleanedArray = value
      .map(item => cleanForFirestore(item))
      .filter(item => item !== undefined);
    return cleanedArray;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return undefined;

    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      const cleanedVal = cleanForFirestore(val);
      if (cleanedVal !== undefined) {
        result[key] = cleanedVal;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  return value;
}

function removeUndefinedDeep<T>(value: T): T {
  return cleanForFirestore(value) as T;
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (isFirestoreTimestamp(value)) {
    try {
      return value.toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeAdvancedOptions(input?: AdvancedOptions): AdvancedOptions | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const base: Record<string, unknown> = { ...input };
  const durationValue =
    typeof input.duration === 'number'
      ? input.duration
      : typeof (input as { duration?: unknown }).duration === 'string'
        ? Number(input.duration)
        : undefined;

  if (Number.isFinite(durationValue) && Number(durationValue) > 0) {
    base.duration = Number(durationValue);
  } else {
    delete base.duration;
  }

  const cleaned = removeUndefinedDeep(base);
  return cleaned && typeof cleaned === 'object' ? (cleaned as AdvancedOptions) : undefined;
}
// Instagram API types
interface InstagramPostData {
  imageUrl: string;
  caption: string;
}

interface InstagramVideoPostData {
  videoUrl: string;
  caption: string;
}

interface InstagramPostResult {
  id: string;
  permalink: string;
  timestamp: string;
}

interface InstagramComment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  like_count?: number;
}

interface InstagramMediaInsights {
  likeCount: number;
  commentsCount: number;
  timestamp: string;
}

let instagramApi:
  | {
      isConfigured: () => boolean;
      publishPost: (post: InstagramPostData) => Promise<InstagramPostResult>;
      publishVideoPost: (post: InstagramVideoPostData) => Promise<InstagramPostResult>;
      getComments: (mediaId: string) => Promise<InstagramComment[]>;
      getMediaInsights: (mediaId: string) => Promise<InstagramMediaInsights>;
    }
  | undefined;
type StorageFileLike = {
  makePublic?: () => Promise<void>;
  getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
  name?: string;
};

const TRUSTED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'source.unsplash.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'lh3.googleusercontent.com',
  'cdn.pixabay.com',
  'res.cloudinary.com',
];

const FALLBACK_IMAGE_STYLES: ReadonlyArray<{ style: string; descriptionSuffix: string }> = [
  { style: 'professional food photography', descriptionSuffix: 'presentation' },
  { style: 'close-up', descriptionSuffix: 'close-up detail' },
  { style: 'styled plating', descriptionSuffix: 'styled plating' },
];

const IMAGE_FETCH_TIMEOUT_MS = 3000;

// Unused utility functions - kept for reference
// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const slugifyForImage = (value: string | undefined | null) =>
  (value ?? 'recipe')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

// Unused - Simple HTML escape for inserting text into generated SVGs
// const escapeHtml = (str: string) =>
//   String(str)
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;')
//     .replace(/'/g, '&#39;');

const buildFallbackImages = (recipeData: {
  title: string;
  description?: string;
  cuisine?: string;
}): GeneratedImage[] => {
  const titleSlug = slugifyForImage(recipeData.title);
  const cuisineSlug = slugifyForImage(recipeData.cuisine);

  return FALLBACK_IMAGE_STYLES.slice(0, 2).map((entry, index) => {
    const searchTerm = index === 0 ? `${titleSlug}-food` : `${cuisineSlug}-recipe`;
    return {
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(searchTerm)}&sig=${Date.now() + index}`,
      description: `${recipeData.title} ${entry.descriptionSuffix}`.trim(),
      style: entry.style,
    } satisfies GeneratedImage;
  });
};

const isTrustedImageHost = (url: URL) =>
  TRUSTED_IMAGE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));

const normalizeImageCandidate = async (
  candidate: GeneratedImage,
  recipeData: { title: string; cuisine: string }
): Promise<GeneratedImage | null> => {
  if (!candidate || typeof candidate.url !== 'string') return null;
  const rawUrl = candidate.url.trim();
  if (!rawUrl) return null;

  if (rawUrl.startsWith('data:image')) {
    return {
      url: rawUrl,
      description: candidate.description || `${recipeData.title} preview`,
      style: candidate.style || 'generated',
    } satisfies GeneratedImage;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (host.includes('example.com') || host === 'localhost') {
    return null;
  }

  if (isTrustedImageHost(parsedUrl)) {
    return {
      url: rawUrl,
      description: candidate.description || `${recipeData.title} image`,
      style: candidate.style || 'generated',
    } satisfies GeneratedImage;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
    : undefined;

  try {
    const response = await fetch(rawUrl, {
      method: 'HEAD',
      signal: controller?.signal,
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.startsWith('image/')) {
      return null;
    }

    return {
      url: rawUrl,
      description: candidate.description || `${recipeData.title} image`,
      style: candidate.style || 'generated',
    } satisfies GeneratedImage;
  } catch (error) {
    console.warn(
      'Image validation failed, using fallback:',
      rawUrl,
      error instanceof Error ? error.message : error
    );
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const sanitizeGeneratedImages = async (
  candidates: GeneratedImage[] | undefined,
  recipeData: { title: string; cuisine: string; description: string }
): Promise<GeneratedImage[]> => {
  const normalized: GeneratedImage[] = [];
  const seen = new Set<string>();

  if (candidates) {
    for (const candidate of candidates) {
      const validated = await normalizeImageCandidate(candidate, recipeData);
      if (validated && !seen.has(validated.url)) {
        normalized.push(validated);
        seen.add(validated.url);
      }
    }
  }

  if (normalized.length === 0) {
    const fallback = buildFallbackImages(recipeData);
    fallback.forEach(image => seen.add(image.url));
    return fallback;
  }

  const fallbackImages = buildFallbackImages(recipeData);
  for (const fallback of fallbackImages) {
    if (normalized.length >= 2) break;
    if (!seen.has(fallback.url)) {
      normalized.push(fallback);
      seen.add(fallback.url);
    }
  }

  return normalized;
};

export async function getNutritionalData(ingredients: string[]): Promise<{
  success: boolean;
  data?: NutritionalInfo;
  error?: string;
}> {
  try {
    const ingredientsString = ingredients.join(', ');
    if (!ingredientsString) {
      return { success: false, error: 'No ingredients provided.' };
    }

    const { getNutritionalInformation } = await import(
      '@/ai/flows/nutritional-information-from-ingredients'
    );
    const nutritionalInfo = await getNutritionalInformation({
      ingredients: ingredientsString,
    });

    return { success: true, data: nutritionalInfo };
  } catch (error) {
    console.error('Error fetching nutritional information:', error);
    return {
      success: false,
      error: 'Failed to get nutritional information. Please try again later.',
    };
  }
}

export async function extractRecipeDataFromImageUrl(imageUrl: string): Promise<{
  success: boolean;
  data?: RecipeFromImage;
  error?: string;
}> {
  try {
    if (!imageUrl) {
      return { success: false, error: 'No image URL provided.' };
    }

    console.warn('Starting image URL extraction...');
    console.warn('Image URL:', imageUrl.substring(0, 100) + '...');

    // Check if API key is available
    const apiKey =
      process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('No API key found');
      return {
        success: false,
        error: 'API key not configured. Please check your environment variables.',
      };
    }

    // Fetch the image from the URL
    console.warn('Fetching image from URL...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.warn('Image fetched successfully, size:', imageBuffer.byteLength);

    const { extractRecipeFromImage } = await import('@/ai/flows/recipe-from-image');
    const extractedData = await extractRecipeFromImage({
      photoDataUri: `data:${mimeType};base64,${base64Image}`,
    });

    console.warn('Extraction successful:', extractedData);
    return { success: true, data: extractedData };
  } catch (error) {
    console.error('Error extracting recipe from image URL:', error);
    return {
      success: false,
      error: `Failed to extract recipe from image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function extractRecipeDataFromPdf(pdfDataUri: string): Promise<{
  success: boolean;
  data?: RecipesFromPdf;
  error?: string;
}> {
  try {
    if (!pdfDataUri) {
      return { success: false, error: 'No PDF provided.' };
    }

    const { extractRecipesFromPdf } = await import('@/ai/flows/recipes-from-pdf');
    const extractedData = await extractRecipesFromPdf({
      pdfDataUri,
    });

    return { success: true, data: extractedData };
  } catch (error) {
    console.error('Error extracting recipes from PDF:', error);
    return {
      success: false,
      error: 'Failed to extract recipes from PDF. Please try again later.',
    };
  }
}

export async function extractRecipeDataFromPdfAdvanced(
  pdfDataUri: string,
  options?: {
    processingMode?: 'text-only' | 'ocr-only' | 'hybrid' | 'auto';
    ocrLanguage?: string;
    imageQuality?: 'low' | 'medium' | 'high';
    enableAIEnhancement?: boolean;
  }
): Promise<{
  success: boolean;
  data?: AdvancedRecipesFromPdf;
  error?: string;
}> {
  try {
    if (!pdfDataUri) {
      return { success: false, error: 'No PDF provided.' };
    }

    console.warn('Starting advanced PDF extraction...');
    console.warn('PDF data URI length:', pdfDataUri.length);
    console.warn('Processing options:', options);

    // Check if API key is available
    const apiKey =
      process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('No API key found');
      return {
        success: false,
        error: 'API key not configured. Please check your environment variables.',
      };
    }

    const { extractRecipesFromPdfAdvanced } = await import('@/ai/flows/recipes-from-pdf-advanced');
    const extractedData = await extractRecipesFromPdfAdvanced({
      pdfDataUri,
      processingMode: options?.processingMode || 'auto',
      ocrLanguage: options?.ocrLanguage || 'eng',
      imageQuality: options?.imageQuality || 'high',
      enableAIEnhancement: options?.enableAIEnhancement !== false,
    });

    console.warn('Advanced extraction successful:', {
      recipesFound: extractedData.recipes.length,
      processingInfo: extractedData.processingInfo,
    });

    return { success: true, data: extractedData };
  } catch (error) {
    console.error('Error in advanced PDF extraction:', error);
    return {
      success: false,
      error: `Failed to extract recipes from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate a video script for a recipe and save to Firestore
 * @param recipeId The Firestore ID of the recipe
 */
export async function generateAndSaveVideoScriptForRecipe(
  recipeId: string
): Promise<{ success: boolean; script?: string; error?: string }> {
  try {
    const db = await ensureFirestore();
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }
    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data missing' };
    }
    // Prepare input for OpenAI API
    const input = {
      title: recipe.title,
      description: recipe.description,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      cuisine: recipe.cuisine || '',
    };
    const { script, marketingIdeas } = await generateVideoScriptWithOpenAI(input);
    console.warn('[generateAndSaveVideoScriptForRecipe] script output:', script);
    await db
      .collection('video_scripts')
      .doc(recipeId)
      .set({
        recipeId,
        script,
        marketingIdeas: marketingIdeas || [],
        createdAt: new Date(),
      });
    return { success: true, script };
  } catch (error) {
    console.error('Error generating/saving video script:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Check for specific API error messages
    if (errorMessage.includes('quota')) {
      return {
        success: false,
        error: 'You have exceeded your API quota. Please check your plan and billing details.',
      };
    }
    return { success: false, error: 'Failed to generate video script. Please try again later.' };
  }
}

/**
 * Generate a multi-scene video script for a recipe
 */
export async function generateAndSaveMultiSceneVideoScriptForRecipe(
  recipeId: string,
  sceneCount: number = 3
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }

    const input = {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      cuisine: recipe.cuisine,
      sceneCount,
    };

    const { generateMultiSceneVideoScriptFlow } = await import(
      '@/ai/flows/generate-multi-scene-video-script'
    );
    const { scenes, totalDuration, marketingIdeas } =
      await generateMultiSceneVideoScriptFlow(input);

    console.warn('[generateAndSaveMultiSceneVideoScriptForRecipe] generated script:', {
      scenes: scenes.length,
      totalDuration,
    });

    // Save to Firestore
    await db.collection('multi_scene_video_scripts').doc(recipeId).set({
      recipeId,
      scenes,
      totalDuration,
      marketingIdeas,
      sceneCount,
      createdAt: new Date(),
    });

    console.warn('✅ Multi-scene video script saved to Firestore');

    return { success: true };
  } catch (error) {
    console.error('Error generating/saving multi-scene video script:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate multi-scene script',
    };
  }
}

/**
 * Generate multi-scene video from script
 */
export async function generateMultiSceneVideoForRecipe(
  recipeId: string,
  model: RunwayModel = 'gen4_turbo',
  options?: {
    ratio?: string;
    defaultDuration?: number;
    timeoutMs?: number;
    maxRetries?: number;
    previewOnly?: boolean;
  }
): Promise<{
  success: boolean;
  sceneVideos?: Array<{
    sceneNumber: number;
    videoUrl: string;
    script: string;
    taskId?: string;
    promptText?: string;
    settings?: { model: RunwayModel; ratio: string; duration: number };
    referenceImage?: string;
    promptSummary?: string;
  }>;
  combinedInstructions?: string;
  preview?: {
    scenes: Array<{
      sceneNumber: number;
      promptText: string;
      settings: { model: RunwayModel; ratio: string; duration: number };
      promptMeta?: AdvancedOptions;
    }>;
  };
  error?: string;
}> {
  try {
    const db = await ensureFirestore();

    // Get the recipe
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }
    const recipe = recipeDoc.data();

    if (!recipe) {
      return { success: false, error: 'Recipe data missing' };
    }

    // Check if recipe has an image
    if (!recipe.imageUrl) {
      return {
        success: false,
        error: 'Recipe must have an image. Please add an image to the recipe first.',
      };
    }

    // Get the multi-scene script
    const scriptDoc = await db.collection('multi_scene_video_scripts').doc(recipeId).get();
    if (!scriptDoc.exists || !scriptDoc.data()?.scenes) {
      return {
        success: false,
        error: 'No multi-scene script found. Please generate a script first.',
      };
    }
    const scriptData = scriptDoc.data();

    if (!scriptData) {
      return { success: false, error: 'Script data is empty' };
    }

    // Import the multi-scene video generation utility
    const { generateMultiSceneVideo, optimizePromptForRunway } = await import(
      '@/lib/openai-video-gen'
    );

    // If previewOnly, build prompts/settings for each scene and return without generating
    if (options?.previewOnly) {
      const previewScenes = await Promise.all(
        (scriptData.scenes || []).map(async (s: unknown) => {
          // Cast to expected scene type with optimized fields
          const scene = s as {
            sceneNumber: number;
            description?: string;
            visualElements?: string[];
            script?: string;
            advancedOptions?: AdvancedOptions;
            duration?: number;
            runwayPrompt?: string; // Pre-generated optimized prompt
            continuityNotes?: string;
          };

          // Build meta from per-scene advancedOptions if present
          const adv = scene.advancedOptions || {};
          const meta = {
            cameraShot: adv.cameraShot || undefined,
            colorGrading: adv.colorGrading || undefined,
            voiceOver: adv.voice || undefined,
            backgroundMusic: adv.music || undefined,
            animation: adv.animation || undefined,
          };

          // Use pre-generated runwayPrompt if available (from optimized flow), otherwise build one
          let promptText: string;
          if (scene.runwayPrompt && scene.runwayPrompt.trim().length > 0) {
            promptText = scene.runwayPrompt;
            console.warn(`✨ Using optimized Runway prompt for scene ${scene.sceneNumber}`);
          } else {
            // Fallback to generating prompt (legacy scenes)
            const scen = scene;
            promptText = await optimizePromptForRunway(
              recipe.title,
              `${scen.description || ''}. ${(scen.visualElements || []).join?.('') ? (scen.visualElements || []).join('. ') : ''}. ${scen.script || ''}`,
              meta
            );
            console.warn(
              `⚠️ Generated fallback prompt for scene ${scene.sceneNumber} (consider re-splitting)`
            );
          }

          const duration =
            typeof adv.duration === 'number'
              ? adv.duration
              : typeof scene.duration === 'number'
                ? scene.duration
                : (options?.defaultDuration ?? 5);
          const ratio = options?.ratio || '1280:720';
          return {
            sceneNumber: scene.sceneNumber,
            promptText,
            settings: { model, ratio, duration },
            promptMeta: meta,
          };
        })
      );
      return { success: true, preview: { scenes: previewScenes } };
    }

    // Generate the multi-scene video
    console.warn('🎬 Starting multi-scene video generation...');
    const scenesForGeneration = Array.isArray(scriptData.scenes)
      ? (scriptData.scenes as unknown[]).map((rawScene, index) => {
          const base = rawScene as {
            sceneNumber?: number;
            description?: string;
            visualElements?: unknown;
            script?: string;
            advancedOptions?: AdvancedOptions;
            duration?: number;
            transition?: string;
            imageUrls?: unknown;
            keyframeUrl?: unknown;
          };
          const imageUrls = Array.isArray(base.imageUrls)
            ? (base.imageUrls as unknown[]).filter(
                (url): url is string => typeof url === 'string' && url.trim().length > 0
              )
            : [];
          const visuals = Array.isArray(base.visualElements)
            ? (base.visualElements as unknown[]).filter(
                (value): value is string => typeof value === 'string' && value.trim().length > 0
              )
            : [];
          return {
            sceneNumber: typeof base.sceneNumber === 'number' ? base.sceneNumber : index + 1,
            description: typeof base.description === 'string' ? base.description : '',
            visualElements: visuals,
            script: typeof base.script === 'string' ? base.script : '',
            advancedOptions: base.advancedOptions,
            duration: typeof base.duration === 'number' ? base.duration : undefined,
            transition: typeof base.transition === 'string' ? base.transition : undefined,
            imageUrls,
            keyframeUrl: typeof base.keyframeUrl === 'string' ? base.keyframeUrl : undefined,
          };
        })
      : [];

    const result = await generateMultiSceneVideo(
      recipe.imageUrl,
      recipe.title,
      {
        scenes: scenesForGeneration,
      },
      model,
      {
        ratio: options?.ratio,
        duration: options?.defaultDuration,
        timeoutMs: options?.timeoutMs,
        maxRetries: options?.maxRetries,
      }
    );

    // Save scene videos to Firestore

    const sceneVideosData = result.sceneVideos.map(scene => ({
      sceneNumber: scene.sceneNumber,
      videoUrl: scene.videoUrl,
      script: scene.script,
      videoGeneratedAt: new Date(),
      runwayTaskId: scene.taskId || null,
      runwayPrompt: scene.promptText || null,
      runwaySettings: scene.settings || null,
      referenceImage: scene.referenceImage || null,
      promptSummary: scene.promptSummary || null,
    }));

    await db.collection('multi_scene_video_scripts').doc(recipeId).update({
      sceneVideos: sceneVideosData,
      combinedInstructions: result.combinedInstructions,
      videoGeneratedAt: new Date(),
    });

    console.warn('✅ Multi-scene videos saved to Firestore');

    try {
      await Promise.all(
        (result.sceneVideos || [])
          .filter(scene => typeof scene.videoUrl === 'string' && scene.videoUrl.length > 0)
          .map(scene =>
            logVideoHubAsset({
              recipeId,
              type: 'video',
              url: scene.videoUrl,
              sceneNumber: scene.sceneNumber,
              source: 'multi-scene-generation',
              duration: scene.settings?.duration,
              model: scene.settings?.model,
              ratio: scene.settings?.ratio,
              prompt: scene.promptText,
              taskId: scene.taskId,
            })
          )
      );
    } catch (logErr) {
      console.warn(
        'Failed to log multi-scene video asset:',
        logErr instanceof Error ? logErr.message : logErr
      );
    }

    return {
      success: true,
      sceneVideos: result.sceneVideos,
      combinedInstructions: result.combinedInstructions,
    };
  } catch (error) {
    console.error('❌ Error generating multi-scene video:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate multi-scene video',
    };
  }
}

export async function getMultiSceneVideoDataAction(recipeId: string): Promise<{
  success: boolean;
  data?: {
    scenes: Array<{
      sceneNumber: number;
      script: string;
      description?: string;
      duration?: number;
      transition?: string;
      imageUrls?: string[];
      advancedOptions?: AdvancedOptions;
    }>;
    sceneVideos: Array<{
      sceneNumber: number;
      script: string;
      videoUrl?: string;
      duration?: number;
      runwaySettings?: Record<string, unknown>;
      generatedAt?: string;
    }>;
    combinedVideo?: {
      url: string;
      duration?: number;
      fileSize?: number;
      generatedAt?: string;
      processingMethod?: string;
      storagePath?: string | null;
      thumbnailUrl?: string | null;
      instructions?: string | null;
    };
    combinedInstructions?: string;
    marketingIdeas?: string[];
    sceneCount?: number;
    updatedAt?: string;
  };
  error?: string;
}> {
  try {
    if (!recipeId || typeof recipeId !== 'string') {
      return { success: false, error: 'A valid recipe ID is required.' };
    }

    const db = await ensureFirestore();

    const docRef = db.collection('multi_scene_video_scripts').doc(recipeId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return { success: true };
    }

    const data = snapshot.data() || {};
    const rawScenes = Array.isArray(data.scenes) ? data.scenes : [];
    const scenes = rawScenes
      .map(raw => {
        const scene = raw as Record<string, unknown>;
        const sceneNumber = Number(scene.sceneNumber);
        if (!Number.isFinite(sceneNumber) || sceneNumber <= 0) return null;
        const script = typeof scene.script === 'string' ? scene.script : '';
        const description = typeof scene.description === 'string' ? scene.description : undefined;
        const transition = typeof scene.transition === 'string' ? scene.transition : undefined;
        const durationValue =
          typeof scene.duration === 'number'
            ? scene.duration
            : typeof scene.duration === 'string'
              ? Number(scene.duration)
              : undefined;
        let duration: number | undefined;
        if (Number.isFinite(durationValue) && Number(durationValue) > 0)
          duration = Number(durationValue);

        const advanced = normalizeAdvancedOptions(
          scene.advancedOptions as AdvancedOptions | undefined
        );
        const imageUrls: string[] = [];
        if (Array.isArray((scene as { imageUrls?: unknown }).imageUrls)) {
          for (const url of (scene as { imageUrls?: unknown }).imageUrls as unknown[]) {
            if (typeof url === 'string' && url.trim().length > 0) imageUrls.push(url);
          }
        }
        if (typeof (scene as { imageUrl?: unknown }).imageUrl === 'string') {
          imageUrls.push((scene as { imageUrl?: string }).imageUrl as string);
        }

        return {
          sceneNumber,
          script,
          description,
          transition,
          duration,
          imageUrls,
          advancedOptions: advanced,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => !!entry);

    const rawVideos = Array.isArray(data.sceneVideos) ? data.sceneVideos : [];
    const sceneVideos = rawVideos
      .map(raw => {
        const entry = raw as Record<string, unknown>;
        const sceneNumber = Number(entry.sceneNumber);
        if (!Number.isFinite(sceneNumber) || sceneNumber <= 0) return null;
        const script = typeof entry.script === 'string' ? entry.script : '';
        const videoUrl = typeof entry.videoUrl === 'string' ? entry.videoUrl : undefined;
        const runwaySettings = entry.runwaySettings as Record<string, unknown> | undefined;
        const durationValue =
          typeof entry.duration === 'number'
            ? entry.duration
            : typeof entry.duration === 'string'
              ? Number(entry.duration)
              : undefined;
        const duration =
          Number.isFinite(durationValue) && Number(durationValue) > 0
            ? Number(durationValue)
            : undefined;
        const generatedAt = toIsoString(
          (entry as { videoGeneratedAt?: unknown }).videoGeneratedAt ??
            (entry as { generatedAt?: unknown }).generatedAt ??
            (entry as { updatedAt?: unknown }).updatedAt
        );

        return {
          sceneNumber,
          script,
          videoUrl,
          runwaySettings,
          duration,
          generatedAt,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => !!entry);

    const combinedVideoUrl =
      typeof data.combinedVideoUrl === 'string' ? data.combinedVideoUrl : undefined;
    const combinedVideoDuration =
      typeof data.combinedVideoDuration === 'number'
        ? data.combinedVideoDuration
        : typeof data.combinedVideoDuration === 'string'
          ? Number(data.combinedVideoDuration)
          : undefined;
    const combinedVideoSize =
      typeof data.combinedVideoSize === 'number'
        ? data.combinedVideoSize
        : typeof data.combinedVideoSize === 'string'
          ? Number(data.combinedVideoSize)
          : undefined;

    const combinedInstructions =
      typeof data.combinedInstructions === 'string' ? data.combinedInstructions : undefined;

    const combinedVideo = combinedVideoUrl
      ? {
          url: combinedVideoUrl,
          duration: Number.isFinite(combinedVideoDuration)
            ? Number(combinedVideoDuration)
            : undefined,
          fileSize: Number.isFinite(combinedVideoSize) ? Number(combinedVideoSize) : undefined,
          generatedAt: toIsoString(
            (data as { combinedVideoGeneratedAt?: unknown }).combinedVideoGeneratedAt ??
              (data as { combinedGeneratedAt?: unknown }).combinedGeneratedAt ??
              (data as { combinedVideoUpdatedAt?: unknown }).combinedVideoUpdatedAt
          ),
          processingMethod:
            typeof data.combinedVideoProcessingMethod === 'string'
              ? data.combinedVideoProcessingMethod
              : undefined,
          storagePath:
            typeof data.combinedVideoStoragePath === 'string'
              ? data.combinedVideoStoragePath
              : null,
          thumbnailUrl:
            typeof data.combinedVideoThumbnailUrl === 'string'
              ? data.combinedVideoThumbnailUrl
              : null,
          instructions:
            typeof data.combinedVideoInstructions === 'string'
              ? data.combinedVideoInstructions
              : (combinedInstructions ?? null),
        }
      : undefined;

    return {
      success: true,
      data: {
        scenes,
        sceneVideos,
        combinedVideo,
        combinedInstructions,
        marketingIdeas: Array.isArray(data.marketingIdeas)
          ? data.marketingIdeas.filter((idea: unknown): idea is string => typeof idea === 'string')
          : undefined,
        sceneCount: typeof data.sceneCount === 'number' ? data.sceneCount : undefined,
        updatedAt: toIsoString((data as { updatedAt?: unknown }).updatedAt),
      },
    };
  } catch (error) {
    console.error('Error fetching multi-scene video data:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveRecipe(recipeData: {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  cuisine: string;
  imageUrl?: string;
  postToInstagram?: boolean;
}): Promise<{
  success: boolean;
  data?: { id: string; instagramPosted?: boolean };
  error?: string;
}> {
  try {
    // In a real app, this would save to a database
    // For now, we'll generate an ID and simulate success
    const newRecipeId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.warn('Saving recipe:', {
      id: newRecipeId,
      ...recipeData,
    });

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Optionally post to Instagram (non-blocking)
    let instagramPosted = false;
    if (recipeData.postToInstagram && recipeData.imageUrl) {
      try {
        console.warn('📸 Posting to Instagram...');
        const instagramResult = await shareRecipeToInstagram(newRecipeId);
        instagramPosted = instagramResult.success;

        if (instagramPosted) {
          console.warn(`✅ Recipe posted to Instagram: ${instagramResult.permalink}`);
        } else {
          console.warn(`⚠️ Instagram post failed: ${instagramResult.error}`);
        }
      } catch (igError) {
        // Don't fail the recipe save if Instagram posting fails
        console.error('❌ Instagram posting error (non-fatal):', igError);
      }
    }

    // Trigger video script generation (fire-and-forget)
    generateAndSaveVideoScriptForRecipe(newRecipeId).catch(err => {
      console.error('Video script generation failed (non-fatal):', err);
    });

    return {
      success: true,
      data: {
        id: newRecipeId,
        instagramPosted,
      },
    };
  } catch (error) {
    console.error('Error saving recipe:', error);
    return {
      success: false,
      error: `Failed to save recipe: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function generateRecipeImagesAction(recipeData: {
  title: string;
  description: string;
  cuisine: string;
  ingredients: string;
}): Promise<{
  success: boolean;
  data?: { images: GeneratedImage[] };
  error?: string;
}> {
  try {
    console.warn('Generating images for recipe:', recipeData.title);

    // Check if API key is available (prioritize GOOGLE_AI_API_KEY for image generation)
    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GEMINI_API_KEY;
    console.warn('API key check:', {
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY ? 'Found' : 'Missing',
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'Found' : 'Missing',
      GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY ? 'Found' : 'Missing',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Found' : 'Missing',
      found: !!apiKey,
      usingKey: apiKey ? apiKey.substring(0, 10) + '...' : 'None',
      nodeEnv: process.env.NODE_ENV,
    });

    let generatedImages: { images: GeneratedImage[] };
    if (!apiKey) {
      console.error('No API key found, using fallback images');
      generatedImages = { images: buildFallbackImages(recipeData) } as { images: GeneratedImage[] };
    } else {
      const { generateRecipeImages } = await import('@/ai/flows/generate-recipe-images');
      generatedImages = await generateRecipeImages({
        title: recipeData.title,
        description: recipeData.description,
        cuisine: recipeData.cuisine,
        ingredients: recipeData.ingredients,
      });
    }

    const sanitized = await sanitizeGeneratedImages(generatedImages.images, {
      title: recipeData.title,
      cuisine: recipeData.cuisine,
      description: recipeData.description,
    });

    console.warn('Image generation successful:', {
      generated: generatedImages.images.length,
      delivered: sanitized.length,
    });

    // Persist sanitized images to Firebase Storage (best-effort). This replaces
    // externally-hosted URLs with stable storage.googleapis.com URLs so we don't
    // persist fragile third-party redirect links.
    async function uploadImageToStorage(rawUrl: string, titleSlug?: string) {
      if (!rawUrl) return undefined;

      // For trusted image hosts (Unsplash, etc), skip upload and return original URL
      // These are reliable CDNs that work well for previews
      if (
        rawUrl.startsWith('https://images.unsplash.com') ||
        rawUrl.startsWith('https://source.unsplash.com') ||
        rawUrl.includes('unsplash.com')
      ) {
        console.warn('Skipping upload for trusted CDN URL:', rawUrl);
        return rawUrl;
      }

      const admin = await ensureFirebaseAdmin();
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

      // Check if we have valid Firebase credentials and bucket
      if (!bucketName) {
        console.warn('FIREBASE_STORAGE_BUCKET not configured, returning original URL');
        return rawUrl;
      }

      try {
        const bucket = admin.storage().bucket(bucketName);

        let buffer: Buffer | null = null;
        let contentType = 'image/jpeg';

        if (rawUrl.startsWith('data:')) {
          const match = rawUrl.match(/^data:(.+);base64,(.*)$/);
          if (!match) return rawUrl;
          contentType = match[1];
          buffer = Buffer.from(match[2], 'base64');
        } else {
          // For non-data URIs, try to fetch but return original URL if it fails
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timer = controller
            ? setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
            : undefined;
          try {
            const resp = await fetch(rawUrl, { method: 'GET', signal: controller?.signal });
            if (!resp.ok) {
              console.warn('Failed to fetch image, returning original URL:', rawUrl);
              return rawUrl;
            }
            const arrayBuffer = await resp.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            const ct = resp.headers.get('content-type');
            if (ct) contentType = ct.split(';')[0];
          } catch (err) {
            console.warn(
              'Failed to fetch image, returning original URL:',
              rawUrl,
              err instanceof Error ? err.message : String(err)
            );
            return rawUrl;
          } finally {
            if (timer) clearTimeout(timer);
          }
        }

        const ext = (contentType.split('/')[1] || 'jpg').split('+')[0];
        const safeTitle = (titleSlug || 'recipe')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .slice(0, 40);
        const filename = `generated/${safeTitle}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const file = bucket.file(filename);

        try {
          await file.save(buffer, { metadata: { contentType } });
        } catch (err) {
          console.error('Failed to save file to storage, returning original URL', {
            url: rawUrl,
            filename,
            bucket: bucket.name,
            error: err instanceof Error ? err.message : String(err),
          });
          return rawUrl;
        }

        // Best-effort: try to make the object public (ACL). If that works, return
        // the simple storage.googleapis.com URL which is easiest for browsers to fetch.
        let madePublic = false;
        try {
          const candidate = file as unknown as StorageFileLike;
          if (typeof candidate.makePublic === 'function') {
            await candidate.makePublic();
            madePublic = true;
          } else {
            madePublic = false;
          }
        } catch (err) {
          console.warn('makePublic failed', {
            filename,
            bucket: bucket.name,
            error: err instanceof Error ? err.message : String(err),
          });
          madePublic = false;
        }

        if (madePublic) {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
          console.warn('Persisted image (public):', { url: publicUrl, source: rawUrl });
          return publicUrl;
        }

        // Otherwise try to generate a signed URL
        try {
          const expires = Date.now() + 1000 * 60 * 60 * 24 * 365; // 1 year
          const candidate = file as unknown as StorageFileLike;
          const signedUrlGetter = candidate.getSignedUrl;
          if (typeof signedUrlGetter === 'function') {
            const signedUrls = await signedUrlGetter.call(file, { action: 'read', expires });
            if (Array.isArray(signedUrls) && signedUrls[0]) {
              console.warn('Persisted image (signed):', { url: signedUrls[0], source: rawUrl });
              return signedUrls[0];
            }
          }
        } catch (err) {
          console.warn('getSignedUrl failed', {
            filename,
            bucket: bucket.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        const fallbackUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        console.warn('Persisted image (fallback):', { url: fallbackUrl, source: rawUrl });
        return fallbackUrl;
      } catch (err) {
        console.warn(
          'Failed to upload generated image to storage, returning original URL',
          rawUrl,
          err instanceof Error ? err.message : String(err)
        );
        return rawUrl;
      }
    }

    const persisted: GeneratedImage[] = [];
    for (const img of sanitized) {
      try {
        const titleSlug = slugifyForImage(recipeData.title);
        // Try to upload to Firebase Storage (data URIs only, skip external URLs)
        const uploaded = await uploadImageToStorage(img.url, titleSlug);
        persisted.push({ ...img, url: uploaded || img.url });
      } catch (error) {
        console.warn(
          'Error processing image, using original URL:',
          error instanceof Error ? error.message : error
        );
        persisted.push(img);
      }
    }

    // Save all generated images to Firestore for future use (don't waste API calls!)
    try {
      await saveGeneratedImagesToFirestore(persisted, recipeData);
      console.warn('✅ Saved all generated images to Firestore for future use');
    } catch (error) {
      console.warn('⚠️ Failed to save generated images metadata, but continuing:', error);
      // Non-blocking - continue even if metadata save fails
    }

    return { success: true, data: { images: persisted } };
  } catch (error) {
    console.error('Error generating recipe images:', error);
    const fallbackImages = buildFallbackImages(recipeData);

    return {
      success: true,
      data: { images: fallbackImages },
    };
  }
}

/**
 * Save all generated images to Firestore for tracking and future reuse
 * This prevents wasting API calls by storing all variations
 */
async function saveGeneratedImagesToFirestore(
  images: GeneratedImage[],
  recipeData: {
    title: string;
    description: string;
    cuisine: string;
    ingredients: string;
  }
): Promise<void> {
  try {
    const admin = await ensureFirebaseAdmin();
    const db = admin.firestore();
    const imagesRef = db.collection('generated_images');

    // Some runtime contexts may not expose FieldValue (mocked or limited envs).
    // Guard access and fall back to a client-side timestamp when needed.
    let timestamp: unknown;
    try {
      timestamp =
        admin && admin.firestore && admin.firestore.FieldValue
          ? admin.firestore.FieldValue.serverTimestamp()
          : { _fallbackServerTs: true, value: new Date() };
    } catch {
      // Fallback to a plain Date so writes still succeed
      timestamp = { _fallbackServerTs: true, value: new Date() };
    }

    function isFallbackTimestamp(x: unknown): x is { _fallbackServerTs: true; value: Date } {
      return (
        typeof x === 'object' &&
        x !== null &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (x as any)._fallbackServerTs === true &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (x as any).value instanceof Date
      );
    }

    // Save each image with metadata
    const savePromises = images.map(async (image, index) => {
      // Defensive: Firestore rejects fields larger than ~1MB. If the image URL
      // is extremely long (for example a data URI), replace it with a short
      // placeholder to avoid write failures and mark the document so admins
      // can recover the original image off-band if needed.
      const MAX_URL_LEN = 1048487; // Firestore reported limit in logs
      let urlToStore = image.url;
      let originalTooLarge = false;
      if (typeof urlToStore === 'string' && urlToStore.length > MAX_URL_LEN) {
        originalTooLarge = true;
        console.warn('Image URL too large for Firestore, replacing with placeholder', {
          length: urlToStore.length,
          recipeTitle: recipeData.title,
          index,
        });
        // Use a compact placeholder URL so the document remains useful in UI
        urlToStore = 'https://placehold.co/800x600?text=image+omitted';
      }

      const imageData: Record<string, unknown> = {
        url: urlToStore,
        description: image.description,
        style: image.style,
        recipeTitle: recipeData.title,
        recipeCuisine: recipeData.cuisine,
        recipeDescription: recipeData.description,
        recipeIngredients: recipeData.ingredients,
        // If timestamp is a fallback object, convert to a Date string to avoid Firestore errors
        generatedAt: isFallbackTimestamp(timestamp) ? timestamp.value.toISOString() : timestamp,
        index: index,
        used: false, // Track if this image was selected by user
      };

      if (originalTooLarge) {
        imageData.originalTooLarge = true;
        // optionally store a short hash so we can find the original in logs/trace
        try {
          const shortId =
            String(Date.now()).slice(-6) + '_' + Math.random().toString(36).slice(2, 6);
          imageData.originalPlaceholderId = shortId;
        } catch {}
      }

      // Create a document with auto-generated ID
      await imagesRef.add(imageData);
    });

    await Promise.all(savePromises);
    console.warn(
      `💾 Saved ${images.length} generated images to Firestore collection: generated_images`
    );
  } catch (error) {
    console.error('Error saving generated images to Firestore:', error);
    throw error;
  }
}

interface VideoHubAssetInput {
  recipeId: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  sceneNumber?: number;
  source?: string;
  storagePath?: string | null;
  model?: string | null;
  ratio?: string | null;
  duration?: number | null;
  voiceId?: string | null;
  prompt?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
}

interface VideoHubAssetRecord {
  id: string;
  recipeId: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  sceneNumber?: number | null;
  source?: string | null;
  storagePath?: string | null;
  model?: string | null;
  ratio?: string | null;
  duration?: number | null;
  voiceId?: string | null;
  prompt?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function truncateForFirestore(value: string, maxLength = 4000): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function sanitizeMetadataForFirestore(value: unknown, depth = 0): unknown {
  if (depth > 3 || value === null || typeof value === 'undefined') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : truncateForFirestore(trimmed);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const sanitizedArray = value
      .slice(0, 10)
      .map(item => sanitizeMetadataForFirestore(item, depth + 1))
      .filter(item => item !== null);
    return sanitizedArray.length > 0 ? sanitizedArray : null;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      const sanitized = sanitizeMetadataForFirestore(val, depth + 1);
      if (sanitized !== null) {
        result[key] = sanitized;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }
  return null;
}

async function logVideoHubAsset(asset: VideoHubAssetInput): Promise<void> {
  try {
    if (!asset.recipeId || !asset.url) return;
    const db = await ensureFirestore();
    const admin = await ensureFirebaseAdmin();

    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload: Record<string, unknown> = {
      recipeId: asset.recipeId,
      type: asset.type,
      url: asset.url,
      updatedAt: now,
    };

    if (typeof asset.sceneNumber === 'number') payload.sceneNumber = asset.sceneNumber;
    if (asset.source) payload.source = asset.source;
    if (asset.storagePath) payload.storagePath = asset.storagePath;
    if (typeof asset.duration === 'number' && Number.isFinite(asset.duration))
      payload.duration = asset.duration;
    if (asset.model) payload.model = asset.model;
    if (asset.ratio) payload.ratio = asset.ratio;
    if (asset.voiceId) payload.voiceId = asset.voiceId;
    if (asset.taskId) payload.taskId = asset.taskId;
    if (asset.prompt) payload.prompt = truncateForFirestore(asset.prompt);
    const sanitizedMetadata = asset.metadata ? sanitizeMetadataForFirestore(asset.metadata) : null;
    if (sanitizedMetadata) payload.metadata = sanitizedMetadata;

    const assetsRef = db.collection('video_generation_assets');
    const existingSnap = await assetsRef
      .where('recipeId', '==', asset.recipeId)
      .where('url', '==', asset.url)
      .limit(1)
      .get();

    if (existingSnap.empty) {
      await assetsRef.add({ ...payload, createdAt: now });
    } else {
      await existingSnap.docs[0].ref.set(payload, { merge: true });
    }
  } catch (loggingError) {
    console.warn(
      'Failed to log video hub asset:',
      loggingError instanceof Error ? loggingError.message : loggingError
    );
  }
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date ? date.toISOString() : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function getVideoHubAssetsAction(
  recipeId: string
): Promise<{ success: boolean; assets?: VideoHubAssetRecord[]; error?: string }> {
  try {
    if (!recipeId || typeof recipeId !== 'string') {
      return { success: false, error: 'A valid recipe ID is required.' };
    }

    const db = await ensureFirestore();
    const assetsRef = db.collection('video_generation_assets');
    const snapshot = await assetsRef
      .where('recipeId', '==', recipeId)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const assets: VideoHubAssetRecord[] = snapshot.docs.map(doc => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        recipeId: String(data.recipeId ?? recipeId),
        type: (data.type as VideoHubAssetRecord['type']) ?? 'image',
        url: String(data.url ?? ''),
        sceneNumber: typeof data.sceneNumber === 'number' ? data.sceneNumber : null,
        source: typeof data.source === 'string' ? data.source : null,
        storagePath: typeof data.storagePath === 'string' ? data.storagePath : null,
        model: typeof data.model === 'string' ? data.model : null,
        ratio: typeof data.ratio === 'string' ? data.ratio : null,
        duration: typeof data.duration === 'number' ? data.duration : null,
        voiceId: typeof data.voiceId === 'string' ? data.voiceId : null,
        prompt: typeof data.prompt === 'string' ? data.prompt : null,
        taskId: typeof data.taskId === 'string' ? data.taskId : null,
        metadata:
          data.metadata && typeof data.metadata === 'object'
            ? (data.metadata as Record<string, unknown>)
            : null,
        createdAt: timestampToIso(data.createdAt) ?? timestampToIso(data.updatedAt),
        updatedAt: timestampToIso(data.updatedAt),
      };
    });

    return { success: true, assets };
  } catch (error) {
    console.error('Error fetching video hub assets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load video hub assets.',
    };
  }
}

/**
 * Mark a generated image as "used" when selected by the user
 */
export async function markImageAsUsedAction(imageUrl: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!getAdmin) {
      const adminConfig = await import('../../config/firebase-admin');
      getAdmin = adminConfig.getAdmin;
    }
    const admin = getAdmin();
    const db = admin.firestore();
    const imagesRef = db.collection('generated_images');

    // Find the image by URL
    let snapshot = await imagesRef.where('url', '==', imageUrl).limit(1).get();

    // Fallback strategies when exact match not found
    if (snapshot.empty) {
      console.warn(
        'Exact image URL not found in generated_images, attempting fallback match for:',
        imageUrl
      );

      // Try decoded URL exact match
      try {
        const decoded = decodeURIComponent(imageUrl);
        if (decoded !== imageUrl) {
          snapshot = await imagesRef.where('url', '==', decoded).limit(1).get();
        }
      } catch {}
    }

    if (snapshot.empty) {
      // As a last resort, scan recent generated_images and try to find a document whose
      // url contains the same filename segment (this handles signed URLs vs storage paths)
      try {
        const filename = (() => {
          try {
            const u = new URL(imageUrl);
            const parts = u.pathname.split('/').filter(Boolean);
            return parts.length ? parts[parts.length - 1] : imageUrl;
          } catch {
            const parts = imageUrl.split('/').filter(Boolean);
            return parts.length ? parts[parts.length - 1] : imageUrl;
          }
        })();

        const recentSnap = await imagesRef.orderBy('generatedAt', 'desc').limit(200).get();
        const found = recentSnap.docs.find((d: FirebaseFirestore.DocumentSnapshot) => {
          const u = String(d.data()?.url || '');
          if (!u) return false;
          if (u === imageUrl) return true;
          try {
            if (decodeURIComponent(u) === imageUrl) return true;
          } catch {}
          if (u.includes(filename) || imageUrl.includes(filename)) return true;
          return false;
        });

        if (found) {
          snapshot = {
            docs: [found],
            empty: false,
          } as unknown as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
        }
      } catch (scanErr) {
        console.warn(
          'Fallback scan for generated_images failed:',
          scanErr instanceof Error ? scanErr.message : String(scanErr)
        );
      }
    }

    if (snapshot.empty) {
      console.warn('Image not found in generated_images collection after fallbacks:', imageUrl);
      return { success: false, error: 'Image not found' };
    }

    // Mark as used
    const doc = snapshot.docs[0];
    await doc.ref.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.warn('✅ Marked image as used (doc id=' + doc.id + '):', imageUrl);
    return { success: true };
  } catch (error) {
    console.error('Error marking image as used:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark image as used',
    };
  }
}

/**
 * Enhance a user-uploaded photo with AI to make it more recipe-appropriate
 * Uses Gemini Vision API to analyze and enhance the image
 */
export async function enhanceUserPhotoAction(
  imageDataUri: string,
  recipeInfo: {
    title: string;
    description: string;
    cuisine: string;
    ingredients: string;
  }
): Promise<{
  success: boolean;
  data?: {
    enhancedImage: string;
    suggestions: string[];
  };
  error?: string;
}> {
  try {
    console.warn('🎨 Enhancing user-uploaded photo for:', recipeInfo.title);

    const apiKey =
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      throw new Error('No API key found');
    }

    // Extract base64 data from data URI
    const base64Match = imageDataUri.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image data URI');
    }
    const base64Image = base64Match[1];

    // Use Gemini Vision to analyze the photo and provide suggestions
    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`,
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
                  text: `You are a professional food photography expert. Analyze this photo of "${recipeInfo.title}" (${recipeInfo.cuisine} cuisine).

Key ingredients: ${recipeInfo.ingredients.split('\n').slice(0, 5).join(', ')}

Provide 3-5 specific suggestions to improve this food photo for a recipe website. Focus on:
1. Lighting improvements
2. Composition and framing
3. Plating presentation
4. Color balance
5. Background and styling

Format as a JSON array of strings: ["suggestion 1", "suggestion 2", ...]`,
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!analysisResponse.ok) {
      console.error('Gemini Vision analysis failed:', await analysisResponse.text());
      // Return original image if analysis fails
      return {
        success: true,
        data: {
          enhancedImage: imageDataUri,
          suggestions: [
            'Original photo looks great!',
            'Consider adjusting lighting for better visibility',
            'Try a cleaner background',
          ],
        },
      };
    }

    const analysisData = await analysisResponse.json();
    let suggestions: string[] = [];

    try {
      const textContent = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      suggestions = JSON.parse(textContent.match(/\[[\s\S]*\]/)?.[0] || '[]');
    } catch {
      suggestions = [
        'Photo looks good! Consider better lighting',
        'Try plating on a neutral background',
        'Add garnish for visual appeal',
      ];
    }

    console.warn('✅ Photo analysis complete:', suggestions.length, 'suggestions');

    // For now, return the original image with suggestions
    // In the future, we could use Gemini Image API to actually enhance the photo
    return {
      success: true,
      data: {
        enhancedImage: imageDataUri,
        suggestions,
      },
    };
  } catch (error) {
    console.error('Error enhancing user photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enhance photo',
    };
  }
}

/**
 * Find and remove duplicate recipes from Firestore
 * Keeps the oldest recipe and removes newer duplicates with the same title (case-insensitive)
 */
export async function removeDuplicateRecipesAction(): Promise<{
  success: boolean;
  removed?: number;
  duplicates?: Array<{ title: string; count: number }>;
  error?: string;
}> {
  try {
    console.warn('🔍 Checking for duplicate recipes...');

    if (!getAdmin) {
      const adminConfig = await import('../../config/firebase-admin');
      getAdmin = adminConfig.getAdmin;
    }
    const admin = getAdmin();
    const db = admin.firestore();
    const recipesRef = db.collection('recipes');

    // Get all recipes
    const snapshot = await recipesRef.get();
    const recipes = snapshot.docs
      .map((doc: FirebaseFirestore.DocumentSnapshot) => {
        const data = doc.data();
        if (!data) return null;
        return {
          id: doc.id,
          title: data.title || '',
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      })
      .filter(Boolean) as RecipeSummary[];

    console.warn(`📚 Total recipes found: ${recipes.length}`);

    // Group recipes by normalized title
    const titleGroups = new Map<string, Array<{ id: string; title: string; createdAt: Date }>>();

    recipes.forEach((recipe: RecipeSummary) => {
      const normalizedTitle = (recipe.title as string)?.trim().toLowerCase() || '';
      if (!normalizedTitle) return;

      if (!titleGroups.has(normalizedTitle)) {
        titleGroups.set(normalizedTitle, []);
      }
      const group = titleGroups.get(normalizedTitle);
      if (group) {
        group.push(recipe);
      }
    });

    // Find duplicates (groups with more than 1 recipe)
    const duplicateGroups = Array.from(titleGroups.entries()).filter(
      ([, group]) => group.length > 1
    );

    if (duplicateGroups.length === 0) {
      console.warn('✅ No duplicate recipes found!');
      return {
        success: true,
        removed: 0,
        duplicates: [],
      };
    }

    console.warn(`⚠️ Found ${duplicateGroups.length} groups with duplicates`);

    let totalRemoved = 0;
    const duplicateInfo: Array<{ title: string; count: number }> = [];

    // Remove duplicates, keeping the oldest one
    for (const [, group] of duplicateGroups) {
      // Sort by createdAt (oldest first)
      group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      const keepRecipe = group[0]; // Keep the oldest
      const duplicatesToRemove = group.slice(1); // Remove the rest

      console.warn(`\n🔄 Processing: "${keepRecipe.title}"`);
      console.warn(`   Keeping: ${keepRecipe.id} (created: ${keepRecipe.createdAt.toISOString()})`);
      console.warn(`   Removing ${duplicatesToRemove.length} duplicate(s)`);

      duplicateInfo.push({
        title: keepRecipe.title,
        count: duplicatesToRemove.length,
      });

      // Delete duplicates
      for (const duplicate of duplicatesToRemove) {
        console.warn(`   ❌ Deleting: ${duplicate.id}`);
        await recipesRef.doc(duplicate.id).delete();
        totalRemoved++;
      }
    }

    console.warn(`\n✅ Cleanup complete! Removed ${totalRemoved} duplicate recipe(s)`);

    return {
      success: true,
      removed: totalRemoved,
      duplicates: duplicateInfo,
    };
  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove duplicates',
    };
  }
}

// =============================================================================
// Instagram Integration Actions
// =============================================================================

/**
 * Share a recipe to Instagram
 * Posts the recipe image with formatted caption to Instagram Business account
 */
export async function shareRecipeToInstagram(recipeId: string): Promise<{
  success: boolean;
  instagramPostId?: string;
  permalink?: string;
  error?: string;
}> {
  try {
    // Initialize instagramApi if not already loaded
    if (!instagramApi) {
      try {
        const igModule = await import('../../config/instagram-api');
        instagramApi = igModule as unknown as typeof instagramApi;
      } catch (importErr) {
        return {
          success: false,
          error:
            'Failed to load Instagram API module: ' +
            (importErr instanceof Error ? importErr.message : String(importErr)),
        };
      }
    }

    // Check if Instagram is configured
    if (!instagramApi || !instagramApi.isConfigured()) {
      return {
        success: false,
        error: 'Instagram API not configured. Please set up environment variables.',
      };
    }

    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }

    // Ensure we have an image URL (not data URI)
    const imageUrl = recipe.imageUrl;
    if (!imageUrl || imageUrl.startsWith('data:')) {
      return {
        success: false,
        error: 'Recipe must have a public image URL (not data URI) to post to Instagram',
      };
    }

    // Prefer using the recipe image URL. If it's hosted in Firebase Storage but
    // not publicly accessible, try to generate a short-lived signed URL. If that
    // fails and a Drive folder is configured, attempt to upload the image to
    // Google Drive and use the drive share link as a fallback.
    let postImageUrl = imageUrl as string;
    try {
      const isStorageUrl =
        String(imageUrl).includes('storage.googleapis.com') ||
        String(imageUrl).includes('firebasestorage.googleapis.com');
      if (isStorageUrl) {
        try {
          const admin = await ensureFirebaseAdmin();
          const storage = admin.storage();

          // Try to parse known storage URL formats to obtain bucket and path
          let bucketName: string | undefined;
          let filePath: string | undefined;
          try {
            const u = new URL(String(imageUrl));
            // Format: https://storage.googleapis.com/<bucket>/<path>
            const parts = u.pathname.split('/').filter(Boolean);
            if (u.hostname === 'storage.googleapis.com' && parts.length >= 2) {
              bucketName = parts[0];
              filePath = parts.slice(1).join('/');
            }
            // Format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media
            if (u.hostname.includes('firebasestorage.googleapis.com')) {
              const m = u.pathname.match(/\/v0\/b\/([^\/]+)\/o\/([^/]+)/);
              if (m) {
                bucketName = m[1];
                filePath = decodeURIComponent(m[2]);
              }
            }
          } catch {
            // ignore parse errors
          }

          if (!bucketName || !filePath) {
            // If we couldn't parse, attempt to use default bucket
            const envBucket = process.env.FIREBASE_STORAGE_BUCKET;
            if (envBucket) bucketName = envBucket;
            // For filePath try to derive from imageUrl by stripping bucket prefix
            try {
              const u2 = new URL(String(imageUrl));
              const pathParts = u2.pathname.split('/').filter(Boolean);
              // remove bucket if present
              if (pathParts.length > 1 && pathParts[0] === bucketName) {
                filePath = pathParts.slice(1).join('/');
              } else {
                filePath = pathParts.join('/');
              }
            } catch {}
          }

          if (bucketName && filePath) {
            const bucket = storage.bucket(bucketName);
            const file = bucket.file(filePath);
            try {
              // generate a short-lived signed URL (1 hour)
              const expires = Date.now() + 1000 * 60 * 60;
              const getSigned = (file as unknown as StorageFileLike).getSignedUrl;
              if (typeof getSigned === 'function') {
                const signedResult = await getSigned({ action: 'read', expires });
                const signedUrl = Array.isArray(signedResult) ? signedResult[0] : signedResult;
                if (typeof signedUrl === 'string' && signedUrl.length > 0) {
                  postImageUrl = signedUrl;
                  console.warn('Using signed URL for Instagram post:', signedUrl);
                }
              }
            } catch (signErr) {
              console.warn(
                'Failed to generate signed URL for storage image, will attempt Drive fallback if configured:',
                signErr instanceof Error ? signErr.message : String(signErr)
              );
            }
          }
        } catch (err) {
          console.warn(
            'Error while attempting to generate signed URL for storage-hosted image:',
            err instanceof Error ? err.message : String(err)
          );
        }
      }

      // If still not a likely-public URL and Drive is configured, try uploading to Drive
      const needsDriveFallback =
        !postImageUrl ||
        !postImageUrl.startsWith('http') ||
        postImageUrl.includes('firebasestorage.googleapis.com');
      if (needsDriveFallback && process.env.DRIVE_FOLDER_ID) {
        try {
          // Fetch image bytes
          const resp = await fetch(String(imageUrl));
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = resp.headers.get('content-type') || 'image/jpeg';

            // Dynamic import of googleapis to avoid requiring it in environments that don't need Drive
            const { google } = await import('googleapis');

            // Resolve credentials
            let creds: Record<string, unknown> | undefined;
            if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
              try {
                creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
              } catch {}
            }
            if (!creds && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
              try {
                const fs = await import('fs');
                const path = process.env.GOOGLE_APPLICATION_CREDENTIALS as string;
                creds = JSON.parse(fs.readFileSync(path, 'utf8'));
              } catch {}
            }

            if (!creds)
              throw new Error('No service account credentials available for Drive upload');

            const auth = new google.auth.GoogleAuth({
              credentials: creds as unknown as Record<string, unknown>,
              scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
            const drive = google.drive({ version: 'v3', auth });

            const fileName = `recipe-${recipeId}-${Date.now()}.jpg`;
            const media = { mimeType: contentType, body: Buffer.from(buffer) } as {
              mimeType: string;
              body: Buffer;
            };

            const driveFolderId = process.env.DRIVE_FOLDER_ID;
            const createRes = await drive.files.create({
              requestBody: {
                name: fileName,
                parents: driveFolderId ? [driveFolderId] : undefined,
              },
              media,
              fields: 'id, webViewLink, webContentLink',
            });

            const fileId = createRes.data.id;
            const webViewLink = createRes.data.webViewLink || createRes.data.webContentLink;
            if (fileId) {
              // Make file publicly readable (best-effort)
              try {
                await drive.permissions.create({
                  fileId,
                  requestBody: { role: 'reader', type: 'anyone' },
                });
              } catch (permErr) {
                console.warn(
                  'Drive permission create failed:',
                  permErr instanceof Error ? permErr.message : String(permErr)
                );
              }

              if (webViewLink) {
                postImageUrl = webViewLink;
                console.warn('Uploaded image to Drive for Instagram posting:', webViewLink);
              }
            }
          } else {
            console.warn('Failed to fetch image bytes for Drive fallback, status:', resp.status);
          }
        } catch (driveErr) {
          console.warn(
            'Drive fallback failed:',
            driveErr instanceof Error ? driveErr.message : String(driveErr)
          );
        }
      }
    } catch (err) {
      console.warn(
        'Unexpected error preparing image URL for Instagram posting:',
        err instanceof Error ? err.message : String(err)
      );
    }

    // Build an intelligent, formatted caption (fallback template)
    type InstagramRecipe = {
      title?: string;
      description?: string;
      prepTime?: string;
      cookTime?: string;
      servings?: number | string;
      ingredients?: string[] | string;
      cuisine?: string;
    };

    async function generateInstagramCaption(recipeObj: InstagramRecipe): Promise<string> {
      try {
        const title =
          typeof recipeObj.title === 'string' && recipeObj.title.trim()
            ? recipeObj.title
            : 'Recipe';
        const desc = (typeof recipeObj.description === 'string' ? recipeObj.description : '').split(
          '\n'
        )[0];
        const prep = recipeObj.prepTime || 'N/A';
        const cook = recipeObj.cookTime || 'N/A';
        const serves = recipeObj.servings ?? 'N/A';

        // Extract ingredient keywords for hashtags
        const rawIngredients: string[] = Array.isArray(recipeObj.ingredients)
          ? recipeObj.ingredients.filter(Boolean).map(String)
          : typeof recipeObj.ingredients === 'string'
            ? recipeObj.ingredients
                .split(/[,;\n]/)
                .map(s => s.trim())
                .filter(Boolean)
            : [];

        const ingredientKeywords = rawIngredients
          .map(
            s =>
              s
                .replace(/\(.+?\)/g, '')
                .trim()
                .split(' ')[0]
          )
          .filter(s => !!s && s.length > 1)
          .slice(0, 4)
          .map(s => `#${s.replace(/[^a-z0-9]/gi, '')}`);

        const cuisineTag = recipeObj.cuisine
          ? `#${String(recipeObj.cuisine).replace(/\s+/g, '')}`
          : '';
        const baseTags = ['#recipe', cuisineTag, '#homemade', '#foodie', '#delicious'].filter(
          Boolean
        );
        const tags = Array.from(new Set([...baseTags, ...ingredientKeywords]))
          .slice(0, 8)
          .join(' ');

        const captionParts = [
          `🍽️ ${title}`,
          desc || undefined,
          rawIngredients.length
            ? `Key ingredients: ${rawIngredients
                .slice(0, 3)
                .map(s => s.trim())
                .filter(Boolean)
                .join(', ')}`
            : undefined,
          `⏱️ Prep: ${prep} | Cook: ${cook}`,
          `👥 Serves: ${serves}`,
          tags || undefined,
          `Full recipe: banoscookbook.com`,
        ].filter(Boolean);

        // Keep caption concise (Instagram prefers shorter intros)
        return captionParts.join('\n\n');
      } catch {
        return `🍽️ ${recipe && recipe.title ? String(recipe.title) : 'Recipe'}\nFull recipe: banoscookbook.com`;
      }
    }

    const caption = await generateInstagramCaption(recipe);

    // Post to Instagram
    if (!instagramApi) {
      return {
        success: false,
        error: 'Instagram API not initialized. Please check configuration.',
      };
    }
    const result = (await instagramApi.publishPost({
      imageUrl: postImageUrl,
      caption: caption.trim(),
    })) as { id: string; permalink: string; timestamp: string };

    // Save Instagram post mapping to Firestore
    await db.collection('instagram_posts').add({
      recipeId,
      instagramMediaId: result.id,
      instagramPermalink: result.permalink,
      postedAt: new Date(result.timestamp),
      caption,
      likeCount: 0,
      commentsCount: 0,
      lastSyncedAt: new Date(),
    });

    console.warn(`✅ Recipe "${recipe.title}" posted to Instagram: ${result.permalink}`);

    // Immediately try to sync comments and likes once published (best-effort)
    try {
      // syncInstagramComments and syncInstagramLikes are exported later in this file
      // call them to seed initial comment/like counts into Firestore
      // Fire-and-forget is acceptable, but we'll await to get initial data
      // (wrap in try/catch so errors don't fail the post)

      await syncInstagramComments(recipeId);

      await syncInstagramLikes(recipeId);
      console.warn('✅ Initial Instagram comments/likes sync completed');
    } catch (syncErr) {
      console.warn(
        'Initial sync after publish failed (non-fatal):',
        syncErr instanceof Error ? syncErr.message : syncErr
      );
    }

    return {
      success: true,
      instagramPostId: result.id,
      permalink: result.permalink,
    };
  } catch (error) {
    console.error('❌ Error posting to Instagram:', error);
    try {
      const db = await ensureFirestore();
      await db.collection('instagram_post_attempts').add({
        recipeId,
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.warn('Failed to log instagram_post_attempts:', logErr);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post to Instagram',
    };
  }
}

/**
 * Share a generated video to Instagram as a Reel
 * Posts the video with formatted caption to Instagram Business account
 */
export async function shareVideoToInstagram(recipeId: string): Promise<{
  success: boolean;
  instagramPostId?: string;
  permalink?: string;
  error?: string;
}> {
  try {
    // Initialize instagramApi if not already loaded
    if (!instagramApi) {
      try {
        const igModule = await import('../../config/instagram-api');
        instagramApi = igModule as unknown as typeof instagramApi;
      } catch (importErr) {
        return {
          success: false,
          error:
            'Failed to load Instagram API module: ' +
            (importErr instanceof Error ? importErr.message : String(importErr)),
        };
      }
    }

    // Check if Instagram is configured
    if (!instagramApi || !instagramApi.isConfigured()) {
      return {
        success: false,
        error: 'Instagram API not configured. Please set up environment variables.',
      };
    }

    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }

    // Get the video script with video URL
    const scriptDoc = await db.collection('video_scripts').doc(recipeId).get();
    if (!scriptDoc.exists || !scriptDoc.data()?.videoUrl) {
      return { success: false, error: 'No video found. Please generate a video first.' };
    }

    const scriptData = scriptDoc.data();
    if (!scriptData) {
      return { success: false, error: 'Video script data is empty' };
    }

    const videoUrl = scriptData.videoUrl;

    // Build an intelligent, formatted caption for the video Reel
    type InstagramRecipe = {
      title?: string;
      description?: string;
      ingredients?: string[] | string;
      cuisine?: string;
    };

    async function generateInstagramVideoCaption(
      recipeObj: InstagramRecipe,
      videoScript: string
    ): Promise<string> {
      try {
        const title =
          typeof recipeObj.title === 'string' && recipeObj.title.trim()
            ? recipeObj.title
            : 'Recipe Video';

        // Extract first few lines of video script for caption
        const scriptLines = videoScript.split('\n').filter(line => line.trim().length > 0);
        const scriptPreview = scriptLines.slice(0, 2).join(' ').trim();

        // Extract ingredient keywords for hashtags
        const rawIngredients: string[] = Array.isArray(recipeObj.ingredients)
          ? recipeObj.ingredients.filter(Boolean).map(String)
          : typeof recipeObj.ingredients === 'string'
            ? recipeObj.ingredients
                .split(/[,;\n]/)
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

        const ingredientKeywords = rawIngredients
          .map(
            s =>
              s
                .replace(/\(.+?\)/g, '')
                .trim()
                .split(' ')[0]
          )
          .filter(s => !!s && s.length > 1)
          .slice(0, 4)
          .map(s => `#${s.replace(/[^a-z0-9]/gi, '')}`);

        const cuisineTag = recipeObj.cuisine
          ? `#${String(recipeObj.cuisine).replace(/\s+/g, '')}`
          : '';
        const baseTags = ['#recipe', '#reel', '#foodie', '#cooking', '#homemade', cuisineTag].filter(
          Boolean
        );
        const tags = Array.from(new Set([...baseTags, ...ingredientKeywords]))
          .slice(0, 8)
          .join(' ');

        const captionParts = [
          `🎬 ${title}`,
          scriptPreview || 'Delicious recipe video!',
          tags || undefined,
          `Full recipe: banoscookbook.com`,
        ].filter(Boolean);

        // Keep caption concise for Reels
        return captionParts.join('\n\n');
      } catch {
        return `🎬 ${recipe && recipe.title ? String(recipe.title) : 'Recipe Video'}\nFull recipe: banoscookbook.com`;
      }
    }

    const caption = await generateInstagramVideoCaption(recipe, scriptData.script);

    // Post video to Instagram as Reel
    if (!instagramApi) {
      return {
        success: false,
        error: 'Instagram API not initialized. Please check configuration.',
      };
    }
    const result = (await instagramApi.publishVideoPost({
      videoUrl: videoUrl,
      caption: caption.trim(),
    })) as { id: string; permalink: string; timestamp: string };

    // Save Instagram post mapping to Firestore (separate collection for video posts)
    await db.collection('instagram_video_posts').add({
      recipeId,
      instagramMediaId: result.id,
      instagramPermalink: result.permalink,
      videoUrl: videoUrl,
      postedAt: new Date(result.timestamp),
      caption,
      likeCount: 0,
      commentsCount: 0,
      lastSyncedAt: new Date(),
    });

    console.warn(
      `✅ Recipe video "${recipe.title}" posted to Instagram as Reel: ${result.permalink}`
    );

    // Immediately try to sync comments and likes once published (best-effort)
    try {
      // syncInstagramVideoComments and syncInstagramVideoLikes are exported later in this file
      // call them to seed initial comment/like counts into Firestore
      // Fire-and-forget is acceptable, but we'll await to get initial data
      // (wrap in try/catch so errors don't fail the post)

      await syncInstagramVideoComments(recipeId);

      await syncInstagramVideoLikes(recipeId);
      console.warn('✅ Initial Instagram video comments/likes sync completed');
    } catch (syncErr) {
      console.warn(
        'Initial sync after video publish failed (non-fatal):',
        syncErr instanceof Error ? syncErr.message : String(syncErr)
      );
    }

    return {
      success: true,
      instagramPostId: result.id,
      permalink: result.permalink,
    };
  } catch (error) {
    console.error('❌ Error posting video to Instagram:', error);
    try {
      const db = await ensureFirestore();
      await db.collection('instagram_video_post_attempts').add({
        recipeId,
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.warn('Failed to log instagram_video_post_attempts:', logErr);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post video to Instagram',
    };
  }
}

/**
 * Sync Instagram comments for a recipe
 * Fetches comments from Instagram and adds them to the recipe
 */
export async function syncInstagramComments(recipeId: string): Promise<{
  success: boolean;
  commentsSynced?: number;
  error?: string;
}> {
  try {
    if (!instagramApi || !instagramApi.isConfigured()) {
      return { success: false, error: 'Instagram API not configured' };
    }

    const db = await ensureFirestore();

    // Find Instagram post for this recipe
    const instagramPostsSnapshot = await db
      .collection('instagram_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (instagramPostsSnapshot.empty) {
      return { success: false, error: 'No Instagram post found for this recipe' };
    }

    const instagramPost = instagramPostsSnapshot.docs[0];
    const instagramData = instagramPost.data();
    const mediaId = instagramData.instagramMediaId;

    // Fetch comments from Instagram
    let instagramComments = [];
    try {
      if (!instagramApi) {
        return { success: false, error: 'Instagram API not initialized' };
      }
      instagramComments = await instagramApi.getComments(mediaId);
      console.warn(
        `🔁 Fetched ${Array.isArray(instagramComments) ? instagramComments.length : 'unknown'} comments from Instagram for media ${mediaId}`
      );
    } catch (igErr) {
      console.error(
        '❌ Failed to fetch comments from Instagram API:',
        igErr instanceof Error ? igErr.message : igErr
      );
      return { success: false, error: igErr instanceof Error ? igErr.message : String(igErr) };
    }

    // Get recipe
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    const existingComments = recipe?.comments || [];

    // Check which Instagram comments are new
    const existingInstagramCommentIds = new Set(
      existingComments
        .filter((c: { instagramCommentId?: string }) => c.instagramCommentId)
        .map((c: { instagramCommentId: string }) => c.instagramCommentId)
    );

    let newCommentCount = 0;

    for (const igComment of instagramComments) {
      // Skip if already synced
      if (existingInstagramCommentIds.has(igComment.id)) {
        continue;
      }

      // Add new comment
      const newComment = {
        id: `ig_${igComment.id}`,
        author: igComment.username,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(igComment.username)}&background=A7D1AB&color=fff`,
        text: igComment.text,
        timestamp: new Date(igComment.timestamp).toISOString(),
        likes: igComment.like_count || 0,
        isFromInstagram: true,
        instagramCommentId: igComment.id,
        instagramUsername: igComment.username,
        replies: [],
      };

      existingComments.push(newComment);
      newCommentCount++;
    }

    // Update recipe with new comments
    if (newCommentCount > 0) {
      await db.collection('recipes').doc(recipeId).update({
        comments: existingComments,
        updatedAt: new Date(),
      });
    }

    // Update Instagram post metadata
    try {
      if (!instagramApi) {
        console.warn('Instagram API not initialized, skipping insights update');
      } else {
        const insights = (await instagramApi.getMediaInsights(mediaId)) as {
          likeCount: number;
          commentsCount: number;
          timestamp: string;
        };
        console.warn(
          `📊 Media insights for ${mediaId}: likes=${insights.likeCount} comments=${insights.commentsCount}`
        );
        await instagramPost.ref.update({
          likeCount: insights.likeCount,
          commentsCount: insights.commentsCount,
          lastSyncedAt: new Date(),
        });
      }
    } catch (insErr) {
      console.error(
        '❌ Failed to fetch media insights from Instagram API:',
        insErr instanceof Error ? insErr.message : insErr
      );
      // Continue - don't fail entire sync on insights error
    }

    console.warn(`✅ Synced ${newCommentCount} new comments from Instagram`);

    return {
      success: true,
      commentsSynced: newCommentCount,
    };
  } catch (error) {
    console.error('❌ Error syncing Instagram comments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync comments',
    };
  }
}

/**
 * Sync Instagram likes for a recipe
 * Updates like count from Instagram
 */
export async function syncInstagramLikes(recipeId: string): Promise<{
  success: boolean;
  likeCount?: number;
  error?: string;
}> {
  try {
    if (!instagramApi || !instagramApi.isConfigured()) {
      return { success: false, error: 'Instagram API not configured' };
    }

    const db = await ensureFirestore();

    // Find Instagram post
    const instagramPostsSnapshot = await db
      .collection('instagram_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (instagramPostsSnapshot.empty) {
      return { success: false, error: 'No Instagram post found for this recipe' };
    }

    const instagramPost = instagramPostsSnapshot.docs[0];
    const instagramData = instagramPost.data();
    const mediaId = instagramData.instagramMediaId;

    // Get insights
    try {
      if (!instagramApi) {
        return { success: false, error: 'Instagram API not initialized' };
      }
      const insights = (await instagramApi.getMediaInsights(mediaId)) as {
        likeCount: number;
        commentsCount: number;
        timestamp: string;
      };
      await instagramPost.ref.update({
        likeCount: insights.likeCount,
        commentsCount: insights.commentsCount,
        lastSyncedAt: new Date(),
      });

      console.warn(`✅ Synced Instagram likes: ${insights.likeCount}`);

      return {
        success: true,
        likeCount: insights.likeCount,
      };
    } catch (err) {
      console.error(
        '❌ Failed to fetch media insights when syncing likes:',
        err instanceof Error ? err.message : String(err)
      );
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  } catch (error) {
    console.error('❌ Error syncing Instagram likes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync likes',
    };
  }
}

/**
 * Get Instagram post info for a recipe
 */
export async function getInstagramPostInfo(recipeId: string): Promise<{
  success: boolean;
  post?: {
    permalink: string;
    likeCount: number;
    commentsCount: number;
    postedAt: Date;
  };
  error?: string;
}> {
  try {
    const db = await ensureFirestore();

    const snapshot = await db
      .collection('instagram_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'No Instagram post found' };
    }

    const data = snapshot.docs[0].data();

    return {
      success: true,
      post: {
        permalink: data.instagramPermalink,
        likeCount: data.likeCount || 0,
        commentsCount: data.commentsCount || 0,
        postedAt: data.postedAt?.toDate() || new Date(),
      },
    };
  } catch (error) {
    console.error('❌ Error getting Instagram post info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get post info',
    };
  }
}

/**
 * Sync Instagram comments for a video Reel
 * Fetches comments from Instagram and adds them to the recipe
 */
export async function syncInstagramVideoComments(recipeId: string): Promise<{
  success: boolean;
  commentsSynced?: number;
  error?: string;
}> {
  try {
    if (!instagramApi || !instagramApi.isConfigured()) {
      return { success: false, error: 'Instagram API not configured' };
    }

    const db = await ensureFirestore();

    // Find Instagram video post for this recipe
    const instagramPostsSnapshot = await db
      .collection('instagram_video_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (instagramPostsSnapshot.empty) {
      return { success: false, error: 'No Instagram video post found for this recipe' };
    }

    const instagramPost = instagramPostsSnapshot.docs[0];
    const instagramData = instagramPost.data();
    const mediaId = instagramData.instagramMediaId;

    // Fetch comments from Instagram
    let instagramComments = [];
    try {
      if (!instagramApi) {
        return { success: false, error: 'Instagram API not initialized' };
      }
      instagramComments = await instagramApi.getComments(mediaId);
      console.warn(
        `🔁 Fetched ${Array.isArray(instagramComments) ? instagramComments.length : 'unknown'} comments from Instagram for video ${mediaId}`
      );
    } catch (igErr) {
      console.error(
        '❌ Failed to fetch comments from Instagram API:',
        igErr instanceof Error ? igErr.message : igErr
      );
      return { success: false, error: igErr instanceof Error ? igErr.message : String(igErr) };
    }

    // Get recipe
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    const existingComments = recipe?.comments || [];

    // Check which Instagram comments are new
    const existingInstagramCommentIds = new Set(
      existingComments
        .filter((c: { instagramCommentId?: string }) => c.instagramCommentId)
        .map((c: { instagramCommentId: string }) => c.instagramCommentId)
    );

    let newCommentCount = 0;

    for (const igComment of instagramComments) {
      // Skip if already synced
      if (existingInstagramCommentIds.has(igComment.id)) {
        continue;
      }

      // Add new comment
      const newComment = {
        id: `ig_video_${igComment.id}`,
        author: igComment.username,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(igComment.username)}&background=A7D1AB&color=fff`,
        text: igComment.text,
        timestamp: new Date(igComment.timestamp).toISOString(),
        likes: igComment.like_count || 0,
        isFromInstagram: true,
        instagramCommentId: igComment.id,
        instagramUsername: igComment.username,
        isVideoComment: true, // Mark as video comment
        replies: [],
      };

      existingComments.push(newComment);
      newCommentCount++;
    }

    // Update recipe with new comments
    if (newCommentCount > 0) {
      await db.collection('recipes').doc(recipeId).update({
        comments: existingComments,
        updatedAt: new Date(),
      });
    }

    // Update Instagram video post metadata
    try {
      if (!instagramApi) {
        console.warn('Instagram API not initialized, skipping insights update');
      } else {
        const insights = (await instagramApi.getMediaInsights(mediaId)) as {
          likeCount: number;
          commentsCount: number;
          timestamp: string;
        };
        console.warn(
          `📊 Video insights for ${mediaId}: likes=${insights.likeCount} comments=${insights.commentsCount}`
        );
        await instagramPost.ref.update({
          likeCount: insights.likeCount,
          commentsCount: insights.commentsCount,
          lastSyncedAt: new Date(),
        });
      }
    } catch (insErr) {
      console.error(
        '❌ Failed to fetch video media insights from Instagram API:',
        insErr instanceof Error ? insErr.message : insErr
      );
      // Continue - don't fail entire sync on insights error
    }

    console.warn(`✅ Synced ${newCommentCount} new comments from Instagram video`);

    return {
      success: true,
      commentsSynced: newCommentCount,
    };
  } catch (error) {
    console.error('❌ Error syncing Instagram video comments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync video comments',
    };
  }
}

/**
 * Sync Instagram likes for a video Reel
 * Updates like count from Instagram
 */
export async function syncInstagramVideoLikes(recipeId: string): Promise<{
  success: boolean;
  likeCount?: number;
  error?: string;
}> {
  try {
    if (!instagramApi || !instagramApi.isConfigured()) {
      return { success: false, error: 'Instagram API not configured' };
    }

    const db = await ensureFirestore();

    // Find Instagram video post
    const instagramPostsSnapshot = await db
      .collection('instagram_video_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (instagramPostsSnapshot.empty) {
      return { success: false, error: 'No Instagram video post found for this recipe' };
    }

    const instagramPost = instagramPostsSnapshot.docs[0];
    const instagramData = instagramPost.data();
    const mediaId = instagramData.instagramMediaId;

    // Get insights
    try {
      if (!instagramApi) {
        return { success: false, error: 'Instagram API not initialized' };
      }
      const insights = (await instagramApi.getMediaInsights(mediaId)) as {
        likeCount: number;
        commentsCount: number;
        timestamp: string;
      };
      await instagramPost.ref.update({
        likeCount: insights.likeCount,
        commentsCount: insights.commentsCount,
        lastSyncedAt: new Date(),
      });

      console.warn(`✅ Synced Instagram video likes: ${insights.likeCount}`);

      return {
        success: true,
        likeCount: insights.likeCount,
      };
    } catch (err) {
      console.error(
        '❌ Failed to fetch video media insights when syncing likes:',
        err instanceof Error ? err.message : String(err)
      );
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  } catch (error) {
    console.error('❌ Error syncing Instagram video likes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync video likes',
    };
  }
}

/**
 * Get Instagram video post info for a recipe
 */
export async function getInstagramVideoPostInfo(recipeId: string): Promise<{
  success: boolean;
  post?: {
    permalink: string;
    likeCount: number;
    commentsCount: number;
    postedAt: Date;
  };
  error?: string;
}> {
  try {
    const db = await ensureFirestore();

    const snapshot = await db
      .collection('instagram_video_posts')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'No Instagram video post found' };
    }

    const data = snapshot.docs[0].data();

    return {
      success: true,
      post: {
        permalink: data.instagramPermalink,
        likeCount: data.likeCount || 0,
        commentsCount: data.commentsCount || 0,
        postedAt: data.postedAt?.toDate() || new Date(),
      },
    };
  } catch (error) {
    console.error('❌ Error getting Instagram video post info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get video post info',
    };
  }
}

/**
 * Generate a single video for a recipe using Runway ML
 */
export async function generateRecipeVideoAction(
  recipeId: string,
  model: RunwayModel = 'gen4_turbo',
  options?: {
    ratio?: string;
    duration?: number;
    timeoutMs?: number;
    maxRetries?: number;
    previewOnly?: boolean;
    promptOverride?: string;
  }
): Promise<{
  success: boolean;
  videoUrl?: string;
  imageUrl?: string;
  taskId?: string;
  promptText?: string;
  settings?: { model: RunwayModel; ratio: string; duration: number };
  error?: string;
}> {
  try {
    console.warn('🎬 Starting video generation for recipe:', recipeId);

    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }

    // Check if recipe has an image
    if (!recipe.imageUrl) {
      return {
        success: false,
        error: 'Recipe must have an image. Please add an image to the recipe first.',
      };
    }

    // Get the video script
    const scriptDoc = await db.collection('video_scripts').doc(recipeId).get();
    if (!scriptDoc.exists || !scriptDoc.data()?.script) {
      return { success: false, error: 'No video script found. Please generate a video script first.' };
    }

    const scriptData = scriptDoc.data();
    if (!scriptData) {
      return { success: false, error: 'Script data is empty' };
    }

    // Import the video generation utility
    const { generateRecipeVideo, optimizePromptForRunway } = await import('@/lib/openai-video-gen');

    // Build prompt and settings but allow preview-only
    const overridePrompt =
      typeof options?.promptOverride === 'string' && options.promptOverride.trim().length > 0
        ? options.promptOverride.trim()
        : undefined;
    const promptText =
      overridePrompt ?? (await optimizePromptForRunway(recipe.title, scriptData.script));
    const ratio = options?.ratio || '1280:720';
    const duration = typeof options?.duration === 'number' ? options.duration : 5;

    if (options?.previewOnly) {
      return {
        success: true,
        promptText,
        settings: { model, ratio, duration },
        imageUrl: recipe.imageUrl,
      };
    }

    // Generate the video
    console.warn('🎬 Generating video...');
    const genResult = await generateRecipeVideo(
      recipe.imageUrl,
      recipe.title,
      scriptData.script,
      model,
      {
        ratio,
        duration,
        timeoutMs: options?.timeoutMs,
        maxRetries: options?.maxRetries,
        promptOverride: overridePrompt,
      }
    );

    // Save the video URL to Firestore
    await db
      .collection('video_scripts')
      .doc(recipeId)
      .update({
        videoUrl: genResult.videoUrl,
        videoGeneratedAt: new Date(),
        // Keep the old fields for backward compatibility
        storyboardUrl: genResult.videoUrl,
        storyboardGeneratedAt: new Date(),
        runwayTaskId: genResult.taskId || null,
        runwayPrompt: genResult.promptText || null,
        runwaySettings: genResult.settings || null,
      });

    console.warn('✅ Video saved to Firestore');

    try {
      await logVideoHubAsset({
        recipeId,
        type: 'video',
        url: genResult.videoUrl,
        source: 'single-scene',
        duration: genResult.settings?.duration ?? options?.duration ?? undefined,
        model: genResult.settings?.model ?? model,
        ratio: genResult.settings?.ratio ?? options?.ratio,
        prompt: genResult.promptText,
        taskId: genResult.taskId,
      });
    } catch (logErr) {
      console.warn(
        'Failed to log single-scene video asset:',
        logErr instanceof Error ? logErr.message : logErr
      );
    }

    return {
      success: true,
      videoUrl: genResult.videoUrl,
      imageUrl: recipe.imageUrl, // Return recipe image for reference
      taskId: genResult.taskId,
      promptText: genResult.promptText,
      settings: genResult.settings,
    };
  } catch (error) {
    console.error('❌ Error generating video:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate video',
    };
  }
}

/**
 * Share a multi-scene combined video to Instagram as a Reel
 */
export async function shareMultiSceneVideoToInstagram(recipeId: string): Promise<{
  success: boolean;
  instagramPostId?: string;
  permalink?: string;
  error?: string;
}> {
  try {
    // Initialize instagramApi if not already loaded
    if (!instagramApi) {
      try {
        const igModule = await import('../../config/instagram-api');
        instagramApi = igModule as unknown as typeof instagramApi;
      } catch (importErr) {
        return {
          success: false,
          error:
            'Failed to load Instagram API module: ' +
            (importErr instanceof Error ? importErr.message : String(importErr)),
        };
      }
    }

    // Check if Instagram is configured
    if (!instagramApi || !instagramApi.isConfigured()) {
      return {
        success: false,
        error: 'Instagram API not configured. Please set up environment variables.',
      };
    }

    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }

    // Get the multi-scene video data
    const scriptDoc = await db.collection('multi_scene_video_scripts').doc(recipeId).get();
    if (!scriptDoc.exists || !scriptDoc.data()?.combinedVideoUrl) {
      return { success: false, error: 'No combined video found. Please combine scenes first.' };
    }

    const scriptData = scriptDoc.data();
    if (!scriptData) {
      return { success: false, error: 'Multi-scene video data is empty' };
    }

    const videoUrl = scriptData.combinedVideoUrl;

    // Build caption for multi-scene video
    async function generateMultiSceneVideoCaption(
      recipeObj: { title?: string; ingredients?: string[] | string; cuisine?: string },
      sceneCount: number
    ): Promise<string> {
      try {
        const title =
          typeof recipeObj.title === 'string' && recipeObj.title.trim()
            ? recipeObj.title
            : 'Recipe Video';

        // Extract ingredient keywords for hashtags
        const rawIngredients: string[] = Array.isArray(recipeObj.ingredients)
          ? recipeObj.ingredients.filter(Boolean).map(String)
          : typeof recipeObj.ingredients === 'string'
            ? recipeObj.ingredients
                .split(/[,;\n]/)
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

        const ingredientKeywords = rawIngredients
          .map(
            s =>
              s
                .replace(/\(.+?\)/g, '')
                .trim()
                .split(' ')[0]
          )
          .filter(s => !!s && s.length > 1)
          .slice(0, 4)
          .map(s => `#${s.replace(/[^a-z0-9]/gi, '')}`);

        const cuisineTag = recipeObj.cuisine
          ? `#${String(recipeObj.cuisine).replace(/\s+/g, '')}`
          : '';
        const baseTags = [
          '#recipe',
          '#reel',
          '#foodie',
          '#cooking',
          '#homemade',
          cuisineTag,
        ].filter(Boolean);
        const tags = Array.from(new Set([...baseTags, ...ingredientKeywords]))
          .slice(0, 8)
          .join(' ');

        const captionParts = [
          `🎬 ${title} - Complete Recipe`,
          `Multi-scene video with ${sceneCount} cooking steps!`,
          tags || undefined,
          `Full recipe: banoscookbook.com`,
        ].filter(Boolean);

        return captionParts.join('\n\n');
      } catch {
        return `🎬 ${recipe && recipe.title ? String(recipe.title) : 'Recipe Video'} - Complete Recipe\nFull recipe: banoscookbook.com`;
      }
    }

    const caption = await generateMultiSceneVideoCaption(
      recipe,
      scriptData.sceneCount || scriptData.scenes?.length || 3
    );

    // Post video to Instagram as Reel
    if (!instagramApi) {
      return {
        success: false,
        error: 'Instagram API not initialized. Please check configuration.',
      };
    }
    const result = (await instagramApi.publishVideoPost({
      videoUrl: videoUrl,
      caption: caption.trim(),
    })) as { id: string; permalink: string; timestamp: string };

    // Save Instagram post mapping to Firestore
    await db.collection('instagram_multi_scene_video_posts').add({
      recipeId,
      instagramMediaId: result.id,
      instagramPermalink: result.permalink,
      videoUrl: videoUrl,
      postedAt: new Date(result.timestamp),
      caption,
      sceneCount: scriptData.sceneCount || scriptData.scenes?.length || 3,
      likeCount: 0,
      commentsCount: 0,
      lastSyncedAt: new Date(),
    });

    console.warn(
      `✅ Multi-scene video "${recipe.title}" posted to Instagram as Reel: ${result.permalink}`
    );

    return {
      success: true,
      instagramPostId: result.id,
      permalink: result.permalink,
    };
  } catch (error) {
    console.error('❌ Error posting multi-scene video to Instagram:', error);
    try {
      const db = await ensureFirestore();
      await db.collection('instagram_multi_scene_video_post_attempts').add({
        recipeId,
        error: error instanceof Error ? error.message : String(error),
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.warn('Failed to log instagram_multi_scene_video_post_attempts:', logErr);
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to post multi-scene video to Instagram',
    };
  }
}

/**
 * Combine previously generated scene videos into a single reel-ready video
 */
export async function combineVideoScenesAction(recipeId: string): Promise<{
  success: boolean;
  combinedVideoUrl?: string;
  duration?: number;
  fileSize?: number;
  storagePath?: string;
  processingMethod?: 'cloudinary' | 'ffmpeg' | 'manual';
  instructions?: string;
  error?: string;
}> {
  try {
    if (!recipeId || typeof recipeId !== 'string') {
      return { success: false, error: 'A valid recipe ID is required to combine videos.' };
    }

    const db = await ensureFirestore();

    const docRef = db.collection('multi_scene_video_scripts').doc(recipeId);
    const scriptDoc = await docRef.get();

    if (!scriptDoc.exists) {
      return {
        success: false,
        error: 'No multi-scene script found. Generate scenes before combining videos.',
      };
    }

    const scriptData = scriptDoc.data();
    if (!scriptData) {
      return { success: false, error: 'Script data missing for this recipe.' };
    }

    const sceneVideosRaw = Array.isArray(scriptData.sceneVideos) ? scriptData.sceneVideos : [];
    const sceneVideos = sceneVideosRaw
      .map(scene => {
        const record = scene as Record<string, unknown>;
        const sceneNumber = Number(record.sceneNumber);
        const videoUrl = typeof record.videoUrl === 'string' ? record.videoUrl : undefined;
        const runwaySettings = record.runwaySettings as Record<string, unknown> | undefined;
        let duration: number | undefined;
        if (typeof record.duration === 'number') {
          duration = record.duration;
        } else if (typeof record.duration === 'string') {
          const parsed = Number(record.duration);
          if (Number.isFinite(parsed)) duration = parsed;
        }
        return {
          sceneNumber,
          videoUrl,
          runwaySettings,
          duration,
        };
      })
      .filter(scene => Number.isFinite(scene.sceneNumber) && !!scene.videoUrl);

    if (sceneVideos.length === 0) {
      return {
        success: false,
        error: 'No generated scene videos found. Generate scene videos first.',
      };
    }

    sceneVideos.sort((a, b) => a.sceneNumber - b.sceneNumber);

    const scriptScenes = Array.isArray(scriptData.scenes) ? scriptData.scenes : [];
    const sceneMeta = new Map<number, { duration?: number; transition?: string }>();
    for (const rawScene of scriptScenes) {
      const sceneObj = rawScene as Record<string, unknown>;
      const number = Number(sceneObj.sceneNumber);
      if (!Number.isFinite(number)) continue;
      const advanced = sceneObj.advancedOptions as Record<string, unknown> | undefined;
      let advDuration: number | undefined;
      if (typeof advanced?.duration === 'number') {
        advDuration = advanced.duration;
      } else if (typeof advanced?.duration === 'string') {
        const parsed = Number(advanced.duration);
        if (Number.isFinite(parsed)) advDuration = parsed;
      }
      let storedDuration: number | undefined;
      if (typeof sceneObj.duration === 'number') {
        storedDuration = sceneObj.duration;
      } else if (typeof sceneObj.duration === 'string') {
        const parsed = Number(sceneObj.duration);
        if (Number.isFinite(parsed)) storedDuration = parsed;
      }
      const transition = typeof sceneObj.transition === 'string' ? sceneObj.transition : undefined;
      sceneMeta.set(number, {
        duration: advDuration ?? storedDuration,
        transition,
      });
    }

    const combinationScenes = sceneVideos.map(scene => {
      const meta = sceneMeta.get(scene.sceneNumber);
      const settings = scene.runwaySettings as { duration?: unknown } | undefined;
      let runwayDuration: number | undefined;
      if (typeof settings?.duration === 'number') {
        runwayDuration = settings.duration;
      } else if (typeof settings?.duration === 'string') {
        const parsed = Number(settings.duration);
        if (Number.isFinite(parsed)) runwayDuration = parsed;
      }
      const durationCandidates = [runwayDuration, scene.duration, meta?.duration];
      const duration =
        durationCandidates.find(
          value => typeof value === 'number' && Number.isFinite(value) && Number(value) > 0
        ) ?? 5;
      return {
        sceneNumber: scene.sceneNumber,
        videoUrl: String(scene.videoUrl),
        duration,
        transition: meta?.transition,
      };
    });

    const recipeTitle =
      typeof scriptData.recipeTitle === 'string'
        ? scriptData.recipeTitle
        : typeof scriptData.title === 'string'
          ? scriptData.title
          : undefined;

    const { combineVideoScenes } = await import('@/lib/video-combination');
    const combinationOptions: VideoCombinationOptions = {
      scenes: combinationScenes,
      recipeId,
      recipeTitle,
      outputFormat: 'mp4',
      frameRate: 30,
    };

    const combinationResult = await combineVideoScenes(combinationOptions);

    if (combinationResult.success && combinationResult.combinedVideoUrl) {
      const fallbackDuration = combinationScenes.reduce(
        (sum, scene) => sum + (scene.duration ?? 0),
        0
      );
      await docRef.update({
        combinedVideoUrl: combinationResult.combinedVideoUrl,
        combinedVideoDuration: combinationResult.duration ?? fallbackDuration,
        combinedVideoSize: combinationResult.fileSize ?? null,
        combinedVideoStoragePath: combinationResult.storagePath ?? null,
        combinedVideoProcessingMethod: combinationResult.processingMethod ?? 'ffmpeg',
        combinedVideoThumbnailUrl: combinationResult.thumbnailUrl ?? null,
        combinedVideoInstructions: combinationResult.instructions ?? null,
        combinedVideoGeneratedAt: new Date(),
      });

      try {
        await logVideoHubAsset({
          recipeId,
          type: 'video',
          url: combinationResult.combinedVideoUrl,
          source: 'combined-video',
          duration: combinationResult.duration ?? fallbackDuration,
          storagePath: combinationResult.storagePath ?? null,
          model: combinationResult.processingMethod ?? 'ffmpeg',
          metadata: {
            fileSize: combinationResult.fileSize,
            sceneCount: combinationScenes.length,
          },
        });
      } catch (logErr) {
        console.warn(
          'Failed to log combined video asset:',
          logErr instanceof Error ? logErr.message : logErr
        );
      }

      return {
        success: true,
        combinedVideoUrl: combinationResult.combinedVideoUrl,
        duration: combinationResult.duration ?? fallbackDuration,
        fileSize: combinationResult.fileSize,
        storagePath: combinationResult.storagePath,
        processingMethod: combinationResult.processingMethod,
      };
    }

    if (combinationResult.instructions) {
      await docRef.set(
        {
          combinedVideoInstructions: combinationResult.instructions,
          combinedVideoProcessingMethod: combinationResult.processingMethod ?? 'manual',
          combinedVideoGeneratedAt: new Date(),
        },
        { merge: true }
      );
    }

    return {
      success: false,
      error: combinationResult.error || 'Failed to combine scene videos automatically.',
      instructions: combinationResult.instructions,
      processingMethod: combinationResult.processingMethod,
    };
  } catch (error) {
    console.error('Error in combineVideoScenesAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to combine scene videos.',
    };
  }
}

/**
 * Share an individual scene video to Instagram as a Reel
 */
export async function shareSceneVideoToInstagram(
  recipeId: string,
  sceneNumber: number
): Promise<{
  success: boolean;
  instagramPostId?: string;
  permalink?: string;
  error?: string;
}> {
  try {
    // Initialize instagramApi if not already loaded
    if (!instagramApi) {
      try {
        const igModule = await import('../../config/instagram-api');
        instagramApi = igModule as unknown as typeof instagramApi;
      } catch (importErr) {
        return {
          success: false,
          error:
            'Failed to load Instagram API module: ' +
            (importErr instanceof Error ? importErr.message : String(importErr)),
        };
      }
    }

    // Check if Instagram is configured
    if (!instagramApi || !instagramApi.isConfigured()) {
      return {
        success: false,
        error: 'Instagram API not configured. Please set up environment variables.',
      };
    }

    const db = await ensureFirestore();

    // Get recipe details
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      return { success: false, error: 'Recipe not found' };
    }

    const recipe = recipeDoc.data();
    if (!recipe) {
      return { success: false, error: 'Recipe data is empty' };
    }

    // Get the multi-scene video data
    const scriptDoc = await db.collection('multi_scene_video_scripts').doc(recipeId).get();
    if (!scriptDoc.exists || !scriptDoc.data()?.sceneVideos) {
      return {
        success: false,
        error: 'No scene videos found. Please generate scene videos first.',
      };
    }

    const scriptData = scriptDoc.data();
    if (!scriptData || !scriptData.sceneVideos) {
      return { success: false, error: 'Scene videos data is empty' };
    }

    // Find the specific scene
    const scene = scriptData.sceneVideos.find(
      (s: { sceneNumber: number; videoUrl?: string; script?: string }) =>
        s.sceneNumber === sceneNumber
    );
    if (!scene || !scene.videoUrl) {
      return { success: false, error: `Scene ${sceneNumber} video not found.` };
    }

    const videoUrl = scene.videoUrl;
    const sceneScript = scene.script || 'Recipe cooking scene';

    // Build caption for scene video
    async function generateSceneVideoCaption(
      recipeObj: { title?: string; ingredients?: string[] | string; cuisine?: string },
      sceneNumber: number,
      sceneScript: string
    ): Promise<string> {
      try {
        const title =
          typeof recipeObj.title === 'string' && recipeObj.title.trim()
            ? recipeObj.title
            : 'Recipe Video';

        // Extract ingredient keywords for hashtags
        const rawIngredients: string[] = Array.isArray(recipeObj.ingredients)
          ? recipeObj.ingredients.filter(Boolean).map(String)
          : typeof recipeObj.ingredients === 'string'
            ? recipeObj.ingredients
                .split(/[,;\n]/)
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

        const ingredientKeywords = rawIngredients
          .map(
            s =>
              s
                .replace(/\(.+?\)/g, '')
                .trim()
                .split(' ')[0]
          )
          .filter(s => !!s && s.length > 1)
          .slice(0, 4)
          .map(s => `#${s.replace(/[^a-z0-9]/gi, '')}`);

        const cuisineTag = recipeObj.cuisine
          ? `#${String(recipeObj.cuisine).replace(/\s+/g, '')}`
          : '';
        const baseTags = ['#recipe', '#reel', '#foodie', '#cooking', '#homemade', cuisineTag].filter(
          Boolean
        );
        const tags = Array.from(new Set([...baseTags, ...ingredientKeywords]))
          .slice(0, 8)
          .join(' ');

        const captionParts = [
          `🎬 ${title} - Scene ${sceneNumber}`,
          sceneScript.substring(0, 100) + (sceneScript.length > 100 ? '...' : ''),
          tags || undefined,
          `Full recipe: banoscookbook.com`,
        ].filter(Boolean);

        return captionParts.join('\n\n');
      } catch {
        return `🎬 ${recipe && recipe.title ? String(recipe.title) : 'Recipe Video'} - Scene ${sceneNumber}\nFull recipe: banoscookbook.com`;
      }
    }

    const caption = await generateSceneVideoCaption(recipe, sceneNumber, sceneScript);

    // Post video to Instagram as Reel
    if (!instagramApi) {
      return {
        success: false,
        error: 'Instagram API not initialized. Please check configuration.',
      };
    }
    const result = (await instagramApi.publishVideoPost({
      videoUrl: videoUrl,
      caption: caption.trim(),
    })) as { id: string; permalink: string; timestamp: string };

    // Save Instagram post mapping to Firestore
    await db.collection('instagram_scene_video_posts').add({
      recipeId,
      sceneNumber,
      instagramMediaId: result.id,
      instagramPermalink: result.permalink,
      videoUrl: videoUrl,
      postedAt: new Date(result.timestamp),
      caption,
      sceneScript,
      likeCount: 0,
      commentsCount: 0,
      lastSyncedAt: new Date(),
    });

    console.warn(
      `✅ Scene ${sceneNumber} video "${recipe.title}" posted to Instagram as Reel: ${result.permalink}`
    );

    return {
      success: true,
      instagramPostId: result.id,
      permalink: result.permalink,
    };
  } catch (_error) {
    console.error('❌ Error posting scene video to Instagram:', _error);
    try {
      const db = await ensureFirestore();
      await db.collection('instagram_scene_video_post_attempts').add({
        recipeId,
        sceneNumber,
        error: _error instanceof Error ? _error.message : String(_error),
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.warn('Failed to log instagram_scene_video_post_attempts:', logErr);
    }
    return {
      success: false,
      error: _error instanceof Error ? _error.message : 'Failed to post scene video to Instagram',
    };
  }
}

// ============================================================================
// Video Editor Actions
// ============================================================================

/**
 * Fetch assets for a recipe from Firestore
 */
export async function fetchAssetsForRecipe(recipeId: string) {
  try {
    const adminConfig = await import('../../config/firebase-admin');
    const db = adminConfig.getDb();
    const snapshot = await db.collection('asset_library').where('recipeId', '==', recipeId).get();

    const assets = snapshot.docs.map((doc: FirebaseFirestore.DocumentSnapshot) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate(),
      };
    });

    return { success: true, assets };
  } catch (error) {
    console.error('🎬 Fetch assets error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch assets',
      assets: [],
    };
  }
}

/**
 * Delete an asset from Firebase Storage and Firestore
 */
export async function deleteAsset(assetId: string) {
  try {
    const adminConfig = await import('../../config/firebase-admin');
    const admin = adminConfig.getAdmin();
    const db = adminConfig.getDb();
    const storage = admin.storage();

    // Get asset document
    const assetDoc = await db.collection('asset_library').doc(assetId).get();
    if (!assetDoc.exists) {
      throw new Error('Asset not found');
    }

    const assetData = assetDoc.data();
    const storagePath = assetData?.storagePath;

    // Delete from Firebase Storage
    if (storagePath) {
      try {
        await storage.bucket().file(storagePath).delete();
        console.warn('🎬 Deleted file from storage:', storagePath);
      } catch (storageError) {
        console.warn('🎬 Storage delete warning:', storageError);
        // Continue even if storage delete fails (file might not exist)
      }
    }

    // Delete from Firestore
    await assetDoc.ref.delete();
    console.warn('🎬 Deleted asset document:', assetId);

    return { success: true };
  } catch (error) {
    console.error('🎬 Delete asset error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete asset',
    };
  }
}

/**
 * Save timeline to Firestore
 */
export async function saveTimeline(timeline: { id: string; [key: string]: unknown }) {
  try {
    const adminConfig = await import('../../config/firebase-admin');
    const db = adminConfig.getDb();
    const admin = adminConfig.getAdmin();
    const { FieldValue } = admin.firestore;

    const timelineData = {
      ...timeline,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Check if timeline exists
    const timelineDoc = db.collection('timelines').doc(timeline.id);
    const doc = await timelineDoc.get();

    if (doc.exists) {
      // Update existing
      await timelineDoc.update(timelineData);
    } else {
      // Create new
      await timelineDoc.set({
        ...timelineData,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    console.warn('🎬 Timeline saved:', timeline.id);
    return { success: true };
  } catch (error) {
    console.error('🎬 Save timeline error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save timeline',
    };
  }
}

/**
 * Load timeline from Firestore
 */
export async function loadTimeline(timelineId: string) {
  try {
    const adminConfig = await import('../../config/firebase-admin');
    const db = adminConfig.getDb();
    const doc = await db.collection('timelines').doc(timelineId).get();

    if (!doc.exists) {
      return { success: false, error: 'Timeline not found', timeline: null };
    }

    const data = doc.data();
    const timeline = {
      ...data,
      id: doc.id,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    };

    return { success: true, timeline };
  } catch (error) {
    console.error('🎬 Load timeline error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load timeline',
      timeline: null,
    };
  }
}

/**
 * Get or create timeline for recipe
 */
export async function getOrCreateTimelineForRecipe(recipeId: string, recipeName: string) {
  try {
    const adminConfig = await import('../../config/firebase-admin');
    const db = adminConfig.getDb();

    // Check if timeline exists for this recipe
    const snapshot = await db
      .collection('timelines')
      .where('recipeId', '==', recipeId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        success: true,
        timeline: {
          ...data,
          id: doc.id,
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate() || new Date(),
        },
      };
    }

    // Create new timeline
    const admin = adminConfig.getAdmin();
    const { FieldValue } = admin.firestore;
    const newTimeline = {
      id: `timeline-${Date.now()}`,
      recipeId,
      name: `${recipeName} Timeline`,
      duration: 60,
      fps: 30,
      resolution: { width: 1280, height: 720 },
      tracks: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('timelines').doc(newTimeline.id).set(newTimeline);

    return { success: true, timeline: newTimeline };
  } catch (error) {
    console.error('🎬 Get/create timeline error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get/create timeline',
      timeline: null,
    };
  }
}

// ============================================================
// RECIPE STEP VIDEO ACTIONS
// Each recipe instruction step → one Runway video clip → merged
// into a full cooking instructional video.
// ============================================================

export interface StepVideoRecord {
  stepIndex: number;
  stepText: string;
  runwayPrompt: string;
  duration: number;
  cameraAngle: string;
  videoUrl?: string;
  videoGeneratedAt?: Date | string;
}

/**
 * Generate Runway-optimized visual prompts for every recipe instruction step
 * and save them to Firestore at recipe_step_videos/{recipeId}.
 * Safe to call multiple times — re-generates prompts without wiping existing videoUrls.
 */
export async function generateStepVideoPromptsAction(recipeId: string): Promise<{
  success: boolean;
  steps?: StepVideoRecord[];
  error?: string;
}> {
  try {
    const db = await ensureFirestore();
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) return { success: false, error: 'Recipe not found' };

    const recipe = recipeDoc.data();
    if (!recipe) return { success: false, error: 'Recipe data missing' };

    const instructions: string[] = Array.isArray(recipe.instructions)
      ? (recipe.instructions as string[]).filter(Boolean)
      : [];

    if (instructions.length === 0) {
      return { success: false, error: 'Recipe has no instruction steps. Please add steps first.' };
    }

    const { generateStepVideoPrompts } = await import('@/ai/flows/generate-step-video-prompts');
    const prompts = await generateStepVideoPrompts(
      recipe.title ?? 'Recipe',
      recipe.description ?? '',
      Array.isArray(recipe.ingredients) ? (recipe.ingredients as string[]) : [],
      instructions
    );

    // Merge with any existing records so we don't overwrite generated videoUrls
    const existingDoc = await db.collection('recipe_step_videos').doc(recipeId).get();
    const existingSteps: StepVideoRecord[] = existingDoc.exists
      ? ((existingDoc.data()?.steps as StepVideoRecord[]) ?? [])
      : [];

    const merged: StepVideoRecord[] = prompts.map((p) => {
      const existing = existingSteps.find((e) => e.stepIndex === p.stepIndex);
      return {
        ...p,
        videoUrl: existing?.videoUrl,
        videoGeneratedAt: existing?.videoGeneratedAt,
      };
    });

    await db.collection('recipe_step_videos').doc(recipeId).set({
      recipeId,
      steps: merged,
      updatedAt: new Date(),
    });

    return { success: true, steps: merged };
  } catch (error) {
    console.error('[generateStepVideoPromptsAction]', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fetch existing step video records for a recipe (prompts + any generated videoUrls).
 */
export async function getRecipeStepVideosAction(recipeId: string): Promise<{
  success: boolean;
  steps?: StepVideoRecord[];
  error?: string;
}> {
  try {
    const db = await ensureFirestore();
    const doc = await db.collection('recipe_step_videos').doc(recipeId).get();
    if (!doc.exists) return { success: true, steps: [] };
    const steps = (doc.data()?.steps as StepVideoRecord[]) ?? [];
    return { success: true, steps };
  } catch (error) {
    console.error('[getRecipeStepVideosAction]', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Generate a Runway ML video for a single recipe instruction step.
 * Uses the recipe's main image as the reference frame for visual consistency.
 * Updates Firestore recipe_step_videos/{recipeId} with the returned videoUrl.
 */
export async function generateSingleStepVideoAction(
  recipeId: string,
  stepIndex: number
): Promise<{
  success: boolean;
  videoUrl?: string;
  stepIndex?: number;
  error?: string;
}> {
  try {
    const db = await ensureFirestore();

    // Fetch recipe for image + title
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) return { success: false, error: 'Recipe not found' };
    const recipe = recipeDoc.data();
    if (!recipe?.imageUrl) {
      return {
        success: false,
        error: 'Recipe has no image. Please add or generate an image first.',
      };
    }

    // Fetch step record (must have had prompts generated first)
    const stepDoc = await db.collection('recipe_step_videos').doc(recipeId).get();
    if (!stepDoc.exists) {
      return {
        success: false,
        error: 'Step prompts not found. Generate prompts first.',
      };
    }
    const steps: StepVideoRecord[] = (stepDoc.data()?.steps as StepVideoRecord[]) ?? [];
    const step = steps.find((s) => s.stepIndex === stepIndex);
    if (!step) {
      return { success: false, error: `Step ${stepIndex} not found. Run prompt generation first.` };
    }

    // Call Runway ML image-to-video
    const { generateRecipeVideo } = await import('@/lib/openai-video-gen');
    const genResult = await generateRecipeVideo(
      recipe.imageUrl as string,
      `${recipe.title ?? 'Recipe'} — Step ${stepIndex + 1}`,
      step.runwayPrompt,
      'gen4_turbo',
      {
        duration: step.duration as 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10,
        ratio: '1280:720',
        promptOverride: step.runwayPrompt,
      }
    );

    const videoUrl = typeof genResult === 'string' ? genResult : genResult.videoUrl;

    // Persist the videoUrl back to Firestore
    const updatedSteps = steps.map((s) =>
      s.stepIndex === stepIndex ? { ...s, videoUrl, videoGeneratedAt: new Date() } : s
    );
    await db.collection('recipe_step_videos').doc(recipeId).update({ steps: updatedSteps });

    // Log asset
    try {
      await logVideoHubAsset({
        recipeId,
        type: 'video',
        url: videoUrl,
        sceneNumber: stepIndex + 1,
        source: 'step-video',
        duration: step.duration,
      });
    } catch {
      // Non-fatal
    }

    return { success: true, videoUrl, stepIndex };
  } catch (error) {
    console.error('[generateSingleStepVideoAction]', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Combine all generated step videos into a single instructional video using
 * the same FFmpeg/Cloudinary pipeline as the scene-based combiner.
 */
export async function combineRecipeStepVideosAction(recipeId: string): Promise<{
  success: boolean;
  combinedVideoUrl?: string;
  duration?: number;
  processingMethod?: string;
  error?: string;
}> {
  try {
    const db = await ensureFirestore();

    const stepDoc = await db.collection('recipe_step_videos').doc(recipeId).get();
    if (!stepDoc.exists) {
      return { success: false, error: 'No step videos found. Generate step videos first.' };
    }
    const steps: StepVideoRecord[] = (stepDoc.data()?.steps as StepVideoRecord[]) ?? [];
    const readySteps = steps
      .filter((s) => typeof s.videoUrl === 'string' && s.videoUrl.length > 0)
      .sort((a, b) => a.stepIndex - b.stepIndex);

    if (readySteps.length === 0) {
      return { success: false, error: 'No step videos have been generated yet.' };
    }

    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    const recipeTitle =
      recipeDoc.exists && typeof recipeDoc.data()?.title === 'string'
        ? (recipeDoc.data()!.title as string)
        : undefined;

    const { combineVideoScenes } = await import('@/lib/video-combination');
    const combinationResult = await combineVideoScenes({
      scenes: readySteps.map((s) => ({
        sceneNumber: s.stepIndex + 1,
        videoUrl: s.videoUrl as string,
        duration: s.duration ?? 6,
      })),
      recipeId,
      recipeTitle,
      outputFormat: 'mp4',
      frameRate: 30,
    });

    if (!combinationResult.success || !combinationResult.combinedVideoUrl) {
      return {
        success: false,
        error: combinationResult.error ?? 'Combination failed — no output URL returned.',
      };
    }

    // Persist combined URL back to Firestore
    await db.collection('recipe_step_videos').doc(recipeId).update({
      combinedVideoUrl: combinationResult.combinedVideoUrl,
      combinedAt: new Date(),
    });

    return {
      success: true,
      combinedVideoUrl: combinationResult.combinedVideoUrl,
      duration: combinationResult.duration,
      processingMethod: combinationResult.processingMethod,
    };
  } catch (error) {
    console.error('[combineRecipeStepVideosAction]', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
