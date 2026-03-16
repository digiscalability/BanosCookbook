'use client';

import { GripVertical } from 'lucide-react';
import { useState } from 'react';

import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

import { useVideoHub } from '../../context/VideoHubProvider';

export function StudioEditor() {
  const { state, updateScene, reorderScenes, generateVideos, goToStepVideos } = useVideoHub();
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleEditScene = (sceneNumber: number) => {
    setEditingSceneId(editingSceneId === sceneNumber ? null : sceneNumber);
  };

  const handleUpdateDuration = (sceneNumber: number, duration: number) => {
    updateScene(sceneNumber, { duration });
  };

  const handleUpdateNotes = (sceneNumber: number, notes: string) => {
    updateScene(sceneNumber, { notes });
  };

  const handleUpdateContent = (sceneNumber: number, content: string) => {
    updateScene(sceneNumber, { content });
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (idx: number) => {
    if (draggedIdx !== null && draggedIdx !== idx) {
      reorderScenes(draggedIdx, idx);
      setDraggedIdx(idx);
    }
  };

  const handleContinue = () => {
    goToStepVideos();
  };

  return (
    <StepWrapper
      stepNumber={5}
      title="Edit Scenes in Studio"
      description="Fine-tune script, timing, and notes for each scene before video generation"
      showBack
      showNext
      nextLabel="Generate Step Videos"
      onNext={handleContinue}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Drag scenes to reorder • Edit script text, timing, and notes
        </div>

        <div className="space-y-2 max-h-[36rem] overflow-y-auto">
          {state.scenes.map((scene, idx) => (
            <Card
              key={scene.sceneNumber}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={() => handleDragOver(idx)}
              className={`p-4 cursor-move transition-all ${draggedIdx === idx ? 'opacity-50' : ''}`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-400 shrink-0" />
                  <Badge>{scene.sceneNumber}</Badge>
                  <span className="flex-grow text-sm text-gray-700 truncate">
                    {String(scene.content ?? '').substring(0, 60)}…
                  </span>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-gray-400">{scene.duration}s</span>
                    {state.voiceovers[scene.sceneNumber] && (
                      <span className="text-xs text-green-600">🎤</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditScene(scene.sceneNumber)}
                    >
                      {editingSceneId === scene.sceneNumber ? 'Collapse' : 'Edit'}
                    </Button>
                  </div>
                </div>

                {/* Expanded Edit View */}
                {editingSceneId === scene.sceneNumber && (
                  <div className="ml-8 space-y-4 border-l-2 border-gray-200 pl-4">
                    {/* Script content — the key missing edit field */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Scene Script
                        <span className="ml-1 font-normal text-gray-400">(used as video generation prompt)</span>
                      </label>
                      <Textarea
                        value={String(scene.content ?? '')}
                        onChange={(e) => handleUpdateContent(scene.sceneNumber, e.target.value)}
                        className="text-sm min-h-[80px] resize-y"
                        placeholder="Describe what happens in this scene…"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Duration: <span className="text-gray-500">{scene.duration}s</span>
                      </label>
                      <Slider
                        value={[scene.duration]}
                        onValueChange={([v]) => handleUpdateDuration(scene.sceneNumber, v)}
                        min={5}
                        max={60}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>5s</span><span>60s</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Director Notes</label>
                      <Input
                        placeholder="Add notes for the video editor…"
                        value={scene.notes}
                        onChange={(e) => handleUpdateNotes(scene.sceneNumber, e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    {/* Voiceover preview */}
                    {state.voiceovers[scene.sceneNumber] && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">Voiceover preview</p>
                        <audio controls src={state.voiceovers[scene.sceneNumber]} className="w-full h-8" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">📝 Studio Tips</p>
          <ul className="space-y-1 text-xs">
            <li>• Drag scenes to reorder them</li>
            <li>• Edit the scene script — this is the prompt sent to Runway ML</li>
            <li>• Adjust duration for pacing control (5–60s)</li>
            <li>• Add director notes as reminders — they don&apos;t affect video generation</li>
          </ul>
        </div>
      </div>
    </StepWrapper>
  );
}
