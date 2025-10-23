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
      className="pointer-events-none absolute bottom-0 top-0 z-50 w-0.5 bg-red-500"
      // eslint-disable-next-line react/forbid-dom-props
      style={{ left: `${left}px` }}
    >
      {/* Playhead Handle */}
      <div className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-red-500" />

      {/* Vertical Line */}
      <div className="absolute left-0 top-0 h-full w-0.5 bg-red-500" />
    </div>
  );
}
