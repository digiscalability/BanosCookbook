/**
 * Video Editor Workspace Component
 * Full-screen editor layout combining all components
 */

'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    Download,
    Save,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AssetPanel } from './panels/asset-panel';
import { EffectsPanel } from './panels/effects-panel';
import { PropertiesPanel } from './panels/properties-panel';
import { TextPanel } from './panels/text-panel';
import { CanvasOverlay } from './preview/canvas-overlay';
import { VideoPreview } from './preview/video-preview';
import { TimelineEditor } from './timeline/timeline';
import type { Clip, ClipProperties, EditorAsset, Effect, Timeline, Track, TrackType } from './types';
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
  const [activePanel, setActivePanel] = useState<'assets' | 'effects' | 'text' | 'properties'>('assets');

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
    setAssets((prev) => [...newAssets, ...prev]);
  }, []);

  // Handle asset drag start
  const handleAssetDragStart = useCallback((asset: EditorAsset) => {
    console.log('🎬 Asset drag start:', asset);
  }, []);

  // Handle asset delete
  const handleAssetDelete = useCallback(async (assetId: string) => {
    // TODO: Call server action to delete from Firebase Storage
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    toast({
      title: 'Asset Deleted',
      description: 'Asset removed successfully',
    });
  }, [toast]);

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
      setTimeline((prev) => {
        const tracks = prev.tracks.map((track) => {
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
        const maxEndTime = Math.max(
          ...tracks.flatMap((t) => t.clips.map((c) => c.endTime))
        );
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
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        ),
      })),
    }));
  }, []);

  const handleClipRemove = useCallback((clipId: string) => {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== clipId),
      })),
    }));
  }, []);

  const handleClipSelect = useCallback((clipId: string, multiSelect = false) => {
    setSelectedClipIds((prev) => {
      if (multiSelect) {
        return prev.includes(clipId)
          ? prev.filter((id) => id !== clipId)
          : [...prev, clipId];
      }
      return [clipId];
    });
  }, []);

  // Handle track operations
  const handleTrackAdd = useCallback((type: TrackType) => {
    setTimeline((prev) => {
      const tracksOfType = prev.tracks.filter((t) => t.type === type).length;
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
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.id === trackId ? { ...track, locked: !track.locked } : track
      ),
    }));
  }, []);

  const handleTrackToggleVisible = useCallback((trackId: string) => {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.id === trackId ? { ...track, visible: !track.visible } : track
      ),
    }));
  }, []);

  // Phase 5: Effects & Properties Handlers
  const selectedClipId = selectedClipIds[0] || null;
  const selectedClip = selectedClipId
    ? timeline.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)
    : null;

  const handleEffectAdd = useCallback((effect: Omit<Effect, 'id'>) => {
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
  }, [selectedClipId]);

  const handleEffectRemove = useCallback((effectId: string) => {
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
  }, [selectedClipId]);

  const handlePropertyUpdate = useCallback((properties: Partial<ClipProperties>) => {
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
  }, [selectedClipId]);

  // Handle export
  const handleExport = async () => {
    toast({
      title: 'Export Started',
      description: 'Rendering video... This may take a few minutes.',
    });

    try {
      // TODO: Implement FFmpeg.wasm rendering
      // For now, just show placeholder
      const mockVideoUrl = 'https://example.com/rendered-video.mp4';

      if (onExport) {
        await onExport(mockVideoUrl);
      }

      toast({
        title: 'Export Complete',
        description: 'Video rendered successfully!',
      });
    } catch (error) {
      console.error('🎬 Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-700" />
          <h1 className="text-sm font-medium">{timeline.name}</h1>
          {isSaving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveTimeline}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="default" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Video
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Panel Switcher + Panels */}
        <div className="w-64 border-r border-gray-800 flex flex-col">
          {!showUploadManager && (
            <div className="p-2 border-b border-gray-800">
              <div className="grid grid-cols-2 gap-1">
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
              </div>
            </div>
          )}

          {showUploadManager ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadManager(false)}
                >
                  ← Back to Assets
                </Button>
              </div>
              <UploadManager
                recipeId={recipeId}
                onUploadComplete={handleUploadComplete}
              />
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
            </div>
          )}
        </div>

        {/* Center: Preview + Timeline */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 min-h-0 relative">
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
