/**
 * Video Editor Type Definitions
 * Complete TypeScript interfaces for the professional video editor
 */

// ============================================================================
// Timeline Data Models
// ============================================================================

export interface Timeline {
  id: string;
  recipeId: string;
  name: string;
  duration: number; // Total timeline duration in seconds
  fps: number; // Frames per second (default: 30)
  resolution: Resolution;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
  exportedVideoUrl?: string;
}

export interface Resolution {
  width: number;
  height: number;
}

export const STANDARD_RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  'tiktok': { width: 1080, height: 1920 }, // Vertical 9:16
  'instagram-story': { width: 1080, height: 1920 },
  'instagram-reel': { width: 1080, height: 1920 },
  'youtube': { width: 1920, height: 1080 },
} as const;

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
  locked: boolean;
  visible: boolean;
  volume?: number; // For audio tracks (0-100)
  order: number; // Track stacking order (lower = bottom layer)
}

export type TrackType = 'video' | 'audio' | 'image' | 'text' | 'subtitle';

export interface Clip {
  id: string;
  assetId: string; // Reference to EditorAsset
  assetUrl: string; // Direct URL for playback
  assetType: 'video' | 'audio' | 'image' | 'subtitle';
  startTime: number; // Position on timeline (seconds)
  endTime: number; // End position on timeline (seconds)
  duration: number; // Clip length (seconds)
  trimStart?: number; // Trim from asset start (seconds)
  trimEnd?: number; // Trim from asset end (seconds)
  volume?: number; // Clip-specific volume (0-100)
  effects?: Effect[];
  transitions?: Transition[];
  properties?: ClipProperties;
  label?: string; // User-defined label for clip
}

export interface ClipProperties {
  // Position & Transform
  position?: { x: number; y: number }; // Canvas position (for images/text)
  scale?: { x: number; y: number }; // Zoom level
  rotation?: number; // Degrees
  opacity?: number; // 0-100

  // Cropping
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number
  };

  // Filters
  filters?: {
    brightness?: number; // 0-200 (100 = normal)
    contrast?: number; // 0-200 (100 = normal)
    saturation?: number; // 0-200 (100 = normal)
    blur?: number; // 0-10 pixels
    sepia?: number; // 0-100
    grayscale?: number; // 0-100
  };

  // Text Overlays (multiple text layers)
  text?: Array<{
    content: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    alignment?: 'left' | 'center' | 'right';
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    x?: number; // Position X (0-100%)
    y?: number; // Position Y (0-100%)
    shadow?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
  }>;
}

// ============================================================================
// Effects & Transitions
// ============================================================================

export interface Effect {
  id: string;
  type: EffectType;
  startTime: number; // Relative to clip start
  duration: number;
  parameters: Record<string, unknown>;
}

export type EffectType =
  | 'fade-in'
  | 'fade-out'
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'blur'
  | 'color-grade'
  | 'slow-motion'
  | 'speed-up';

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number; // Transition length (seconds)
  position: 'start' | 'end';
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export type TransitionType =
  | 'fade'
  | 'dissolve'
  | 'wipe-left'
  | 'wipe-right'
  | 'slide-left'
  | 'slide-right'
  | 'zoom';

// ============================================================================
// Asset Library
// ============================================================================

export interface EditorAsset {
  id: string;
  recipeId: string;
  type: AssetType;
  url: string;
  storagePath: string;
  filename: string;
  fileSize: number; // Bytes
  duration?: number; // For video/audio (seconds)
  dimensions?: Resolution; // For video/image
  metadata: AssetMetadata;
  usedInTimelines?: string[]; // Timeline IDs using this asset
  createdAt: Date;
  updatedAt?: Date;
}

export type AssetType = 'video' | 'audio' | 'image' | 'subtitle';

export interface AssetMetadata {
  format?: string; // mp4, jpg, mp3, srt
  codec?: string; // h264, aac, etc.
  fps?: number;
  bitrate?: number; // kbps
  waveform?: string; // Data URI for audio waveform
  thumbnail?: string; // Data URI or URL for video thumbnail
  thumbnails?: string[]; // Multiple thumbnails for scrubbing
}

// ============================================================================
// Export Configuration
// ============================================================================

export interface ExportConfig {
  format: ExportFormat;
  resolution: Resolution;
  quality: ExportQuality;
  fps: 24 | 30 | 60;
  codec: VideoCodec;
  audioCodec: AudioCodec;
  bitrate?: number; // kbps (optional override)
  preset?: ExportPreset;
}

export type ExportFormat = 'mp4' | 'webm' | 'mov';
export type VideoCodec = 'h264' | 'h265' | 'vp9';
export type AudioCodec = 'aac' | 'opus' | 'mp3';
export type ExportQuality = 'low' | 'medium' | 'high' | 'ultra';

export type ExportPreset =
  | 'instagram-reel'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'twitter'
  | 'custom';

export const EXPORT_PRESETS: Record<ExportPreset, Partial<ExportConfig>> = {
  'instagram-reel': {
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    quality: 'high',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
  },
  'tiktok': {
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    quality: 'high',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
  },
  'youtube': {
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    quality: 'ultra',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
  },
  'facebook': {
    resolution: { width: 1280, height: 720 },
    fps: 30,
    quality: 'high',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
  },
  'twitter': {
    resolution: { width: 1280, height: 720 },
    fps: 30,
    quality: 'medium',
    format: 'mp4',
    codec: 'h264',
    audioCodec: 'aac',
  },
  'custom': {},
};

// ============================================================================
// Timeline State Management
// ============================================================================

export interface TimelineState {
  timeline: Timeline;
  currentTime: number; // Playhead position (seconds)
  selectedClipIds: string[];
  selectedTrackId?: string;
  zoom: number; // Pixels per second (default: 50)
  isPlaying: boolean;
  isDragging: boolean;
  draggedClipId?: string;
  clipboard?: Clip[]; // For copy/paste
}

export interface TimelineAction {
  type: TimelineActionType;
  payload: unknown;
}

export type TimelineActionType =
  | 'SET_TIMELINE'
  | 'ADD_TRACK'
  | 'REMOVE_TRACK'
  | 'ADD_CLIP'
  | 'REMOVE_CLIP'
  | 'UPDATE_CLIP'
  | 'MOVE_CLIP'
  | 'TRIM_CLIP'
  | 'SPLIT_CLIP'
  | 'SELECT_CLIP'
  | 'DESELECT_ALL'
  | 'SET_CURRENT_TIME'
  | 'SET_PLAYING'
  | 'SET_ZOOM'
  | 'UNDO'
  | 'REDO';

// ============================================================================
// Upload Management
// ============================================================================

export interface UploadTask {
  id: string;
  file: File;
  type: AssetType;
  status: UploadStatus;
  progress: number; // 0-100
  url?: string;
  error?: string;
  assetId?: string; // Created asset ID after upload
}

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

// ============================================================================
// Rendering
// ============================================================================

export interface RenderTask {
  id: string;
  timelineId: string;
  config: ExportConfig;
  status: RenderStatus;
  progress: number; // 0-100
  outputUrl?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export type RenderStatus =
  | 'initializing'
  | 'loading-assets'
  | 'rendering'
  | 'encoding'
  | 'uploading'
  | 'completed'
  | 'error';

// ============================================================================
// UI Component Props
// ============================================================================

export interface TimelineProps {
  timeline: Timeline;
  currentTime: number;
  zoom: number;
  onTimeChange: (time: number) => void;
  onClipAdd: (trackId: string, clip: Clip) => void;
  onClipUpdate: (clipId: string, updates: Partial<Clip>) => void;
  onClipRemove: (clipId: string) => void;
  onClipSelect: (clipId: string) => void;
  onZoomChange: (zoom: number) => void;
}

export interface VideoPreviewProps {
  timeline: Timeline;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
}

export interface AssetPanelProps {
  assets: EditorAsset[];
  selectedAssetIds: string[];
  onAssetSelect: (assetId: string) => void;
  onAssetUpload: (files: File[]) => void;
  onAssetDelete: (assetId: string) => void;
  onDragStart: (asset: EditorAsset) => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface TimeRange {
  start: number;
  end: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

// Track colors for UI
export const TRACK_COLORS: Record<TrackType, string> = {
  video: '#4A90E2',
  audio: '#7ED321',
  image: '#BD10E0',
  text: '#F5A623',
  subtitle: '#9B9B9B',
};

// Snap threshold for timeline (in seconds)
export const SNAP_THRESHOLD = 0.1; // 100ms

// Default timeline settings
export const DEFAULT_TIMELINE_CONFIG = {
  fps: 30,
  resolution: STANDARD_RESOLUTIONS['720p'],
  zoom: 50, // pixels per second
  duration: 60, // 1 minute default
};
