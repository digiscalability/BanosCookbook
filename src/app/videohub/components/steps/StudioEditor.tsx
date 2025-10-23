'use client';

import { GripVertical } from 'lucide-react';
import { useState } from 'react';

import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

import { useVideoHub } from '../../context/VideoHubProvider';

export function StudioEditor() {
  const { state, updateScene, reorderScenes, generateVideos } = useVideoHub();
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
    generateVideos();
  };

  return (
    <StepWrapper
      stepNumber={5}
      title="Edit Scenes in Studio"
      description="Fine-tune your scenes, timing, and voiceovers before video generation"
      showBack
      showNext
      nextLabel="Generate Videos"
      onNext={handleContinue}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Drag scenes to reorder • Edit timing and notes • Preview with voiceovers
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {state.scenes.map((scene, idx) => (
            <Card
              key={scene.sceneNumber}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={() => handleDragOver(idx)}
              className={`p-4 cursor-move transition-all ${
                draggedIdx === idx ? 'opacity-50' : ''
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <Badge>{scene.sceneNumber}</Badge>
                  <span className="flex-grow text-sm font-medium text-gray-900">
                    {scene.content.substring(0, 60)}...
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditScene(scene.sceneNumber)}
                  >
                    {editingSceneId === scene.sceneNumber ? 'Collapse' : 'Edit'}
                  </Button>
                </div>

                {/* Expanded Edit View */}
                {editingSceneId === scene.sceneNumber && (
                  <div className="ml-8 space-y-3 border-l-2 border-gray-200 pl-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Duration (seconds)</label>
                      <Slider
                        value={[scene.duration]}
                        onValueChange={([v]) => handleUpdateDuration(scene.sceneNumber, v)}
                        min={5}
                        max={60}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1">{scene.duration}s</div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Instructions</label>
                      <Input
                        placeholder="Add director notes..."
                        value={scene.notes}
                        onChange={(e) => handleUpdateNotes(scene.sceneNumber, e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    {state.voiceovers[scene.sceneNumber] && (
                      <div className="flex items-center gap-2 rounded bg-green-50 px-3 py-2">
                        <span className="text-xs text-green-700">✓ Voiceover ready</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">📝 Studio Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>• Drag scenes to reorder them</li>
            <li>• Adjust duration for pacing control</li>
            <li>• Add notes for video editors</li>
            <li>• Scenes will be auto-combined in final video</li>
          </ul>
        </div>
      </div>
    </StepWrapper>
  );
}
