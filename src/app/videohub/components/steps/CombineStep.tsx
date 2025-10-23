'use client';

import { useState } from 'react';

import { combineVideoScenesAction } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import { useVideoHub } from '../../context/VideoHubProvider';


export function CombineStep() {
  const { state, setCombinedVideo } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleCombineVideos = async () => {
    if (!state.selectedRecipe || Object.keys(state.sceneVideos).length === 0) return;

    try {
      setIsLoading(true);
      setProgress(30);

      const combinedVideoUrl = await combineVideoScenesAction(
        state.selectedRecipe.id,
        Object.values(state.sceneVideos),
        state.scenes
      );

      setProgress(100);
      setCombinedVideo(combinedVideoUrl);
    } catch (error) {
      console.error('Failed to combine videos:', error);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleSkip = () => {
    // Skip combining and go to social sharing with individual scene videos
    setCombinedVideo('', 0);
  };

  if (!state.combinedVideo) {
    return (
      <StepWrapper
        stepNumber={7}
        title="Combine Scenes"
        description="Merge all individual scene videos into one final video"
        showBack
        showNext={false}
        showSkip
        onSkip={handleSkip}
        isLoading={isLoading}
      >
        <div className="space-y-6">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">✓ Ready to Combine:</p>
            <ul className="space-y-1">
              <li>• {state.scenes.length} scenes recorded</li>
              <li>• {Object.keys(state.sceneVideos).length} videos ready</li>
              <li>• Total estimated duration: ~{state.scenes.reduce((sum, s) => sum + s.duration, 0)}s</li>
            </ul>
          </div>

          <Button
            onClick={handleCombineVideos}
            disabled={isLoading || Object.keys(state.sceneVideos).length === 0}
            isLoading={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Combining Videos...' : 'Combine All Scenes'}
          </Button>

          {isLoading && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Processing</span>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <p className="text-center text-sm text-gray-600">
            This will stitch all your videos together into a seamless final product.
          </p>
        </div>
      </StepWrapper>
    );
  }

  return (
    <StepWrapper
      stepNumber={7}
      title="Final Video Ready"
      description="Your video has been successfully created"
      showBack
      showNext
      nextLabel="Share to Instagram"
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">✓ Video Combined Successfully!</p>
        </div>

        <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-gray-600">Video Preview</p>
            {state.combinedVideo?.duration && (
              <p className="text-sm text-gray-500 mt-1">Duration: {state.combinedVideo.duration}s</p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium text-gray-900">Final Video Details:</p>
          <ul className="space-y-1 text-gray-600">
            <li>✓ {state.scenes.length} scenes combined</li>
            <li>✓ Professional transitions applied</li>
            <li>✓ Ready to share</li>
          </ul>
        </div>
      </div>
    </StepWrapper>
  );
}
