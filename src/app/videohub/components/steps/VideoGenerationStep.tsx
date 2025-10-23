'use client';

import { useState } from 'react';

import { generateSplitSceneVideoAction } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useVideoHub } from '../../context/VideoHubProvider';


export function VideoGenerationStep() {
  const { state, addSceneVideo } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerateVideos = async () => {
    if (!state.selectedRecipe || state.scenes.length === 0) return;

    try {
      setIsLoading(true);
      let completedCount = 0;

      for (const scene of state.scenes) {
        try {
          const videoUrl = await generateSplitSceneVideoAction(
            state.selectedRecipe.id,
            scene.sceneNumber,
            scene.content,
            state.voiceovers[scene.sceneNumber]
          );

          addSceneVideo(scene.sceneNumber, videoUrl);
          completedCount++;
          setProgress((completedCount / state.scenes.length) * 100);
        } catch (error) {
          console.error(`Failed to generate video for scene ${scene.sceneNumber}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to generate videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatedCount = Object.keys(state.sceneVideos).length;
  const totalScenes = state.scenes.length;
  const allGenerated = generatedCount === totalScenes;

  return (
    <StepWrapper
      stepNumber={6}
      title="Generate Scene Videos"
      description="AI will create individual video clips for each scene"
      showBack
      showNext={allGenerated}
      nextLabel="Continue to Combine"
      isLoading={isLoading}
    >
      <div className="space-y-6">
        <Button
          onClick={handleGenerateVideos}
          disabled={isLoading || allGenerated}
          isLoading={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? `Generating Videos... ${generatedCount}/${totalScenes}` : `Generate ${totalScenes} Videos`}
        </Button>

        {/* Progress Bar */}
        {isLoading && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm text-gray-600">{generatedCount}/{totalScenes}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Video List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {state.scenes.map((scene) => {
            const videoUrl = state.sceneVideos[scene.sceneNumber];
            return (
              <Card key={scene.sceneNumber} className="p-4">
                <div className="flex items-center gap-3">
                  <Badge variant={videoUrl ? 'default' : 'secondary'}>{scene.sceneNumber}</Badge>
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">{scene.content.substring(0, 60)}</p>
                    <p className="text-xs text-gray-500">Duration: ~{scene.duration}s</p>
                  </div>
                  {videoUrl ? (
                    <div className="text-xs font-medium text-green-600">✓ Ready</div>
                  ) : isLoading ? (
                    <div className="text-xs text-blue-600">Generating...</div>
                  ) : (
                    <div className="text-xs text-gray-400">Pending</div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {allGenerated && (
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-900">
              ✓ All {totalScenes} videos have been generated successfully!
            </p>
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
