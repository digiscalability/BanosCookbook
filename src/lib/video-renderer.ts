/**
 * Video Renderer using FFmpeg.wasm
 * Processes timeline data into a rendered video file
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

import type {
  AudioTrack,
  ExportSettings,
  SubtitleTrack,
  Timeline,
  VideoClip,
} from '@/lib/types/video-editor';

export interface RenderProgress {
  phase: 'loading' | 'fetching' | 'processing' | 'finalizing' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface RenderOptions {
  onProgress?: (progress: RenderProgress) => void;
  exportSettings: ExportSettings;
}

let ffmpegInstance: FFmpeg | null = null;

/**
 * Initialize FFmpeg.wasm instance
 */
async function initFFmpeg(onProgress?: (progress: RenderProgress) => void): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  onProgress?.({
    phase: 'loading',
    progress: 0,
    message: 'Loading FFmpeg...',
  });

  const ffmpeg = new FFmpeg();

  // Set up logging
  ffmpeg.on('log', ({ message }) => {
    console.warn('FFmpeg:', message);
  });

  // Set up progress tracking
  ffmpeg.on('progress', ({ progress, time: _time }) => {
    onProgress?.({
      phase: 'processing',
      progress: Math.round(progress * 100),
      message: `Rendering video... ${Math.round(progress * 100)}%`,
    });
  });

  // Load FFmpeg core
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;

  onProgress?.({
    phase: 'loading',
    progress: 100,
    message: 'FFmpeg loaded successfully',
  });

  return ffmpeg;
}

/**
 * Fetch and write media files to FFmpeg virtual filesystem
 */
async function fetchMediaFiles(
  ffmpeg: FFmpeg,
  clips: VideoClip[],
  audioTracks: AudioTrack[],
  onProgress?: (progress: RenderProgress) => void
): Promise<Map<string, string>> {
  const fileMap = new Map<string, string>();
  const allUrls = [...clips.map(c => c.url), ...audioTracks.map(a => a.url)];

  onProgress?.({
    phase: 'fetching',
    progress: 0,
    message: 'Fetching media files...',
  });

  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i];
    const ext = url.split('.').pop() || 'mp4';
    const filename = `input_${i}.${ext}`;

    try {
      const fileData = await fetchFile(url);
      await ffmpeg.writeFile(filename, fileData);
      fileMap.set(url, filename);

      onProgress?.({
        phase: 'fetching',
        progress: Math.round(((i + 1) / allUrls.length) * 100),
        message: `Fetching media files... ${i + 1}/${allUrls.length}`,
      });
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw new Error(`Failed to fetch media file: ${url}`);
    }
  }

  return fileMap;
}

/**
 * Generate subtitle file in SRT format
 */
function generateSubtitleFile(tracks: SubtitleTrack[]): string {
  let srtContent = '';
  let cueIndex = 1;

  for (const track of tracks) {
    if (!track.visible) continue;

    for (const cue of track.cues) {
      const startTime = formatSRTTime(cue.startTime);
      const endTime = formatSRTTime(cue.endTime);

      srtContent += `${cueIndex}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${cue.text}\n\n`;
      cueIndex++;
    }
  }

  return srtContent;
}

/**
 * Format time in seconds to SRT format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Build FFmpeg filter complex string for video effects
 */
function buildFilterComplex(
  clips: VideoClip[],
  audioTracks: AudioTrack[],
  fileMap: Map<string, string>,
  _settings: ExportSettings
): string {
  const filters: string[] = [];
  let videoInputs = '';
  let audioInputs = '';

  // Process video clips
  clips.forEach((clip, index) => {
    const inputFile = fileMap.get(clip.url);
    if (!inputFile) return;

    // Apply clip effects (opacity, scale, rotation)
    let videoFilter = `[${index}:v]`;

    // Apply opacity
    if (clip.properties.opacity < 1) {
      videoFilter += `format=rgba,colorchannelmixer=aa=${clip.properties.opacity}`;
    }

    // Apply scale
    if (clip.properties.scale !== 1) {
      videoFilter += `,scale=iw*${clip.properties.scale}:ih*${clip.properties.scale}`;
    }

    // Apply rotation
    if (clip.properties.rotation !== 0) {
      videoFilter += `,rotate=${clip.properties.rotation}*PI/180`;
    }

    // Apply visual effects
    if (clip.effects) {
      for (const effect of clip.effects) {
        switch (effect.type) {
          case 'brightness':
            videoFilter += `,eq=brightness=${effect.intensity}`;
            break;
          case 'contrast':
            videoFilter += `,eq=contrast=${effect.intensity}`;
            break;
          case 'saturation':
            videoFilter += `,eq=saturation=${effect.intensity}`;
            break;
          case 'blur':
            videoFilter += `,boxblur=${effect.intensity}`;
            break;
        }
      }
    }

    videoFilter += `[v${index}]`;
    filters.push(videoFilter);
    videoInputs += `[v${index}]`;
  });

  // Concatenate video clips
  if (clips.length > 0) {
    filters.push(`${videoInputs}concat=n=${clips.length}:v=1:a=0[outv]`);
  }

  // Process audio tracks with volume, fade in/out
  audioTracks.forEach((track, index) => {
    const inputFile = fileMap.get(track.url);
    if (!inputFile || track.muted) return;

    let audioFilter = `[${clips.length + index}:a]`;

    // Apply volume
    if (track.volume !== 100) {
      audioFilter += `volume=${track.volume / 100}`;
    }

    // Apply fade in
    if (track.fadeIn && track.fadeIn > 0) {
      audioFilter += `,afade=t=in:st=0:d=${track.fadeIn}`;
    }

    // Apply fade out
    if (track.fadeOut && track.fadeOut > 0) {
      const fadeOutStart = track.duration - track.fadeOut;
      audioFilter += `,afade=t=out:st=${fadeOutStart}:d=${track.fadeOut}`;
    }

    audioFilter += `[a${index}]`;
    filters.push(audioFilter);
    audioInputs += `[a${index}]`;
  });

  // Mix audio tracks
  if (audioTracks.filter(t => !t.muted).length > 0) {
    filters.push(`${audioInputs}amix=inputs=${audioTracks.filter(t => !t.muted).length}[outa]`);
  }

  return filters.join(';');
}

/**
 * Get FFmpeg codec and preset based on export settings
 */
function getEncodingSettings(settings: ExportSettings): {
  videoCodec: string;
  audioCodec: string;
  preset: string;
  crf: number;
} {
  const qualityMap = {
    low: 28,
    medium: 23,
    high: 18,
    ultra: 15,
  };

  let videoCodec = 'libx264';
  let audioCodec = 'aac';

  if (settings.format === 'webm') {
    videoCodec = 'libvpx-vp9';
    audioCodec = 'libopus';
  }

  return {
    videoCodec,
    audioCodec,
    preset: 'medium',
    crf: qualityMap[settings.quality],
  };
}

/**
 * Get resolution dimensions from export settings
 */
function getResolution(resolution: '720p' | '1080p' | '4k'): { width: number; height: number } {
  const resolutions = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
  };

  return resolutions[resolution];
}

/**
 * Render timeline to video file
 */
export async function renderTimeline(timeline: Timeline, options: RenderOptions): Promise<Blob> {
  const { exportSettings, onProgress } = options;

  try {
    // Initialize FFmpeg
    const ffmpeg = await initFFmpeg(onProgress);

    // Fetch media files
    const fileMap = await fetchMediaFiles(ffmpeg, timeline.clips, timeline.audioTracks, onProgress);

    onProgress?.({
      phase: 'processing',
      progress: 0,
      message: 'Processing video...',
    });

    // Generate subtitle file if subtitles exist
    if (timeline.subtitleTracks.length > 0) {
      const srtContent = generateSubtitleFile(timeline.subtitleTracks);
      await ffmpeg.writeFile('subtitles.srt', new TextEncoder().encode(srtContent));
    }

    // Build FFmpeg command
    const resolution = getResolution(exportSettings.resolution);
    const encodingSettings = getEncodingSettings(exportSettings);
    const filterComplex = buildFilterComplex(
      timeline.clips,
      timeline.audioTracks,
      fileMap,
      exportSettings
    );

    const inputs: string[] = [];

    // Add video clip inputs
    timeline.clips.forEach(clip => {
      const inputFile = fileMap.get(clip.url);
      if (inputFile) {
        inputs.push('-i', inputFile);
      }
    });

    // Add audio track inputs
    timeline.audioTracks.forEach(track => {
      const inputFile = fileMap.get(track.url);
      if (inputFile) {
        inputs.push('-i', inputFile);
      }
    });

    const outputFilename = `output.${exportSettings.format}`;

    // Execute FFmpeg command
    const ffmpegArgs = [
      ...inputs,
      '-filter_complex',
      filterComplex,
      '-map',
      '[outv]',
      '-map',
      '[outa]',
      '-c:v',
      encodingSettings.videoCodec,
      '-c:a',
      encodingSettings.audioCodec,
      '-preset',
      encodingSettings.preset,
      '-crf',
      encodingSettings.crf.toString(),
      '-s',
      `${resolution.width}x${resolution.height}`,
      '-r',
      exportSettings.frameRate.toString(),
    ];

    // Add subtitle if exists
    if (timeline.subtitleTracks.length > 0) {
      ffmpegArgs.push('-vf', "subtitles=subtitles.srt:force_style='FontSize=24'");
    }

    ffmpegArgs.push(outputFilename);

    await ffmpeg.exec(ffmpegArgs);

    onProgress?.({
      phase: 'finalizing',
      progress: 90,
      message: 'Finalizing video...',
    });

    // Read the output file
    const data = await ffmpeg.readFile(outputFilename);
    // FileData from FFmpeg is a Uint8Array, need to convert to standard Uint8Array for Blob
    const uint8Array =
      data instanceof Uint8Array
        ? new Uint8Array(data.buffer.slice(0))
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new Uint8Array(data as any);
    const blob = new Blob([uint8Array], { type: `video/${exportSettings.format}` });

    onProgress?.({
      phase: 'complete',
      progress: 100,
      message: 'Video rendered successfully!',
    });

    return blob;
  } catch (error) {
    console.error('Video rendering error:', error);
    throw error;
  }
}

/**
 * Cleanup FFmpeg instance and free resources
 */
export function cleanupFFmpeg(): void {
  ffmpegInstance = null;
}

/**
 * Check if FFmpeg is supported in the current browser
 */
export function isFFmpegSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}
