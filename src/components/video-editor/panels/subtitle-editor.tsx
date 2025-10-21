'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VideoClip, SubtitleTrack, SubtitleCue } from '@/lib/types/video-editor';
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Type,
  Clock,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { parseSync, stringifySync, parseTimestamp, formatTimestamp } from 'subtitle';

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
  activeClip,
  subtitleTracks,
  onSubtitleUpload,
  onSubtitleTrackAdd,
  onSubtitleTrackUpdate,
  onSubtitleTrackDelete,
  onSubtitleCueAdd,
  onSubtitleCueUpdate,
  onSubtitleCueDelete,
  currentTime,
  onSeekTo
}: SubtitleEditorProps) {
  const [dragOver, setDragOver] = useState(false);
  const [editingCue, setEditingCue] = useState<{trackId: string, cueId: string} | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingStart, setEditingStart] = useState('');
  const [editingEnd, setEditingEnd] = useState('');
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [newCueText, setNewCueText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handling
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.name.endsWith('.srt') || file.name.endsWith('.vtt'))) {
      onSubtitleUpload(file);
    }
  }, [onSubtitleUpload]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.srt') || file.name.endsWith('.vtt'))) {
      onSubtitleUpload(file);
    }
  }, [onSubtitleUpload]);

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
      alert('End time must be after start time');
      return;
    }

    onSubtitleCueUpdate(editingCue.trackId, editingCue.cueId, {
      text: editingText,
      startTime,
      endTime
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
        fontFamily: 'Arial, sans-serif'
      }
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
          text: cue.text
        }
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
      alert('Failed to export subtitle file');
    }
  };

  // Get current cue for each track
  const getCurrentCue = (track: SubtitleTrack): SubtitleCue | null => {
    return track.cues.find(cue =>
      currentTime >= cue.startTime && currentTime <= cue.endTime
    ) || null;
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Type className="w-5 h-5" />
          Subtitles & Captions
        </h3>
        <Badge variant="secondary" className="text-xs">
          {subtitleTracks.length} track{subtitleTracks.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Subtitle Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
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
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-1">
            Drop subtitle files here or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Supports SRT and WebVTT formats
          </p>
        </CardContent>
      </Card>

      {/* Current Time Display */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Current Time: {formatTime(currentTime)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSeekTo(0)}
              className="text-xs"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subtitle Tracks */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {subtitleTracks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No subtitle tracks added yet</p>
            <p className="text-xs text-gray-400">Upload SRT/VTT files or create new tracks</p>
          </div>
        ) : (
          subtitleTracks.map((track) => {
            const currentCue = getCurrentCue(track);
            const isExpanded = expandedTrack === track.id;

            return (
              <Card key={track.id} className="bg-white border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium truncate flex-1">
                      {track.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 ml-2">
                      {/* Visibility Toggle */}
                      <Button
                        variant={track.visible ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onSubtitleTrackUpdate(track.id, { visible: !track.visible })}
                        className="h-7 w-7 p-0"
                        title={track.visible ? "Hide" : "Show"}
                      >
                        {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Button>

                      {/* Expand Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                        className="h-7 w-7 p-0"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? "−" : "+"}
                      </Button>

                      {/* Export Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportTrackAsSRT(track)}
                        className="h-7 w-7 p-0"
                        title="Export as SRT"
                      >
                        <Download className="w-3 h-3" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSubtitleTrackDelete(track.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        title="Delete track"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{track.cues.length} cue{track.cues.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{track.language}</span>
                    {!track.visible && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          HIDDEN
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* Current Cue Display */}
                  {currentCue && track.visible && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <div className="text-blue-700 font-medium mb-1">Currently Showing:</div>
                      <div className="text-blue-900">{currentCue.text}</div>
                      <div className="text-blue-600 text-xs mt-1">
                        {formatTime(currentCue.startTime)} → {formatTime(currentCue.endTime)}
                      </div>
                    </div>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Add New Cue */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Add Cue at Current Time</Label>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Enter subtitle text..."
                          value={newCueText}
                          onChange={(e) => setNewCueText(e.target.value)}
                          className="text-sm min-h-[60px]"
                        />
                        <Button
                          onClick={() => addCueAtCurrentTime(track.id)}
                          disabled={!newCueText.trim()}
                          size="sm"
                          className="shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Cue will be added at {formatTime(currentTime)} with 3s duration
                      </p>
                    </div>

                    <Separator />

                    {/* Cue List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <Label className="text-xs font-medium">Subtitle Cues</Label>
                      {track.cues.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">
                          No cues in this track
                        </p>
                      ) : (
                        track.cues
                          .sort((a, b) => a.startTime - b.startTime)
                          .map((cue) => {
                            const isEditing = editingCue?.trackId === track.id && editingCue?.cueId === cue.id;
                            const isActive = currentTime >= cue.startTime && currentTime <= cue.endTime;

                            return (
                              <Card
                                key={cue.id}
                                className={`p-3 ${isActive ? 'border-blue-400 bg-blue-50' : ''}`}
                              >
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      className="text-sm"
                                      placeholder="Subtitle text..."
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-xs">Start Time</Label>
                                        <Input
                                          value={editingStart}
                                          onChange={(e) => setEditingStart(e.target.value)}
                                          placeholder="0:00.000"
                                          className="text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs">End Time</Label>
                                        <Input
                                          value={editingEnd}
                                          onChange={(e) => setEditingEnd(e.target.value)}
                                          placeholder="0:03.000"
                                          className="text-xs"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={saveEditingCue}>
                                        <Save className="w-3 h-3 mr-1" />
                                        Save
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={cancelEditingCue}>
                                        <X className="w-3 h-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium mb-1">{cue.text}</p>
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
                                      <div className="flex gap-1 ml-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditingCue(track.id, cue)}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => onSubtitleCueDelete(track.id, cue.id)}
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                        >
                                          <Trash2 className="w-3 h-3" />
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
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <p className="text-xs text-green-700 mb-1">
              <strong>Subtitle Tips:</strong>
            </p>
            <ul className="text-xs text-green-600 space-y-1">
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
