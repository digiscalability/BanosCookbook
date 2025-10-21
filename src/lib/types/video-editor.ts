export interface VideoClip {
  id: string;
  name: string;
  url: string;
  duration: number;
  startTime: number;
  endTime: number;
  thumbnailUrl?: string;
  type: 'video' | 'image';
  volume: number;
  muted: boolean;
  effects?: VisualEffect[];
  textLayers?: TextLayer[];
  properties: ClipProperties;
}

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
  startTime: number;
  volume: number;
  muted: boolean;
  solo: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface SubtitleTrack {
  id: string;
  name: string;
  language: string;
  visible: boolean;
  cues: SubtitleCue[];
}

export interface SubtitleCue {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: SubtitleStyle;
}

export interface SubtitleStyle {
  fontSize: string;
  color: string;
  backgroundColor: string;
  fontFamily: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  position?: {
    x: number;
    y: number;
  };
}

export interface VisualEffect {
  id: string;
  type: 'fade' | 'zoom' | 'brightness' | 'contrast' | 'saturation' | 'blur';
  startTime: number;
  endTime: number;
  intensity: number;
  keyframes?: EffectKeyframe[];
}

export interface EffectKeyframe {
  time: number;
  value: number;
}

export interface TextLayer {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: TextStyle;
  position: Position;
  animation?: TextAnimation;
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface TextAnimation {
  type: 'fadeIn' | 'fadeOut' | 'slideIn' | 'slideOut' | 'typewriter';
  duration: number;
  direction?: 'left' | 'right' | 'top' | 'bottom';
}

export interface ClipProperties {
  position: Position;
  scale: number;
  rotation: number;
  opacity: number;
  cropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Timeline {
  clips: VideoClip[];
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
}

export interface Project {
  id: string;
  name: string;
  timeline: Timeline;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  width: number;
  height: number;
  frameRate: number;
  aspectRatio: string;
  backgroundColor: string;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: '720p' | '1080p' | '4k';
  frameRate: 24 | 30 | 60;
  bitrate?: number;
}