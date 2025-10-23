/**
 * Video Preview Component
 * Video player synced with timeline, frame-by-frame navigation
 */

'use client';

import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

import type { Clip, Timeline } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface VideoPreviewProps {
  timeline: Timeline;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
}

export function VideoPreview({
  timeline,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
}: VideoPreviewProps) {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);

  // Find active clip(s) at current time
  const getActiveClips = useCallback(
    (time: number): Clip[] => {
      const activeClips: Clip[] = [];

      for (const track of timeline.tracks) {
        if (!track.visible) continue;

        for (const clip of track.clips) {
          if (time >= clip.startTime && time < clip.endTime) {
            activeClips.push(clip);
          }
        }
      }

      // Sort by track order (lower order = bottom layer)
      return activeClips.sort((a, b) => {
        const trackA = timeline.tracks.find(t => t.clips.includes(a));
        const trackB = timeline.tracks.find(t => t.clips.includes(b));
        return (trackA?.order || 0) - (trackB?.order || 0);
      });
    },
    [timeline]
  );

  // Update active clip when time changes
  useEffect(() => {
    const clips = getActiveClips(currentTime);
    // For simplicity, show the topmost video clip
    const videoClip = clips.find(c => c.assetType === 'video');
    setActiveClip(videoClip || null);
  }, [currentTime, getActiveClips]);

  // Handle player progress
  const handleProgress = useCallback(
    (state: { playedSeconds: number }) => {
      // Only update if playing (avoid feedback loop)
      if (isPlaying) {
        onTimeUpdate(state.playedSeconds);
      }
    },
    [isPlaying, onTimeUpdate]
  );

  // Seek to time
  const handleSeek = useCallback(
    (time: number) => {
      onTimeUpdate(time);
      if (playerRef.current) {
        playerRef.current.seekTo(time, 'seconds');
      }
    },
    [onTimeUpdate]
  );

  // Frame-by-frame navigation
  const skipFrame = useCallback(
    (forward: boolean) => {
      const frameTime = 1 / timeline.fps;
      const newTime = forward
        ? Math.min(currentTime + frameTime, timeline.duration)
        : Math.max(currentTime - frameTime, 0);
      handleSeek(newTime);
    },
    [currentTime, timeline.fps, timeline.duration, handleSeek]
  );

  // Skip 1 second
  const skipSecond = useCallback(
    (forward: boolean) => {
      const newTime = forward
        ? Math.min(currentTime + 1, timeline.duration)
        : Math.max(currentTime - 1, 0);
      handleSeek(newTime);
    },
    [currentTime, timeline.duration, handleSeek]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            skipSecond(false);
          } else {
            skipFrame(false);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            skipSecond(true);
          } else {
            skipFrame(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, skipFrame, skipSecond]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * timeline.fps);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Video Canvas */}
      <div className="relative flex flex-1 items-center justify-center bg-black">
        {activeClip ? (
          <div className="relative flex h-full w-full items-center justify-center">
            <ReactPlayer
              ref={playerRef}
              url={activeClip.assetUrl}
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              playbackRate={playbackRate}
              onProgress={handleProgress}
              width="100%"
              height="100%"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              progressInterval={1000 / timeline.fps} // Update at FPS rate
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0"
              width={timeline.resolution.width}
              height={timeline.resolution.height}
            />
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <Play className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <p className="text-sm">No clip at current time</p>
            <p className="text-xs opacity-75">Add clips to the timeline to preview</p>
          </div>
        )}

        {/* Resolution Display */}
        <div className="absolute right-4 top-4 rounded bg-black/75 px-3 py-1.5 text-xs">
          {timeline.resolution.width}x{timeline.resolution.height} @ {timeline.fps}fps
        </div>
      </div>

      {/* Playback Controls */}
      <div className="space-y-3 border-t border-gray-800 p-4">
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <span className="w-20 font-mono text-xs text-gray-400">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            min={0}
            max={timeline.duration}
            step={1 / timeline.fps}
            onValueChange={([value]) => handleSeek(value)}
            className="flex-1"
          />
          <span className="w-20 text-right font-mono text-xs text-gray-400">
            {formatTime(timeline.duration)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Skip Back */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipSecond(false)}
              title="Skip 1s back (Shift + ←)"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* Frame Back */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipFrame(false)}
              title="Previous frame (←)"
            >
              <span className="text-xs">-1f</span>
            </Button>

            {/* Play/Pause */}
            <Button variant="default" size="sm" onClick={onPlayPause} title="Play/Pause (Space)">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            {/* Frame Forward */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipFrame(true)}
              title="Next frame (→)"
            >
              <span className="text-xs">+1f</span>
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipSecond(true)}
              title="Skip 1s forward (Shift + →)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Playback Rate */}
          <div className="flex items-center gap-2">
            <select
              value={playbackRate}
              onChange={e => setPlaybackRate(Number(e.target.value))}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs"
              title="Playback speed"
              aria-label="Playback speed"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsMuted(!isMuted)}>
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => {
                setVolume(value / 100);
                if (value > 0) setIsMuted(false);
              }}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
