'use client';

import { useEffect, useState } from 'react';

import { getSplitScenesForRecipeAction } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import type { Scene } from '../../context/VideoHubProvider';
import { useVideoHub } from '../../context/VideoHubProvider';

export function SceneStep() {
  const { state, setScenes } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Auto-generate scenes if not already loaded
    if (state.scenes.length === 0 && state.selectedRecipe && !isLoading) {
      handleGenerateScenes();
    }
  }, []);

  const handleGenerateScenes = async () => {
    if (!state.selectedRecipe) return;

    try {
      setIsLoading(true);
      const result = await getSplitScenesForRecipeAction(state.selectedRecipe.id);
      const scenes = result.scenes ?? [];

      const formattedScenes: Scene[] = scenes.map((scene: any, idx: number) => ({
        sceneNumber: idx + 1,
        content: scene.content || scene,
        duration: scene.duration || 10,
        notes: scene.notes || '',
      }));

      setScenes(formattedScenes);
    } catch (error) {
      console.error('Failed to generate scenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (state.scenes.length === 0 && !isLoading) {
    return (
      <StepWrapper
        stepNumber={3}
        title="Generate Video Scenes"
        description="AI will split your recipe into short video scenes"
        showBack
        showNext={false}
        isLoading={isLoading}
      >
        <div className="space-y-4">
          <Button
            onClick={handleGenerateScenes}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Splitting into Scenes...' : 'Generate Scenes from Script'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            Your recipe will be split into short, engaging video scenes (typically 15-30 seconds each).
          </p>
        </div>
      </StepWrapper>
    );
  }

  return (
    <StepWrapper
      stepNumber={3}
      title="Review Video Scenes"
      description="Scenes that will be recorded individually"
      showBack
      showNext
      nextLabel="Continue to Voiceovers"
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          <Badge variant="secondary">{state.scenes.length} scenes detected</Badge>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {state.scenes.map((scene, idx) => (
            <Card key={scene.sceneNumber} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-full bg-green-100 px-2 py-1 text-sm font-semibold text-green-700">
                  Scene {scene.sceneNumber}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-gray-900">{scene.content.substring(0, 80)}</p>
                  <p className="text-sm text-gray-600 mt-1">Duration: ~{scene.duration}s</p>
                  {scene.notes && (
                    <p className="text-sm text-gray-500 mt-1 italic">{scene.notes}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Each scene will be recorded and combined into a final video.
        </p>
      </div>
    </StepWrapper>
  );
}
