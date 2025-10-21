/**
 * Timeline Track Component
 * Individual track row displaying clips
 */

'use client';

import type { Clip, Track } from '../types';
import { TimelineClip } from './timeline-clip';

interface TimelineTrackProps {
  track: Track;
  zoom: number;
  selectedClipIds: string[];
  onClipSelect: (clipId: string, multiSelect?: boolean) => void;
  onClipDragStart: (clipId: string, trackId: string) => void;
  onClipDrag: (deltaX: number) => void;
  onClipDragEnd: () => void;
  onClipUpdate: (clipId: string, updates: Partial<Clip>) => void;
}

export function TimelineTrack({
  track,
  zoom,
  selectedClipIds,
  onClipSelect,
  onClipDragStart,
  onClipDrag,
  onClipDragEnd,
  onClipUpdate,
}: TimelineTrackProps) {
  return (
    <div className="h-16 border-b border-gray-700 relative bg-gray-850">
      {/* Track Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {!track.visible && (
          <div className="absolute inset-0 bg-gray-900 opacity-50" />
        )}
      </div>

      {/* Clips */}
      {track.clips.map(clip => (
        <TimelineClip
          key={clip.id}
          clip={clip}
          trackId={track.id}
          zoom={zoom}
          isSelected={selectedClipIds.includes(clip.id)}
          isLocked={track.locked}
          onSelect={(multiSelect) => onClipSelect(clip.id, multiSelect)}
          onDragStart={() => onClipDragStart(clip.id, track.id)}
          onDrag={onClipDrag}
          onDragEnd={onClipDragEnd}
          onUpdate={(updates) => onClipUpdate(clip.id, updates)}
        />
      ))}
    </div>
  );
}
