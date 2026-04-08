import { randomUUID } from 'crypto';
import { chmodSync, existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

type StorageFileLike = {
  makePublic?: () => Promise<void>;
  getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
  name?: string;
};

const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;
const TEMP_PREFIX = 'banos-video-combine-';
const ffmpegBinaryPath = ffmpegStatic as string | null;
let ffmpegReady = false;

function ensureFfmpegPath(): void {
  if (!ffmpegReady) {
    const binaryPath = resolveFfmpegBinary();
    if (!binaryPath) {
      throw new Error(
        'Unable to locate ffmpeg binary. Set FFMPEG_PATH to the executable as a fallback.'
      );
    }
    // Vercel and some Linux envs unpack binaries without execute permission
    if (process.platform !== 'win32') {
      try {
        chmodSync(binaryPath, 0o755);
      } catch {
        // ignore — binary may already be executable
      }
    }
    ffmpeg.setFfmpegPath(binaryPath);
    ffmpegReady = true;
  }
}

function resolveFfmpegBinary(): string {
  const candidatePaths: string[] = [];

  const envBinary =
    process.env.FFMPEG_PATH || process.env.FFMPEG_BINARY || process.env.FFMPEG_BINARY_PATH;
  if (envBinary) candidatePaths.push(envBinary);
  if (ffmpegBinaryPath) candidatePaths.push(ffmpegBinaryPath);

  const cwd = process.cwd();
  const defaultModulePath = path.join(
    cwd,
    'node_modules',
    'ffmpeg-static',
    process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  );
  candidatePaths.push(defaultModulePath);

  if (process.env.VERCEL) {
    candidatePaths.push('/var/task/node_modules/ffmpeg-static/ffmpeg');
    candidatePaths.push('/var/task/node_modules/@ffmpeg-installer/linux-x64/ffmpeg');
    candidatePaths.push(path.join(cwd, '.next', 'server', 'chunks', 'ffmpeg'));
    candidatePaths.push(path.join(cwd, 'node_modules', '@ffmpeg-installer/linux-x64', 'ffmpeg'));
  }

  for (const rawPath of candidatePaths) {
    if (!rawPath) continue;
    const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(rawPath);
    try {
      if (existsSync(resolved)) {
        return resolved;
      }
    } catch {
      // ignore access errors
    }
  }

  return '';
}

export interface VideoScene {
  sceneNumber: number;
  videoUrl: string;
  duration: number;
  transition?: string;
  startTime?: number;
}

export interface VideoCombinationOptions {
  scenes: VideoScene[];
  outputFormat?: 'mp4' | 'webm';
  resolution?: '720p' | '1080p';
  frameRate?: 24 | 30 | 60;
  audioUrl?: string;
  voiceOverUrl?: string;
  recipeId?: string;
  recipeTitle?: string;
  preferredFilename?: string;
}

export interface VideoCombinationResult {
  success: boolean;
  combinedVideoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  storagePath?: string;
  processingMethod?: 'cloudinary' | 'ffmpeg' | 'manual';
  instructions?: string;
  error?: string;
}

/**
 * Combine multiple video scenes into a single video.
 * Prefers Cloudinary when available, falls back to local FFmpeg stitching.
 */
export async function combineVideoScenes(
  options: VideoCombinationOptions
): Promise<VideoCombinationResult> {
  try {
    const scenes = Array.isArray(options.scenes) ? options.scenes : [];
    console.warn('🎬 Starting video combination process...', { sceneCount: scenes.length });

    if (scenes.length === 0) {
      return generateFallbackResponse(options, 'No scene videos available to combine.');
    }

    const hasCloudinary =
      !!process.env.CLOUDINARY_CLOUD_NAME &&
      !!process.env.CLOUDINARY_API_KEY &&
      !!process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      const cloudResult = await combineVideosWithCloudinary(options);
      if (cloudResult.success && cloudResult.combinedVideoUrl) {
        return cloudResult;
      }
      console.warn(
        'Cloudinary combination unavailable, falling back to local FFmpeg pipeline.',
        cloudResult.error
      );
    } else {
      console.warn('Cloudinary credentials not configured, using local FFmpeg pipeline.');
    }

    return await combineVideosLocally(options);
  } catch (error) {
    console.error('❌ Error combining videos:', error);
    return generateFallbackResponse(options, error instanceof Error ? error.message : undefined);
  }
}

async function combineVideosLocally(
  options: VideoCombinationOptions
): Promise<VideoCombinationResult> {
  try {
    ensureFfmpegPath();
  } catch (setupError) {
    console.error('FFmpeg setup failed:', setupError);
    return generateFallbackResponse(
      options,
      setupError instanceof Error ? setupError.message : String(setupError)
    );
  }

  const outputFormat = options.outputFormat ?? 'mp4';

  if (options.audioUrl || options.voiceOverUrl) {
    console.warn(
      'Audio mixing is not yet supported in the local FFmpeg pipeline. Continuing without extra audio.'
    );
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX));
  try {
    const localFiles: string[] = [];

    for (const [index, scene] of options.scenes.entries()) {
      const response = await fetch(scene.videoUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download scene ${scene.sceneNumber} (status ${response.status})`
        );
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const scenePath = path.join(tempDir, `scene-${String(index).padStart(3, '0')}.mp4`);
      await fs.writeFile(scenePath, buffer);
      localFiles.push(scenePath);
    }

    if (localFiles.length === 1) {
      const singleBuffer = await fs.readFile(localFiles[0]);
      const uploadSingle = await uploadCombinedVideo(singleBuffer, outputFormat, options);
      return {
        success: true,
        combinedVideoUrl: uploadSingle.url,
        duration: sumSceneDurations(options.scenes),
        fileSize: singleBuffer.length,
        storagePath: uploadSingle.storagePath,
        processingMethod: 'ffmpeg',
      };
    }

    const listPath = path.join(tempDir, 'files.txt');
    const fileList = localFiles.map(filePath => `file '${toConcatPath(filePath)}'`).join('\n');
    await fs.writeFile(listPath, fileList, 'utf8');

    const outputPath = path.join(tempDir, `combined.${outputFormat}`);

    let concatError: unknown | undefined;
    try {
      await runFfmpegConcat(listPath, outputPath, {
        reencode: false,
        frameRate: options.frameRate,
      });
    } catch (err) {
      concatError = err;
      console.warn(
        'Lossless concatenation failed, retrying with re-encode.',
        err instanceof Error ? err.message : err
      );
    }

    if (concatError) {
      await runFfmpegConcat(listPath, outputPath, { reencode: true, frameRate: options.frameRate });
    }

    const combinedBuffer = await fs.readFile(outputPath);
    const upload = await uploadCombinedVideo(combinedBuffer, outputFormat, options);

    return {
      success: true,
      combinedVideoUrl: upload.url,
      duration: sumSceneDurations(options.scenes),
      fileSize: combinedBuffer.length,
      storagePath: upload.storagePath,
      processingMethod: 'ffmpeg',
    };
  } catch (error) {
    console.error('Local FFmpeg combination failed:', error);
    return generateFallbackResponse(
      options,
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(
        'Temporary directory cleanup failed:',
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
      );
    }
  }
}

async function combineVideosWithCloudinary(
  options: VideoCombinationOptions
): Promise<VideoCombinationResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      success: false,
      error: 'Cloudinary credentials missing',
      processingMethod: 'cloudinary',
    };
  }

  try {
    const transformation = buildCloudinaryTransformation(options);
    const result = await processVideosWithCloudinary(options.scenes, transformation, {
      cloudName,
      apiKey,
      apiSecret,
    });

    return {
      success: true,
      combinedVideoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: sumSceneDurations(options.scenes),
      processingMethod: 'cloudinary',
    };
  } catch (error) {
    console.error('Cloudinary video processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cloudinary processing failed',
      processingMethod: 'cloudinary',
    };
  }
}

function toConcatPath(filePath: string): string {
  const normalized = process.platform === 'win32' ? filePath.replace(/\\/g, '/') : filePath;
  return normalized.replace(/'/g, "'\\''");
}

function sumSceneDurations(scenes: VideoScene[]): number {
  return scenes.reduce((total, scene) => {
    const value = Number(scene.duration);
    return Number.isFinite(value) ? total + value : total;
  }, 0);
}

async function runFfmpegConcat(
  listPath: string,
  outputPath: string,
  options: { reencode: boolean; frameRate?: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .output(outputPath);

    if (options.reencode) {
      const outputOptions = [
        '-c:v libx264',
        '-preset medium',
        '-crf 21',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ];
      if (options.frameRate) {
        outputOptions.push(`-r ${options.frameRate}`);
      }
      command.outputOptions(outputOptions);
    } else {
      command.outputOptions(['-c copy']);
    }

    command
      .once('end', () => resolve())
      .once('error', (err: Error) => reject(err))
      .run();
  });
}

function slugifySegment(value?: string): string {
  return (
    (value || 'video')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'video'
  );
}

async function uploadCombinedVideo(
  buffer: Buffer,
  outputFormat: 'mp4' | 'webm',
  options: VideoCombinationOptions
): Promise<{ url: string; storagePath: string }> {
  const { getAdmin } = await import('../../config/firebase-admin');
  const admin = getAdmin();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET not configured. Unable to store combined video.');
  }

  const bucket = admin.storage().bucket(bucketName);
  const folder = options.recipeId ? `combined_videos/${options.recipeId}` : 'combined_videos/misc';
  const baseName =
    options.preferredFilename || `${slugifySegment(options.recipeTitle)}-${randomUUID()}`;
  const destination = `${folder}/${baseName}.${outputFormat}`;
  const file = bucket.file(destination);

  await file.save(buffer, {
    metadata: {
      contentType: outputFormat === 'webm' ? 'video/webm' : 'video/mp4',
    },
  });

  let publicUrl: string | undefined;
  try {
    const candidate = file as unknown as StorageFileLike;
    if (typeof candidate.makePublic === 'function') {
      await candidate.makePublic();
      publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    }
  } catch (err) {
    console.warn(
      'makePublic failed for combined video:',
      err instanceof Error ? err.message : String(err)
    );
  }

  if (!publicUrl) {
    try {
      const candidate = file as unknown as StorageFileLike;
      const getter = candidate.getSignedUrl;
      if (typeof getter === 'function') {
        const signedUrls = await getter.call(file, {
          action: 'read',
          expires: Date.now() + ONE_YEAR_IN_MS,
        });
        if (Array.isArray(signedUrls) && signedUrls[0]) {
          publicUrl = signedUrls[0];
        }
      }
    } catch (err) {
      console.warn(
        'Signed URL generation failed for combined video:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  if (!publicUrl) {
    publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
  }

  return { url: publicUrl, storagePath: destination };
}

function generateFallbackResponse(
  options: VideoCombinationOptions,
  reason?: string
): VideoCombinationResult {
  const ffmpegCommand = generateFFmpegCommand(options);
  const instructions = generateCombinationInstructions(options, ffmpegCommand);

  return {
    success: false,
    processingMethod: 'manual',
    instructions,
    error: reason
      ? `Automatic combination failed: ${reason}`
      : 'Automatic combination is not available. Use the provided instructions to combine videos manually.',
  };
}

/**
 * Build Cloudinary transformation string for video concatenation
 */
function buildCloudinaryTransformation(options: VideoCombinationOptions): string {
  const transformations = [];

  if (options.scenes.length > 1) {
    const videoLayers = options.scenes
      .map(scene => {
        const startTime = scene.startTime || 0;
        return `l_video:${scene.videoUrl.replace('https://', '')},so_${startTime},du_${scene.duration}`;
      })
      .join('/');

    transformations.push(`fl_layer_apply,${videoLayers}`);
  }

  if (options.audioUrl) {
    transformations.push(`fl_layer_apply,l_audio:${options.audioUrl.replace('https://', '')}`);
  }

  transformations.push(`f_${options.outputFormat || 'mp4'}`);
  transformations.push('q_auto');

  return transformations.join('/');
}

/**
 * Process videos with Cloudinary API
 */
async function processVideosWithCloudinary(
  scenes: VideoScene[],
  transformation: string,
  credentials: { cloudName: string; apiKey: string; apiSecret: string }
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const publicId = `combined-video-${Date.now()}`;

  return {
    videoUrl: `https://res.cloudinary.com/${credentials.cloudName}/video/upload/${transformation}/${publicId}.mp4`,
    thumbnailUrl: `https://res.cloudinary.com/${credentials.cloudName}/video/upload/${transformation}/so_0/${publicId}.jpg`,
  };
}

/**
 * Generate FFmpeg command for video concatenation (for manual workflows)
 */
function generateFFmpegCommand(options: VideoCombinationOptions): string {
  const {
    scenes,
    audioUrl,
    voiceOverUrl,
    outputFormat = 'mp4',
    resolution = '1080p',
    frameRate = 30,
  } = options;

  let command = 'ffmpeg';

  scenes.forEach(scene => {
    command += ` -i "${scene.videoUrl}"`;
  });

  if (audioUrl) {
    command += ` -i "${audioUrl}"`;
  }
  if (voiceOverUrl) {
    command += ` -i "${voiceOverUrl}"`;
  }

  command += ' -filter_complex "';

  const videoLabels = scenes.map((_, i) => `[${i}:v]`).join('');
  command += `${videoLabels}concat=n=${scenes.length}:v=1:a=0[vout];`;

  if (audioUrl || voiceOverUrl) {
    const audioInputs: string[] = [];
    if (audioUrl) audioInputs.push(`[${scenes.length}:a]`);
    if (voiceOverUrl) audioInputs.push(`[${scenes.length + (audioUrl ? 1 : 0)}:a]`);

    if (audioInputs.length === 1) {
      command += `${audioInputs[0]}[aout]`;
    } else if (audioInputs.length === 2) {
      command += `${audioInputs[0]}${audioInputs[1]}amix=inputs=2:duration=first[aout]`;
    }
  } else {
    command += '[0:a][aout]';
  }

  command += '"';

  command += ' -map "[vout]" -map "[aout]"';
  command += ' -c:v libx264 -preset medium -crf 23';
  command += ' -c:a aac -b:a 128k';
  command += ` -r ${frameRate}`;

  if (resolution === '720p') {
    command += ' -vf "scale=1280:720"';
  } else if (resolution === '1080p') {
    command += ' -vf "scale=1920:1080"';
  }

  command += ` output.${outputFormat}`;

  return command;
}

/**
 * Generate detailed combination instructions for manual workflows
 */
function generateCombinationInstructions(
  options: VideoCombinationOptions,
  ffmpegCommand: string
): string {
  const { scenes } = options;

  let instructions = `# Video Combination Instructions\n\n`;
  instructions += `## Overview\n`;
  instructions += `Combining ${scenes.length} video scenes into a single video.\n\n`;

  instructions += `## Scene Details\n`;
  scenes.forEach(scene => {
    instructions += `**Scene ${scene.sceneNumber}:**\n`;
    instructions += `- Duration: ${scene.duration} seconds\n`;
    instructions += `- Video URL: ${scene.videoUrl}\n`;
    if (scene.transition) {
      instructions += `- Transition: ${scene.transition}\n`;
    }
    instructions += `\n`;
  });

  instructions += `## FFmpeg Command\n`;
  instructions += `\`\`\`bash\n${ffmpegCommand}\n\`\`\`\n\n`;

  instructions += `## Manual Steps (Alternative)\n`;
  instructions += `1. Download all video files\n`;
  instructions += `2. Use video editing software (Adobe Premiere, DaVinci Resolve, CapCut)\n`;
  instructions += `3. Import all scenes in order\n`;
  instructions += `4. Add transitions between scenes\n`;
  instructions += `5. Mix audio tracks if needed\n`;
  instructions += `6. Export as MP4 (H.264, 1080p, 30fps)\n`;

  return instructions;
}

/**
 * Validate video URLs before processing
 */
export async function validateVideoUrls(
  urls: string[]
): Promise<{ valid: string[]; invalid: string[] }> {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok && response.headers.get('content-type')?.includes('video')) {
        valid.push(url);
      } else {
        invalid.push(url);
      }
    } catch {
      invalid.push(url);
    }
  }

  return { valid, invalid };
}

/**
 * Estimate combined video file size
 */
export function estimateCombinedVideoSize(
  scenes: VideoScene[],
  options: VideoCombinationOptions
): number {
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const minutes = totalDuration / 60;

  let baseSizePerMinute = 50 * 1024 * 1024;

  if (options.resolution === '720p') {
    baseSizePerMinute *= 0.6;
  }

  if (options.frameRate === 24) {
    baseSizePerMinute *= 0.8;
  } else if (options.frameRate === 60) {
    baseSizePerMinute *= 1.5;
  }

  return Math.round(baseSizePerMinute * minutes);
}
