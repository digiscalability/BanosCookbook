/**
 * Veo 3.1 Video Generation Client
 *
 * Replaces the Runway ML image-to-video pipeline with Google's Veo 3.1
 * text-to-video API. Generated videos are uploaded to Firebase Storage
 * and returned as durable public signed URLs.
 *
 * Model: veo-3.1-generate-preview
 * SDK:   @google/genai
 */

import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VeoGenerateOptions {
  /** Aspect ratio — defaults to 16:9 for landscape kitchen shots */
  aspectRatio?: '16:9' | '9:16';
  /** Duration in seconds: 4, 6, or 8 (8 required for 1080p/4k) */
  durationSeconds?: 4 | 6 | 8;
  /** Resolution — defaults to 720p for faster generation */
  resolution?: '720p' | '1080p';
  /** How often to poll for completion in ms (default: 10 000) */
  pollIntervalMs?: number;
  /** Max wait time in ms before giving up (default: 5 min) */
  timeoutMs?: number;
}

export interface VeoVideoResult {
  videoUrl: string;       // Durable Firebase Storage signed URL
  operationName: string;  // Veo operation name (for debugging)
  promptText: string;     // Prompt that was sent to Veo
  settings: {
    model: string;
    aspectRatio: string;
    durationSeconds: number;
    resolution: string;
  };
}

// ---------------------------------------------------------------------------
// Lazy client initialisation
// ---------------------------------------------------------------------------

let _client: GoogleGenAI | null = null;

function getVeoClient(): GoogleGenAI {
  if (!_client) {
    const apiKey =
      process.env.GOOGLE_AI_API_KEY ??
      process.env.GOOGLE_GENAI_API_KEY ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY;

    if (!apiKey) throw new Error('No Google AI API key found for Veo 3.1');
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Core: generate and store
// ---------------------------------------------------------------------------

/**
 * Generate a video with Veo 3.1, poll until ready, upload to Firebase Storage,
 * and return a signed URL.
 *
 * @param prompt     - Full Veo-optimised text prompt (from buildVeoPrompt)
 * @param filename   - Desired filename in Firebase Storage (no extension needed)
 * @param options    - Generation config overrides
 */
export async function generateVideoWithVeo3(
  prompt: string,
  filename: string,
  options: VeoGenerateOptions = {}
): Promise<VeoVideoResult> {
  const {
    aspectRatio = '16:9',
    durationSeconds = 6,
    resolution = '720p',
    pollIntervalMs = 10_000,
    timeoutMs = 5 * 60 * 1000,
  } = options;

  const ai = getVeoClient();
  const model = 'veo-3.1-generate-preview';

  console.warn(`[Veo3] Starting generation — model: ${model}, duration: ${durationSeconds}s`);
  console.warn(`[Veo3] Prompt (${prompt.length} chars): ${prompt.substring(0, 120)}…`);

  // Start the async operation
  let operation = await ai.models.generateVideos({
    model,
    prompt,
    config: {
      aspectRatio,
      durationSeconds,
      resolution,
    } as Record<string, unknown>,
  });

  // Poll until complete
  const deadline = Date.now() + timeoutMs;
  while (!operation.done) {
    if (Date.now() > deadline) {
      throw new Error(`[Veo3] Timed out after ${timeoutMs / 1000}s waiting for video`);
    }
    console.warn('[Veo3] Still generating… polling again in', pollIntervalMs / 1000, 's');
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  // Extract video bytes
  const generatedVideos = (operation.response as Record<string, unknown>)?.generatedVideos as
    Array<{ video: { uri?: string; mimeType?: string } }> | undefined;

  if (!generatedVideos?.length) {
    throw new Error('[Veo3] No videos in operation response');
  }

  const videoData = generatedVideos[0].video;
  const videoUri = videoData?.uri;

  if (!videoUri) {
    throw new Error('[Veo3] No URI in generated video response');
  }

  console.warn('[Veo3] Video ready, URI:', videoUri.substring(0, 80), '…');

  // Fetch the video bytes from the Veo Files API
  const videoBuffer = await fetchVeoVideoBytes(videoUri, ai);

  // Upload to Firebase Storage and get a signed URL
  const storageFilename = `${filename.replace(/[^a-z0-9_-]/gi, '_')}-${Date.now()}.mp4`;
  const publicUrl = await uploadVideoToStorage(videoBuffer, storageFilename);

  console.warn('[Veo3] Uploaded to Firebase Storage:', publicUrl.substring(0, 80), '…');

  return {
    videoUrl: publicUrl,
    operationName: String((operation as unknown as Record<string, unknown>).name ?? 'unknown'),
    promptText: prompt,
    settings: { model, aspectRatio, durationSeconds, resolution },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch video bytes from a Veo Files API URI.
 * The URI is authenticated — we add the API key as a query param.
 */
async function fetchVeoVideoBytes(uri: string, ai: GoogleGenAI): Promise<Buffer> {
  // The @google/genai SDK exposes ai.files.download for server-side byte retrieval
  try {
    // Attempt SDK download path first
    const fileData = await (ai as unknown as {
      files: { download: (opts: { file: { uri: string } }) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> }> }
    }).files.download({ file: { uri } });

    const ab = await fileData.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    // Fallback: raw fetch with API key appended
    const apiKey =
      process.env.GOOGLE_AI_API_KEY ??
      process.env.GOOGLE_GENAI_API_KEY ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      '';

    const fetchUrl = uri.includes('?') ? `${uri}&key=${apiKey}` : `${uri}?key=${apiKey}`;
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`[Veo3] Failed to fetch video bytes: ${res.status} ${res.statusText}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
}

/**
 * Upload a video Buffer to Firebase Admin Storage.
 * Mirrors the pattern used by uploadAudioToStorage in audio-utils.ts.
 */
async function uploadVideoToStorage(buffer: Buffer, filename: string): Promise<string> {
  try {
    const adminConfig = await import('../../config/firebase-admin');
    const admin = adminConfig.getAdmin();
    const bucket = admin.storage().bucket();

    const file = bucket.file(`videos/${filename}`);
    await file.save(buffer, {
      metadata: { contentType: 'video/mp4' },
    });

    try {
      await file.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/videos/${filename}`;
    } catch {
      // Fall back to a long-lived signed URL (1 year)
      const expires = Date.now() + 1000 * 60 * 60 * 24 * 365;
      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires });
      return signedUrl;
    }
  } catch (err) {
    console.error('[Veo3] uploadVideoToStorage failed:', err);
    // Return a placeholder so callers can surface an error rather than crashing
    throw new Error(`[Veo3] Storage upload failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Convenience wrapper for the step-video workflow
// ---------------------------------------------------------------------------

/**
 * Generate a single cooking-step video with Veo 3.1.
 *
 * Drop-in replacement for the Runway generateRecipeVideo() call in
 * generateSingleStepVideoAction — same return shape for easy migration.
 */
export async function generateStepVideoWithVeo3(
  recipeId: string,
  stepIndex: number,
  prompt: string,
  options: VeoGenerateOptions = {}
): Promise<{ videoUrl: string; promptText: string; settings: VeoVideoResult['settings'] }> {
  const filename = `step-${recipeId}-${stepIndex}`;
  const result = await generateVideoWithVeo3(prompt, filename, {
    aspectRatio: '16:9',
    durationSeconds: 6,
    resolution: '720p',
    ...options,
  });

  return {
    videoUrl: result.videoUrl,
    promptText: result.promptText,
    settings: result.settings,
  };
}
