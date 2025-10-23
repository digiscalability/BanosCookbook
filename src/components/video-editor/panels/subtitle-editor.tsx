'use client';

import {
    Clock,
    Download,
    Edit3,
    Eye,
    EyeOff,
    FileText,
    Plus,
    Save,
    Trash2,
    Type,
    Upload,
    X,
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { stringifySync } from 'subtitle';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { showNotification } from '@/lib/notify';
import { SubtitleCue, SubtitleTrack, VideoClip } from '@/lib/types/video-editor';

interface SubtitleEditorProps {
  activeClip: VideoClip | null;
  subtitleTracks: SubtitleTrack[];
  onSubtitleUpload: (file: File) => void;
  onSubtitleTrackAdd: (track: SubtitleTrack) => void;
  onSubtitleTrackUpdate: (trackId: string, updates: Partial<SubtitleTrack>) => void;
  onSubtitleTrackDelete: (trackId: string) => void;
  onSubtitleCueAdd: (trackId: string, cue: SubtitleCue) => void;
  onSubtitleCueUpdate: (trackId: string, cueId: string, updates: Partial<SubtitleCue>) => void;
  onSubtitleCueDelete: (trackId: string, cueId: string) => void;
  currentTime: number;
  onSeekTo: (time: number) => void;
}

export default function SubtitleEditor({
  activeClip: _activeClip,
  subtitleTracks,
  onSubtitleUpload,
  onSubtitleTrackAdd: _onSubtitleTrackAdd,
  onSubtitleTrackUpdate,
  onSubtitleTrackDelete,
  onSubtitleCueAdd,
  onSubtitleCueUpdate,
  onSubtitleCueDelete,
  currentTime,
  onSeekTo,
}: SubtitleEditorProps) {
  const [dragOver, setDragOver] = useState(false);
  const [editingCue, setEditingCue] = useState<{ trackId: string; cueId: string } | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingStart, setEditingStart] = useState('');
  const [editingEnd, setEditingEnd] = useState('');
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [newCueText, setNewCueText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handling
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && (file.name.endsWith('.srt') || file.name.endsWith('.vtt'))) {
        onSubtitleUpload(file);
      }
    },
    [onSubtitleUpload]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);

      const file = event.dataTransfer.files[0];
      if (file && (file.name.endsWith('.srt') || file.name.endsWith('.vtt'))) {
        onSubtitleUpload(file);
      }
    },
    [onSubtitleUpload]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  // Time formatting
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    try {
      // Parse MM:SS.mmm format
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10);
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0], 10);
        const milliseconds = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, '0'), 10) : 0;
        return minutes * 60 + seconds + milliseconds / 1000;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  // Cue editing
  const startEditingCue = (trackId: string, cue: SubtitleCue) => {
    setEditingCue({ trackId, cueId: cue.id });
    setEditingText(cue.text);
    setEditingStart(formatTime(cue.startTime));
    setEditingEnd(formatTime(cue.endTime));
  };

  const saveEditingCue = () => {
    if (!editingCue) return;

    const startTime = parseTime(editingStart);
    const endTime = parseTime(editingEnd);

    if (startTime >= endTime) {
      showNotification('End time must be after start time', 'error');
      return;
    }

    onSubtitleCueUpdate(editingCue.trackId, editingCue.cueId, {
      text: editingText,
      startTime,
      endTime,
    });

    setEditingCue(null);
    setEditingText('');
    setEditingStart('');
    setEditingEnd('');
  };

  const cancelEditingCue = () => {
    setEditingCue(null);
    setEditingText('');
    setEditingStart('');
    setEditingEnd('');
  };

  // Add new cue at current time
  const addCueAtCurrentTime = (trackId: string) => {
    if (!newCueText.trim()) return;

    const newCue: SubtitleCue = {
      id: `cue-${Date.now()}`,
      text: newCueText.trim(),
      startTime: currentTime,
      endTime: currentTime + 3, // Default 3-second duration
      style: {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        fontFamily: 'Arial, sans-serif',
      },
    };

    onSubtitleCueAdd(trackId, newCue);
    setNewCueText('');
  };

  // Export subtitle track as SRT
  const exportTrackAsSRT = (track: SubtitleTrack) => {
    try {
      const nodes = track.cues.map(cue => ({
        type: 'cue' as const,
        data: {
          start: Math.round(cue.startTime * 1000),
          end: Math.round(cue.endTime * 1000),
          text: cue.text,
        },
      }));

      const srtContent = stringifySync(nodes, { format: 'SRT' });

      const blob = new Blob([srtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.name}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export SRT:', error);
      showNotification('Failed to export subtitle file', 'error');
    }
  };

  // Get current cue for each track
  const getCurrentCue = (track: SubtitleTrack): SubtitleCue | null => {
    return (
      track.cues.find(cue => currentTime >= cue.startTime && currentTime <= cue.endTime) || null
    );
  };

  return (
    <div className="flex h-full flex-col space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Type className="h-5 w-5" />
          Subtitles & Captions
        </h3>
        <Badge variant="secondary" className="text-xs">
          {subtitleTracks.length} track{subtitleTracks.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Subtitle Upload Area */}
      <Card
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="mb-1 text-sm text-gray-600">Drop subtitle files here or click to browse</p>
          <p className="text-xs text-gray-400">Supports SRT and WebVTT formats</p>
        </CardContent>
      </Card>

      {/* Current Time Display */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-blue-700">
              <Clock className="h-4 w-4" />
              Current Time: {formatTime(currentTime)}
            </span>
            <Button variant="outline" size="sm" onClick={() => onSeekTo(0)} className="text-xs">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subtitle Tracks */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {subtitleTracks.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm">No subtitle tracks added yet</p>
            <p className="text-xs text-gray-400">Upload SRT/VTT files or create new tracks</p>
          </div>
        ) : (
          subtitleTracks.map(track => {
            const currentCue = getCurrentCue(track);
            const isExpanded = expandedTrack === track.id;

            return (
              <Card key={track.id} className="border bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex-1 truncate text-sm font-medium">
                      {track.name}
                    </CardTitle>
                    <div className="ml-2 flex items-center gap-1">
                      {/* Visibility Toggle */}
                      <Button
                        variant={track.visible ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => onSubtitleTrackUpdate(track.id, { visible: !track.visible })}
                        className="h-7 w-7 p-0"
                        title={track.visible ? 'Hide' : 'Show'}
                      >
                        {track.visible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>

                      {/* Expand Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                        className="h-7 w-7 p-0"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? '−' : '+'}
                      </Button>

                      {/* Export Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportTrackAsSRT(track)}
                        className="h-7 w-7 p-0"
                        title="Export as SRT"
                      >
                        <Download className="h-3 w-3" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSubtitleTrackDelete(track.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        title="Delete track"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {track.cues.length} cue{track.cues.length !== 1 ? 's' : ''}
                    </span>
                    <span>•</span>
                    <span>{track.language}</span>
                    {!track.visible && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="px-1 py-0 text-xs">
                          HIDDEN
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Current Cue Display */}
                  {currentCue && track.visible && (
                    <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-sm">
                      <div className="mb-1 font-medium text-blue-700">Currently Showing:</div>
                      <div className="text-blue-900">{currentCue.text}</div>
                      <div className="mt-1 text-xs text-blue-600">
                        {formatTime(currentCue.startTime)} → {formatTime(currentCue.endTime)}
                      </div>
                    </div>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Add New Cue */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Add Cue at Current Time</Label>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Enter subtitle text..."
                          value={newCueText}
                          onChange={e => setNewCueText(e.target.value)}
                          className="min-h-[60px] text-sm"
                        />
                        <Button
                          onClick={() => addCueAtCurrentTime(track.id)}
                          disabled={!newCueText.trim()}
                          size="sm"
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Cue will be added at {formatTime(currentTime)} with 3s duration
                      </p>
                    </div>

                    <Separator />

                    {/* Cue List */}
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      <Label className="text-xs font-medium">Subtitle Cues</Label>
                      {track.cues.length === 0 ? (
                        <p className="py-4 text-center text-xs text-gray-500">
                          No cues in this track
                        </p>
                      ) : (
                        track.cues
                          .sort((a, b) => a.startTime - b.startTime)
                          .map(cue => {
                            const isEditing =
                              editingCue?.trackId === track.id && editingCue?.cueId === cue.id;
                            const isActive =
                              currentTime >= cue.startTime && currentTime <= cue.endTime;

                            return (
                              <Card
                                key={cue.id}
                                className={`p-3 ${isActive ? 'border-blue-400 bg-blue-50' : ''}`}
                              >
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={editingText}
                                      onChange={e => setEditingText(e.target.value)}
                                      className="text-sm"
                                      placeholder="Subtitle text..."
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-xs">Start Time</Label>
                                        <Input
                                          value={editingStart}
                                          onChange={e => setEditingStart(e.target.value)}
                                          placeholder="0:00.000"
                                          className="text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">End Time</Label>
                                        <Input
                                          value={editingEnd}
                                          onChange={e => setEditingEnd(e.target.value)}
                                          placeholder="0:03.000"
                                          className="text-xs"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={saveEditingCue}>
                                        <Save className="mr-1 h-3 w-3" />
                                        Save
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={cancelEditingCue}>
                                        <X className="mr-1 h-3 w-3" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="mb-2 flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="mb-1 text-sm font-medium">{cue.text}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                          <span>{formatTime(cue.startTime)}</span>
                                          <span>→</span>
                                          <span>{formatTime(cue.endTime)}</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onSeekTo(cue.startTime)}
                                            className="h-5 px-2 text-xs"
                                          >
                                            Go to
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="ml-2 flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditingCue(track.id, cue)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Edit3 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onSubtitleCueDelete(track.id, cue.id)}
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    {isActive && (
                                      <Badge variant="default" className="text-xs">
                                        ACTIVE
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Subtitle Help */}
      {subtitleTracks.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3">
            <p className="mb-1 text-xs text-green-700">
              <strong>Subtitle Tips:</strong>
            </p>
            <ul className="space-y-1 text-xs text-green-600">
              <li>• Click "Go to" to jump to a cue&apos;s timestamp</li>
              <li>• Add new cues at the current playback time</li>
              <li>• Export tracks as SRT files for use in other editors</li>
              <li>• Hide tracks to preview without subtitles</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
