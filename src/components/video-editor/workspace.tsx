/**
 * Video Editor Workspace Component
 * Full-screen editor layout combining all components
 */

'use client';

import { ArrowLeft, Download, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ExportSettings, VideoClip as VideoEditorClip } from '@/lib/types/video-editor';
import { isFFmpegSupported, renderTimeline, type RenderProgress } from '@/lib/video-renderer';

import { ExportModal } from './export-modal';
import { AssetPanel } from './panels/asset-panel';
import AudioPanel from './panels/audio-panel';
import { EffectsPanel } from './panels/effects-panel';
import { PropertiesPanel } from './panels/properties-panel';
import SubtitleEditor from './panels/subtitle-editor';
import { TextPanel } from './panels/text-panel';
import { CanvasOverlay } from './preview/canvas-overlay';
import { VideoPreview } from './preview/video-preview';
import { TimelineEditor } from './timeline/timeline';
import type {
    Clip,
    ClipProperties,
    EditorAsset,
    Effect,
    Timeline,
    Track,
    TrackType,
} from './types';
import { DEFAULT_TIMELINE_CONFIG } from './types';
import { UploadManager } from './upload/upload-manager';

interface VideoEditorWorkspaceProps {
  recipeId: string;
  recipeTitle: string;
  initialTimeline?: Timeline;
  initialAssets?: EditorAsset[];
  onSave?: (timeline: Timeline) => void;
  onExport?: (videoUrl: string) => void;
}

export function VideoEditorWorkspace({
  recipeId,
  recipeTitle,
  initialTimeline,
  initialAssets = [],
  onSave,
  onExport,
}: VideoEditorWorkspaceProps) {
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [timeline, setTimeline] = useState<Timeline>(
    initialTimeline || createEmptyTimeline(recipeId, recipeTitle)
  );
  const [assets, setAssets] = useState<EditorAsset[]>(initialAssets);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(50);
  const [showUploadManager, setShowUploadManager] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<
    'assets' | 'effects' | 'text' | 'properties' | 'audio' | 'subtitle'
  >('assets');

  // Audio & Subtitle state (using video-editor types)
  const [audioTracks, setAudioTracks] = useState<import('@/lib/types/video-editor').AudioTrack[]>(
    []
  );
  const [subtitleTracks, setSubtitleTracks] = useState<
    import('@/lib/types/video-editor').SubtitleTrack[]
  >([]);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportProgressMessage, setExportProgressMessage] = useState('');

  // Create empty timeline
  function createEmptyTimeline(id: string, name: string): Timeline {
    return {
      id: `timeline-${Date.now()}`,
      recipeId: id,
      name: `${name} Timeline`,
      ...DEFAULT_TIMELINE_CONFIG,
      tracks: [
        {
          id: 'track-video-1',
          type: 'video',
          name: 'Video Track 1',
          clips: [],
          locked: false,
          visible: true,
          order: 0,
        },
        {
          id: 'track-audio-1',
          type: 'audio',
          name: 'Audio Track 1',
          clips: [],
          locked: false,
          visible: true,
          order: 1,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Save timeline to Firestore
  const saveTimeline = useCallback(async () => {
    if (!onSave) return;

    try {
      setIsSaving(true);
      const updatedTimeline = {
        ...timeline,
        updatedAt: new Date(),
      };
      await onSave(updatedTimeline);
      setTimeline(updatedTimeline);
    } catch (error) {
      console.error('🎬 Save timeline error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [timeline, onSave]);

  // Auto-save timeline
  useEffect(() => {
    const timer = setTimeout(() => {
      saveTimeline();
    }, 2000); // Debounce 2 seconds

    return () => clearTimeout(timer);
  }, [timeline, saveTimeline]);

  // Handle asset upload complete
  const handleUploadComplete = useCallback((newAssets: EditorAsset[]) => {
    setAssets(prev => [...newAssets, ...prev]);
  }, []);

  // Handle asset drag start
  const handleAssetDragStart = useCallback((asset: EditorAsset) => {
    console.warn('🎬 Asset drag start:', asset);
  }, []);

  // Handle asset delete
  const handleAssetDelete = useCallback(
    async (assetId: string) => {
      // TODO: Call server action to delete from Firebase Storage
      setAssets(prev => prev.filter(a => a.id !== assetId));
      toast({
        title: 'Asset Deleted',
        description: 'Asset removed successfully',
      });
    },
    [toast]
  );

  // Refresh assets from Firestore
  const handleRefreshAssets = useCallback(async () => {
    // TODO: Call server action to fetch assets
    toast({
      title: 'Assets Refreshed',
      description: 'Asset library updated',
    });
  }, [toast]);

  // Handle clip operations
  const handleClipAdd = useCallback(
    (trackId: string, clipData: Partial<Clip>) => {
      setTimeline(prev => {
        const tracks = prev.tracks.map(track => {
          if (track.id === trackId) {
            const newClip: Clip = {
              id: `clip-${Date.now()}-${Math.random()}`,
              assetId: clipData.assetId || '',
              assetUrl: clipData.assetUrl || '',
              assetType: clipData.assetType || 'video',
              startTime: clipData.startTime || currentTime,
              endTime: clipData.endTime || currentTime + (clipData.duration || 5),
              duration: clipData.duration || 5,
              label: clipData.label,
              ...clipData,
            };
            return {
              ...track,
              clips: [...track.clips, newClip],
            };
          }
          return track;
        });

        // Extend timeline duration if needed
        const maxEndTime = Math.max(...tracks.flatMap(t => t.clips.map(c => c.endTime)));
        const newDuration = Math.max(prev.duration, maxEndTime + 5);

        return {
          ...prev,
          tracks,
          duration: newDuration,
        };
      });
    },
    [currentTime]
  );

  const handleClipUpdate = useCallback((clipId: string, updates: Partial<Clip>) => {
    setTimeline(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => (clip.id === clipId ? { ...clip, ...updates } : clip)),
      })),
    }));
  }, []);

  const handleClipRemove = useCallback((clipId: string) => {
    setTimeline(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => clip.id !== clipId),
      })),
    }));
  }, []);

  const handleClipSelect = useCallback((clipId: string, multiSelect = false) => {
    setSelectedClipIds(prev => {
      if (multiSelect) {
        return prev.includes(clipId) ? prev.filter(id => id !== clipId) : [...prev, clipId];
      }
      return [clipId];
    });
  }, []);

  // Handle track operations
  const handleTrackAdd = useCallback((type: TrackType) => {
    setTimeline(prev => {
      const tracksOfType = prev.tracks.filter(t => t.type === type).length;
      const newTrack: Track = {
        id: `track-${type}-${Date.now()}`,
        type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${tracksOfType + 1}`,
        clips: [],
        locked: false,
        visible: true,
        order: prev.tracks.length,
      };
      return {
        ...prev,
        tracks: [...prev.tracks, newTrack],
      };
    });
  }, []);

  const handleTrackToggleLock = useCallback((trackId: string) => {
    setTimeline(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, locked: !track.locked } : track
      ),
    }));
  }, []);

  const handleTrackToggleVisible = useCallback((trackId: string) => {
    setTimeline(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, visible: !track.visible } : track
      ),
    }));
  }, []);

  // Phase 5: Effects & Properties Handlers
  const selectedClipId = selectedClipIds[0] || null;
  const selectedClip = selectedClipId
    ? timeline.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)
    : null;

  const handleEffectAdd = useCallback(
    (effect: Omit<Effect, 'id'>) => {
      if (!selectedClipId) return;

      const newEffect: Effect = {
        ...effect,
        id: `effect-${Date.now()}-${Math.random()}`,
      };

      setTimeline(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip =>
            clip.id === selectedClipId
              ? { ...clip, effects: [...(clip.effects || []), newEffect] }
              : clip
          ),
        })),
      }));
    },
    [selectedClipId]
  );

  const handleEffectRemove = useCallback(
    (effectId: string) => {
      if (!selectedClipId) return;

      setTimeline(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip =>
            clip.id === selectedClipId
              ? { ...clip, effects: (clip.effects || []).filter(e => e.id !== effectId) }
              : clip
          ),
        })),
      }));
    },
    [selectedClipId]
  );

  const handlePropertyUpdate = useCallback(
    (properties: Partial<ClipProperties>) => {
      if (!selectedClipId) return;

      setTimeline(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          clips: track.clips.map(clip =>
            clip.id === selectedClipId
              ? { ...clip, properties: { ...clip.properties, ...properties } }
              : clip
          ),
        })),
      }));
    },
    [selectedClipId]
  );

  // Audio handlers
  const handleAudioUpload = useCallback(
    (file: File) => {
      // Create a temporary URL for the audio file
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);

      audio.addEventListener('loadedmetadata', () => {
        const newTrack: import('@/lib/types/video-editor').AudioTrack = {
          id: `audio-${Date.now()}`,
          name: file.name,
          url,
          duration: audio.duration,
          startTime: currentTime,
          volume: 100,
          muted: false,
          solo: false,
          fadeIn: 0,
          fadeOut: 0,
        };

        setAudioTracks(prev => [...prev, newTrack]);

        toast({
          title: 'Audio Added',
          description: `${file.name} added to timeline`,
        });
      });
    },
    [currentTime, toast]
  );

  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    setAudioTracks(prev =>
      prev.map(track => (track.id === trackId ? { ...track, volume } : track))
    );
  }, []);

  const handleMuteToggle = useCallback((trackId: string) => {
    setAudioTracks(prev =>
      prev.map(track => (track.id === trackId ? { ...track, muted: !track.muted } : track))
    );
  }, []);

  const handleSoloToggle = useCallback((trackId: string) => {
    setAudioTracks(prev =>
      prev.map(track => (track.id === trackId ? { ...track, solo: !track.solo } : track))
    );
  }, []);

  const handleFadeInChange = useCallback((trackId: string, duration: number) => {
    setAudioTracks(prev =>
      prev.map(track => (track.id === trackId ? { ...track, fadeIn: duration } : track))
    );
  }, []);

  const handleFadeOutChange = useCallback((trackId: string, duration: number) => {
    setAudioTracks(prev =>
      prev.map(track => (track.id === trackId ? { ...track, fadeOut: duration } : track))
    );
  }, []);

  const handleAudioDelete = useCallback(
    (trackId: string) => {
      setAudioTracks(prev => prev.filter(track => track.id !== trackId));
      toast({
        title: 'Audio Removed',
        description: 'Audio track deleted from timeline',
      });
    },
    [toast]
  );

  // Subtitle handlers
  const handleSubtitleUpload = useCallback(
    async (file: File) => {
      try {
        const _text = await file.text();
        // The SubtitleEditor component will parse the SRT file
        toast({
          title: 'Subtitle File Loaded',
          description: `${file.name} ready for import`,
        });
      } catch (error) {
        console.error('Subtitle upload error:', error);
        toast({
          title: 'Upload Failed',
          description: 'Could not read subtitle file',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleSubtitleTrackAdd = useCallback(
    (track: import('@/lib/types/video-editor').SubtitleTrack) => {
      setSubtitleTracks(prev => [...prev, track]);
      toast({
        title: 'Subtitle Track Added',
        description: `Track "${track.name}" added`,
      });
    },
    [toast]
  );

  const handleSubtitleTrackUpdate = useCallback(
    (trackId: string, updates: Partial<import('@/lib/types/video-editor').SubtitleTrack>) => {
      setSubtitleTracks(prev =>
        prev.map(track => (track.id === trackId ? { ...track, ...updates } : track))
      );
    },
    []
  );

  const handleSubtitleTrackDelete = useCallback(
    (trackId: string) => {
      setSubtitleTracks(prev => prev.filter(track => track.id !== trackId));
      toast({
        title: 'Subtitle Track Removed',
        description: 'Subtitle track deleted',
      });
    },
    [toast]
  );

  const handleSubtitleCueAdd = useCallback(
    (trackId: string, cue: import('@/lib/types/video-editor').SubtitleCue) => {
      setSubtitleTracks(prev =>
        prev.map(track => (track.id === trackId ? { ...track, cues: [...track.cues, cue] } : track))
      );
    },
    []
  );

  const handleSubtitleCueUpdate = useCallback(
    (
      trackId: string,
      cueId: string,
      updates: Partial<import('@/lib/types/video-editor').SubtitleCue>
    ) => {
      setSubtitleTracks(prev =>
        prev.map(track =>
          track.id === trackId
            ? {
                ...track,
                cues: track.cues.map(cue => (cue.id === cueId ? { ...cue, ...updates } : cue)),
              }
            : track
        )
      );
    },
    []
  );

  const handleSubtitleCueDelete = useCallback((trackId: string, cueId: string) => {
    setSubtitleTracks(prev =>
      prev.map(track =>
        track.id === trackId
          ? { ...track, cues: track.cues.filter(cue => cue.id !== cueId) }
          : track
      )
    );
  }, []);

  const handleSeekTo = useCallback((time: number) => {
    setCurrentTime(time);
    setIsPlaying(false);
  }, []);

  // Handle export modal open
  const handleExportClick = () => {
    // Check FFmpeg support
    if (!isFFmpegSupported()) {
      toast({
        title: 'Browser Not Supported',
        description:
          'Your browser does not support video rendering. Please use Chrome, Edge, or Firefox.',
        variant: 'destructive',
      });
      return;
    }

    setShowExportModal(true);
  };

  // Handle export with settings
  const handleExport = async (exportSettings: ExportSettings) => {
    setIsExporting(true);
    setExportProgress(0);
    setExportProgressMessage('Preparing...');

    try {
      // Convert workspace timeline to video-editor Timeline format
      const videoClips: import('@/lib/types/video-editor').VideoClip[] = [];

      // Extract all video clips from tracks
      for (const track of timeline.tracks) {
        if (track.type === 'video' || track.type === 'image') {
          for (const clip of track.clips) {
            videoClips.push({
              id: clip.id,
              name: clip.id, // Use ID as name if name doesn't exist
              url: clip.assetUrl || '',
              duration: clip.duration,
              startTime: clip.startTime,
              endTime: clip.endTime,
              type: track.type === 'video' ? 'video' : 'image',
              volume: 100,
              muted: false,
              effects: [], // Convert effects separately if needed
              textLayers: [], // Convert text overlays separately if needed
              properties: {
                position: {
                  x: clip.properties?.position?.x || 0,
                  y: clip.properties?.position?.y || 0,
                },
                scale:
                  (typeof clip.properties?.scale === 'object'
                    ? clip.properties.scale.x
                    : clip.properties?.scale) || 1,
                rotation: clip.properties?.rotation || 0,
                opacity: clip.properties?.opacity ?? 1,
              },
            });
          }
        }
      }

      const rendererTimeline: import('@/lib/types/video-editor').Timeline = {
        clips: videoClips,
        audioTracks,
        subtitleTracks,
        duration: timeline.duration,
        currentTime,
        isPlaying,
        zoom,
      };

      // Render the video
      const blob = await renderTimeline(rendererTimeline, {
        exportSettings,
        onProgress: (progress: RenderProgress) => {
          setExportProgress(progress.progress);
          setExportProgressMessage(progress.message);
        },
      });

      // Download the video
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${timeline.name.replace(/[^a-z0-9]/gi, '_')}.${exportSettings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Call onExport callback with the video URL if provided
      if (onExport) {
        await onExport(url);
      }

      toast({
        title: 'Export Complete',
        description: 'Video downloaded successfully!',
      });

      setShowExportModal(false);
    } catch (error) {
      console.error('🎬 Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportProgressMessage('');
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      {/* Export Modal */}
      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        onExport={handleExport}
        isExporting={isExporting}
        progress={exportProgress}
        progressMessage={exportProgressMessage}
      />

      {/* Top Bar */}
      <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-700" />
          <h1 className="text-sm font-medium">{timeline.name}</h1>
          {isSaving && <span className="text-xs text-gray-400">Saving...</span>}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveTimeline}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="default" size="sm" onClick={handleExportClick}>
            <Download className="mr-2 h-4 w-4" />
            Export Video
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Panel Switcher + Panels */}
        <div className="flex w-64 flex-col border-r border-gray-800">
          {!showUploadManager && (
            <div className="border-b border-gray-800 p-2">
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant={activePanel === 'assets' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('assets')}
                  className="text-xs"
                >
                  Assets
                </Button>
                <Button
                  variant={activePanel === 'effects' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('effects')}
                  className="text-xs"
                >
                  Effects
                </Button>
                <Button
                  variant={activePanel === 'text' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('text')}
                  className="text-xs"
                >
                  Text
                </Button>
                <Button
                  variant={activePanel === 'properties' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('properties')}
                  className="text-xs"
                >
                  Properties
                </Button>
                <Button
                  variant={activePanel === 'audio' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('audio')}
                  className="text-xs"
                >
                  Audio
                </Button>
                <Button
                  variant={activePanel === 'subtitle' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('subtitle')}
                  className="text-xs"
                >
                  Subtitles
                </Button>
              </div>
            </div>
          )}

          {showUploadManager ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <Button variant="ghost" size="sm" onClick={() => setShowUploadManager(false)}>
                  ← Back to Assets
                </Button>
              </div>
              <UploadManager recipeId={recipeId} onUploadComplete={handleUploadComplete} />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              {activePanel === 'assets' && (
                <AssetPanel
                  recipeId={recipeId}
                  assets={assets}
                  onDragStart={handleAssetDragStart}
                  onAssetDelete={handleAssetDelete}
                  onRefresh={handleRefreshAssets}
                  onUploadClick={() => setShowUploadManager(true)}
                />
              )}
              {activePanel === 'effects' && (
                <EffectsPanel
                  selectedClipId={selectedClipId}
                  clipProperties={selectedClip?.properties}
                  clipEffects={selectedClip?.effects || []}
                  onEffectAdd={handleEffectAdd}
                  onEffectRemove={handleEffectRemove}
                  onPropertyUpdate={handlePropertyUpdate}
                />
              )}
              {activePanel === 'text' && (
                <TextPanel
                  selectedClipId={selectedClipId}
                  clipProperties={selectedClip?.properties}
                  onPropertyUpdate={handlePropertyUpdate}
                />
              )}
              {activePanel === 'properties' && (
                <PropertiesPanel
                  selectedClipId={selectedClipId}
                  clipProperties={selectedClip?.properties}
                  onPropertyUpdate={handlePropertyUpdate}
                />
              )}
              {activePanel === 'audio' && (
                <AudioPanel
                  activeClip={(selectedClip as unknown as VideoEditorClip) || null}
                  audioTracks={audioTracks}
                  onAudioUpload={handleAudioUpload}
                  onVolumeChange={handleVolumeChange}
                  onMuteToggle={handleMuteToggle}
                  onSoloToggle={handleSoloToggle}
                  onFadeInChange={handleFadeInChange}
                  onFadeOutChange={handleFadeOutChange}
                  onAudioDelete={handleAudioDelete}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                />
              )}
              {activePanel === 'subtitle' && (
                <SubtitleEditor
                  activeClip={(selectedClip as unknown as VideoEditorClip) || null}
                  subtitleTracks={subtitleTracks}
                  onSubtitleUpload={handleSubtitleUpload}
                  onSubtitleTrackAdd={handleSubtitleTrackAdd}
                  onSubtitleTrackUpdate={handleSubtitleTrackUpdate}
                  onSubtitleTrackDelete={handleSubtitleTrackDelete}
                  onSubtitleCueAdd={handleSubtitleCueAdd}
                  onSubtitleCueUpdate={handleSubtitleCueUpdate}
                  onSubtitleCueDelete={handleSubtitleCueDelete}
                  currentTime={currentTime}
                  onSeekTo={handleSeekTo}
                />
              )}
            </div>
          )}
        </div>

        {/* Center: Preview + Timeline */}
        <div className="flex flex-1 flex-col">
          {/* Video Preview */}
          <div className="relative min-h-0 flex-1">
            <VideoPreview
              timeline={timeline}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeUpdate={setCurrentTime}
              onPlayPause={() => setIsPlaying(!isPlaying)}
            />
            {selectedClip && (
              <CanvasOverlay
                width={1920}
                height={1080}
                currentTime={currentTime}
                activeClip={selectedClip}
                isPlaying={isPlaying}
              />
            )}
          </div>

          {/* Timeline */}
          <div className="h-64 border-t border-gray-800">
            <TimelineEditor
              timeline={timeline}
              currentTime={currentTime}
              selectedClipIds={selectedClipIds}
              zoom={zoom}
              onTimeChange={setCurrentTime}
              onClipAdd={handleClipAdd}
              onClipUpdate={handleClipUpdate}
              onClipRemove={handleClipRemove}
              onClipSelect={handleClipSelect}
              onZoomChange={setZoom}
              onTrackAdd={handleTrackAdd}
              onTrackToggleLock={handleTrackToggleLock}
              onTrackToggleVisible={handleTrackToggleVisible}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
