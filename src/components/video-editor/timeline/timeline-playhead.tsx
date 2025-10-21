/**
 * Timeline Playhead Component
 * Current time indicator
 */

'use client';

interface TimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoom: number;
}

export function TimelinePlayhead({
  currentTime,
  duration: _duration,
  zoom,
}: TimelinePlayheadProps) {
  const left = currentTime * zoom;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-50"
      // eslint-disable-next-line react/forbid-dom-props
      style={{ left: `${left}px` }}
    >
      {/* Playhead Handle */}
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />

      {/* Vertical Line */}
      <div className="absolute top-0 left-0 w-0.5 h-full bg-red-500" />
    </div>
  );
}
