'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { AudioTrack, VideoClip } from '@/lib/types/video-editor';
import {
    Eye,
    EyeOff,
    FileAudio,
    Upload,
    Volume2,
    VolumeX,
    Waveform
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useCallback, useState } from 'react';

// Dynamically import WaveSurfer components to avoid SSR issues
const WaveSurferPlayer = dynamic(
  () => import('@wavesurfer/react').then(mod => ({ default: mod.WavesurferPlayer })),
  {
    ssr: false,
    loading: () => <div className="h-16 bg-gray-100 animate-pulse rounded" />
  }
);

interface AudioPanelProps {
  activeClip: VideoClip | null;
  audioTracks: AudioTrack[];
  onAudioUpload: (file: File) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onFadeInChange: (trackId: string, duration: number) => void;
  onFadeOutChange: (trackId: string, duration: number) => void;
  onAudioDelete: (trackId: string) => void;
  currentTime: number;
  isPlaying: boolean;
}

export default function AudioPanel({
  activeClip,
  audioTracks,
  onAudioUpload,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onFadeInChange,
  onFadeOutChange,
  onAudioDelete,
  currentTime,
  isPlaying
}: AudioPanelProps) {
  const [dragOver, setDragOver] = useState(false);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  // Audio upload handling
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onAudioUpload(file);
    }
  }, [onAudioUpload]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onAudioUpload(file);
    }
  }, [onAudioUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if any track is soloed
  const hasSoloedTrack = audioTracks.some(track => track.solo);

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Waveform className="w-5 h-5" />
          Audio & Music
        </h3>
        <Badge variant="secondary" className="text-xs">
          {audioTracks.length} track{audioTracks.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Audio Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6 text-center">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id="audio-upload"
          />
          <label htmlFor="audio-upload" className="cursor-pointer">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-1">
              Drop audio files here or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Supports MP3, WAV, OGG, M4A
            </p>
          </label>
        </CardContent>
      </Card>

      {/* Audio Tracks */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {audioTracks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileAudio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No audio tracks added yet</p>
            <p className="text-xs text-gray-400">Upload audio files to get started</p>
          </div>
        ) : (
          audioTracks.map((track) => (
            <Card key={track.id} className="bg-white border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium truncate flex-1">
                    {track.name}
                  </CardTitle>
                  <div className="flex items-center gap-1 ml-2">
                    {/* Solo Toggle */}
                    <Button
                      variant={track.solo ? "default" : "ghost"}
                      size="sm"
                      onClick={() => onSoloToggle(track.id)}
                      className="h-7 w-7 p-0"
                      title="Solo track"
                    >
                      S
                    </Button>

                    {/* Mute Toggle */}
                    <Button
                      variant={track.muted ? "destructive" : "ghost"}
                      size="sm"
                      onClick={() => onMuteToggle(track.id)}
                      className="h-7 w-7 p-0"
                      title={track.muted ? "Unmute" : "Mute"}
                    >
                      {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </Button>

                    {/* Expand Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
                      className="h-7 w-7 p-0"
                      title={expandedTrack === track.id ? "Collapse" : "Expand"}
                    >
                      {expandedTrack === track.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Track Info */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatTime(track.duration)}</span>
                  <span>•</span>
                  <span>Start: {formatTime(track.startTime)}</span>
                  {track.muted && (
                    <>
                      <span>•</span>
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        MUTED
                      </Badge>
                    </>
                  )}
                  {track.solo && (
                    <>
                      <span>•</span>
                      <Badge variant="default" className="text-xs px-1 py-0">
                        SOLO
                      </Badge>
                    </>
                  )}
                  {hasSoloedTrack && !track.solo && !track.muted && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        DIMMED
                      </Badge>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Waveform Visualization */}
                {track.url && (
                  <div className="relative">
                    <WaveSurferPlayer
                      height={expandedTrack === track.id ? 80 : 40}
                      waveColor={track.muted ? "#d1d5db" : track.solo ? "#3b82f6" : "#6b7280"}
                      progressColor={track.muted ? "#9ca3af" : track.solo ? "#1d4ed8" : "#374151"}
                      url={track.url}
                      onReady={(ws) => {
                        // Sync waveform with video timeline
                        if (currentTime > 0) {
                          const relativeTime = Math.max(0, currentTime - track.startTime);
                          if (relativeTime <= track.duration) {
                            ws.seekTo(relativeTime / track.duration);
                          }
                        }
                      }}
                      onPlay={() => {
                        // Could sync with main video playback if needed
                      }}
                      onPause={() => {
                        // Could sync with main video playback if needed
                      }}
                    />

                    {/* Playhead indicator */}
                    {currentTime >= track.startTime && currentTime <= track.startTime + track.duration && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none playhead-indicator" />
                    )}
                  </div>
                )}

                {/* Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Volume</span>
                    <span className="font-mono">{Math.round(track.volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[track.volume * 100]}
                    onValueChange={([value]) => onVolumeChange(track.id, value / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                    disabled={track.muted}
                  />
                </div>

                {/* Fade Controls - Only show when expanded */}
                {expandedTrack === track.id && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {/* Fade In */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Fade In</span>
                          <span className="font-mono">{(track.fadeIn || 0).toFixed(1)}s</span>
                        </div>
                        <Slider
                          value={[(track.fadeIn || 0) * 10]}
                          onValueChange={([value]) => onFadeInChange(track.id, value / 10)}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Fade Out */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Fade Out</span>
                          <span className="font-mono">{(track.fadeOut || 0).toFixed(1)}s</span>
                        </div>
                        <Slider
                          value={[(track.fadeOut || 0) * 10]}
                          onValueChange={([value]) => onFadeOutChange(track.id, value / 10)}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onAudioDelete(track.id)}
                        className="w-full"
                      >
                        Remove Track
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Audio Mixing Info */}
      {audioTracks.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <p className="text-xs text-blue-700 mb-1">
              <strong>Audio Mixing:</strong>
            </p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Solo isolates a single track</li>
              <li>• Multiple tracks will be mixed together</li>
              <li>• Adjust volume levels to balance audio</li>
              <li>• Use fade in/out for smooth transitions</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
