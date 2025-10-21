/**
 * Timeline Clip Component
 * Individual clip on a track with drag/resize functionality
 */

'use client';

import { useRef, useState } from 'react';
import type { Clip } from '../types';
import { TRACK_COLORS } from '../types';

interface TimelineClipProps {
  clip: Clip;
  trackId: string;
  zoom: number;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: (multiSelect: boolean) => void;
  onDragStart: () => void;
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
  onUpdate: (updates: Partial<Clip>) => void;
}

export function TimelineClip({
  clip,
  trackId: _trackId,
  zoom,
  isSelected,
  isLocked,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
  onUpdate,
}: TimelineClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [_isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const dragStartX = useRef(0);
  const clipRef = useRef<HTMLDivElement>(null);

  // Calculate clip position and size
  const left = clip.startTime * zoom;
  const width = clip.duration * zoom;

  // Get track color
  const trackColor = TRACK_COLORS[clip.assetType] || TRACK_COLORS.video;

  // Handle clip click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const multiSelect = e.metaKey || e.ctrlKey;
    onSelect(multiSelect);
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;

    e.stopPropagation();
    e.preventDefault();

    dragStartX.current = e.clientX;
    setIsDragging(true);
    onDragStart();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      onDrag(deltaX);
      dragStartX.current = moveEvent.clientX;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Handle trim/resize
  const handleTrimStart = (e: React.MouseEvent, side: 'left' | 'right') => {
    if (isLocked) return;

    e.stopPropagation();
    e.preventDefault();

    dragStartX.current = e.clientX;
    setIsResizing(side);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const deltaTime = deltaX / zoom;

      if (side === 'left') {
        const newStartTime = Math.max(0, clip.startTime + deltaTime);
        const newDuration = clip.endTime - newStartTime;

        if (newDuration > 0.1) { // Min 100ms
          onUpdate({
            startTime: newStartTime,
            duration: newDuration,
            trimStart: (clip.trimStart || 0) + deltaTime,
          });
        }
      } else {
        const newEndTime = Math.max(clip.startTime + 0.1, clip.endTime + deltaTime);
        const newDuration = newEndTime - clip.startTime;

        onUpdate({
          endTime: newEndTime,
          duration: newDuration,
          trimEnd: (clip.trimEnd || 0) - deltaTime,
        });
      }

      dragStartX.current = moveEvent.clientX;
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={clipRef}
      className={`
        absolute top-1 h-14 rounded
        cursor-move transition-colors
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
        ${isDragging ? 'opacity-70' : ''}
        ${isLocked ? 'cursor-not-allowed opacity-50' : ''}
      `}
      // eslint-disable-next-line react/forbid-dom-props
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: trackColor,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Clip Content */}
      <div className="px-2 py-1 h-full flex flex-col justify-between overflow-hidden">
        <div className="text-xs font-medium truncate text-white">
          {clip.label || `${clip.assetType} clip`}
        </div>
        <div className="text-xs opacity-75 text-white">
          {clip.duration.toFixed(1)}s
        </div>
      </div>

      {/* Trim Handles */}
      {!isLocked && (
        <>
          <div
            className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white hover:bg-opacity-30"
            onMouseDown={(e) => handleTrimStart(e, 'left')}
          />
          <div
            className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white hover:bg-opacity-30"
            onMouseDown={(e) => handleTrimStart(e, 'right')}
          />
        </>
      )}

      {/* Transitions */}
      {clip.transitions?.map((transition, idx) => (
        <div
          key={idx}
          className={`
            absolute top-0 h-full w-6
            ${transition.position === 'start' ? 'left-0' : 'right-0'}
            bg-gradient-to-${transition.position === 'start' ? 'r' : 'l'}
            from-black to-transparent opacity-30
          `}
        />
      ))}
    </div>
  );
}
