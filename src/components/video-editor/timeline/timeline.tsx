/**
 * Timeline Component
 * Professional multi-track timeline editor inspired by Final Cut / Veed.io
 */

'use client';

import { Eye, EyeOff, Lock, Unlock, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

import type { Clip, Timeline, TrackType } from '../types';
import { SNAP_THRESHOLD, TRACK_COLORS } from '../types';

import { TimelinePlayhead } from './timeline-playhead';
import { TimelineRuler } from './timeline-ruler';
import { TimelineTrack } from './timeline-track';

interface TimelineEditorProps {
  timeline: Timeline;
  currentTime: number;
  selectedClipIds: string[];
  zoom: number;
  onTimeChange: (time: number) => void;
  onClipAdd: (trackId: string, clip: Partial<Clip>) => void;
  onClipUpdate: (clipId: string, updates: Partial<Clip>) => void;
  onClipRemove: (clipId: string) => void;
  onClipSelect: (clipId: string, multiSelect?: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onTrackAdd: (type: TrackType) => void;
  onTrackToggleLock: (trackId: string) => void;
  onTrackToggleVisible: (trackId: string) => void;
}

export function TimelineEditor({
  timeline,
  currentTime,
  selectedClipIds,
  zoom,
  onTimeChange,
  onClipAdd: _onClipAdd,
  onClipUpdate,
  onClipRemove,
  onClipSelect,
  onZoomChange,
  onTrackAdd,
  onTrackToggleLock,
  onTrackToggleVisible,
}: TimelineEditorProps) {
  const [_isDragging, setIsDragging] = useState(false);
  const [draggedClip, setDraggedClip] = useState<{ clipId: string; trackId: string } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate timeline width based on duration and zoom
  const timelineWidth = timeline.duration * zoom;

  // Handle playhead click/drag
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = clickX / zoom;

      // Clamp to timeline duration
      const clampedTime = Math.max(0, Math.min(timeline.duration, newTime));
      onTimeChange(clampedTime);
    },
    [zoom, timeline.duration, onTimeChange]
  );

  // Handle clip drag start
  const handleClipDragStart = useCallback((clipId: string, trackId: string) => {
    setIsDragging(true);
    setDraggedClip({ clipId, trackId });
  }, []);

  // Handle clip drag
  const handleClipDrag = useCallback(
    (deltaX: number) => {
      if (!draggedClip) return;

      const deltaTime = deltaX / zoom;
      const track = timeline.tracks.find(t => t.id === draggedClip.trackId);
      const clip = track?.clips.find(c => c.id === draggedClip.clipId);

      if (!clip) return;

      const newStartTime = Math.max(0, clip.startTime + deltaTime);
      const newEndTime = newStartTime + clip.duration;

      // Check for snap points (other clips, playhead)
      let snappedStartTime = newStartTime;

      // Snap to other clips
      track?.clips.forEach(otherClip => {
        if (otherClip.id === clip.id) return;

        const distToStart = Math.abs(newStartTime - otherClip.startTime);
        const distToEnd = Math.abs(newStartTime - otherClip.endTime);
        const distEndToStart = Math.abs(newEndTime - otherClip.startTime);

        if (distToStart < SNAP_THRESHOLD) {
          snappedStartTime = otherClip.startTime;
        } else if (distToEnd < SNAP_THRESHOLD) {
          snappedStartTime = otherClip.endTime;
        } else if (distEndToStart < SNAP_THRESHOLD) {
          snappedStartTime = otherClip.startTime - clip.duration;
        }
      });

      // Snap to playhead
      if (Math.abs(newStartTime - currentTime) < SNAP_THRESHOLD) {
        snappedStartTime = currentTime;
      }

      onClipUpdate(clip.id, {
        startTime: snappedStartTime,
        endTime: snappedStartTime + clip.duration,
      });
    },
    [draggedClip, timeline.tracks, zoom, currentTime, onClipUpdate]
  );

  // Handle clip drag end
  const handleClipDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedClip(null);
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.5, 200); // Max 200px per second
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.5, 10); // Min 10px per second
    onZoomChange(newZoom);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space: Play/Pause (handled by parent)
      // Delete/Backspace: Delete selected clips
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipIds.length > 0) {
        e.preventDefault();
        selectedClipIds.forEach(clipId => onClipRemove(clipId));
      }

      // Cmd/Ctrl + Z: Undo (TODO: implement undo system)
      // Cmd/Ctrl + Shift + Z: Redo (TODO: implement redo system)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, onClipRemove]);

  // Auto-scroll to playhead when playing
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const playheadX = currentTime * zoom;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const scrollLeft = scrollContainerRef.current.scrollLeft;

    // Scroll if playhead is out of view
    if (playheadX < scrollLeft || playheadX > scrollLeft + containerWidth) {
      scrollContainerRef.current.scrollLeft = playheadX - containerWidth / 2;
    }
  }, [currentTime, zoom]);

  return (
    <div className="flex h-full flex-col bg-gray-900 text-white">
      {/* Timeline Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Timeline</span>
          <span className="text-xs text-gray-400">
            {timeline.tracks.length} tracks • {timeline.duration.toFixed(1)}s
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Track Dropdown */}
          <select
            aria-label="Add new track"
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs"
            onChange={e => {
              const type = e.target.value as TrackType;
              if (type) {
                onTrackAdd(type);
                e.target.value = '';
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Add Track
            </option>
            <option value="video">Video Track</option>
            <option value="audio">Audio Track</option>
            <option value="image">Image Track</option>
            <option value="text">Text Track</option>
            <option value="subtitle">Subtitle Track</option>
          </select>

          {/* Zoom Controls */}
          <div className="ml-4 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0">
              <ZoomOut className="h-4 w-4" />
            </Button>

            <Slider
              value={[zoom]}
              onValueChange={([value]) => onZoomChange(value)}
              min={10}
              max={200}
              step={10}
              className="w-24"
            />

            <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0">
              <ZoomIn className="h-4 w-4" />
            </Button>

            <span className="min-w-[60px] text-xs text-gray-400">{zoom.toFixed(0)}px/s</span>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Labels (Left Column) */}
        <div className="w-48 overflow-y-auto border-r border-gray-700 bg-gray-800">
          <div className="h-12 border-b border-gray-700" /> {/* Spacer for ruler */}
          {timeline.tracks.map(track => (
            <div
              key={track.id}
              className="flex h-16 items-center justify-between border-b border-gray-700 px-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* eslint-disable-next-line react/forbid-dom-props */}
                <div
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: TRACK_COLORS[track.type] }}
                />
                <span className="truncate text-sm">{track.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTrackToggleLock(track.id)}
                  className="h-6 w-6 p-0"
                >
                  {track.locked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3 opacity-50" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTrackToggleVisible(track.id)}
                  className="h-6 w-6 p-0"
                >
                  {track.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3 opacity-50" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Tracks (Right Column) */}
        <div ref={scrollContainerRef} className="relative flex-1 overflow-auto">
          <div
            ref={timelineRef}
            className="relative"
            // eslint-disable-next-line react/forbid-dom-props
            style={{ width: `${timelineWidth}px` }}
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <TimelineRuler duration={timeline.duration} zoom={zoom} fps={timeline.fps} />

            {/* Tracks */}
            {timeline.tracks.map(track => (
              <TimelineTrack
                key={track.id}
                track={track}
                zoom={zoom}
                selectedClipIds={selectedClipIds}
                onClipSelect={onClipSelect}
                onClipDragStart={handleClipDragStart}
                onClipDrag={handleClipDrag}
                onClipDragEnd={handleClipDragEnd}
                onClipUpdate={onClipUpdate}
              />
            ))}

            {/* Playhead */}
            <TimelinePlayhead currentTime={currentTime} duration={timeline.duration} zoom={zoom} />
          </div>
        </div>
      </div>
    </div>
  );
}
