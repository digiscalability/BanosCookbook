/**
 * Timeline Ruler Component
 * Time markers and grid
 */

'use client';

interface TimelineRulerProps {
  duration: number;
  zoom: number;
  fps: number;
}

export function TimelineRuler({ duration, zoom, fps: _fps }: TimelineRulerProps) {
  const markers: Array<{ time: number; label: string; isMajor: boolean }> = [];

  // Determine marker interval based on zoom level
  let interval = 1; // Default 1 second
  if (zoom < 20) {
    interval = 5; // 5 seconds for zoomed out
  } else if (zoom > 100) {
    interval = 0.5; // 500ms for zoomed in
  }

  // Generate markers
  for (let time = 0; time <= duration; time += interval) {
    const isMajor = time % (interval * 5) === 0;
    markers.push({
      time,
      label: formatTime(time),
      isMajor,
    });
  }

  return (
    <div className="relative h-12 border-b border-gray-700 bg-gray-800">
      {markers.map((marker, idx) => {
        const left = marker.time * zoom;

        return (
          <div
            key={idx}
            className="absolute bottom-0 top-0"
            // eslint-disable-next-line react/forbid-dom-props
            style={{ left: `${left}px` }}
          >
            {/* Tick Mark */}
            <div className={`absolute top-0 w-px bg-gray-600 ${marker.isMajor ? 'h-6' : 'h-3'} `} />

            {/* Time Label */}
            {marker.isMajor && (
              <div className="absolute top-7 -translate-x-1/2 text-xs text-gray-400">
                {marker.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);

  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}.${ms}s`;
}
