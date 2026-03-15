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
  const [error, setError] = useState<string | null>(null);

  const sceneVideoCount = Object.keys(state.sceneVideos).length;
  const totalScenes = state.scenes.length;

  const handleCombineVideos = async () => {
    if (!state.selectedRecipe || sceneVideoCount === 0) return;

    setError(null);
    setIsLoading(true);
    setProgress(20);

    try {
      // Simulate progress ticks while the server works
      const ticker = setInterval(() => {
        setProgress(p => Math.min(p + 5, 85));
      }, 3000);

      const result = await combineVideoScenesAction(state.selectedRecipe.id);

      clearInterval(ticker);
      setProgress(100);

      if (result.success && result.combinedVideoUrl) {
        setCombinedVideo(result.combinedVideoUrl, result.duration);
      } else {
        setError(result.error ?? 'Combining failed — server returned no video URL.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while combining videos.');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // "Skip combine" — send users to share with individual scene videos
  const handleSkipToShare = () => {
    // Use the first available scene video URL as the "combined" video so sharing still works
    const firstUrl = Object.values(state.sceneVideos)[0] ?? '';
    setCombinedVideo(firstUrl, 0);
  };

  // Already combined — show success + preview
  if (state.combinedVideo?.url) {
    return (
      <StepWrapper
        stepNumber={7}
        title="Final Video Ready"
        description="All scenes have been stitched into one video"
        showBack
        showNext
        nextLabel="Share to Instagram"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">✓ Video combined successfully!</p>
            {state.combinedVideo.duration && (
              <p className="text-xs text-green-700 mt-1">Duration: {state.combinedVideo.duration}s</p>
            )}
          </div>

          {/* Real video preview */}
          <video
            controls
            src={state.combinedVideo.url}
            className="w-full rounded-lg bg-black max-h-64"
          />

          <ul className="space-y-1 text-sm text-gray-600">
            <li>✓ {totalScenes} scenes combined</li>
            <li>✓ Ready to share on Instagram</li>
          </ul>
        </div>
      </StepWrapper>
    );
  }

  return (
    <StepWrapper
      stepNumber={7}
      title="Combine Scenes"
      description="Merge all scene videos into one final video using FFmpeg"
      showBack
      showNext={false}
      isLoading={isLoading}
    >
      <div className="space-y-5">
        {/* Ready summary */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-2">Ready to Combine:</p>
          <ul className="space-y-1 text-xs">
            <li>• {sceneVideoCount} of {totalScenes} scene videos ready</li>
            <li>• Estimated total duration: ~{state.scenes.reduce((sum, s) => sum + s.duration, 0)}s</li>
          </ul>
        </div>

        {/* FFmpeg note */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">ℹ️ About video combining</p>
          <p>This step uses FFmpeg on the server to concatenate your scene videos. It requires FFmpeg to be installed in the server environment. If it fails, use <strong>Skip</strong> to proceed to sharing with individual scene videos instead.</p>
        </div>

        {/* Combine button */}
        <Button
          onClick={handleCombineVideos}
          disabled={isLoading || sceneVideoCount === 0}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Combining Videos…' : `Combine ${sceneVideoCount} Scene${sceneVideoCount !== 1 ? 's' : ''} Into One Video`}
        </Button>

        {/* Progress */}
        {isLoading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing…</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error with fallback option */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold mb-1">⚠ Combining failed</p>
            <p className="mb-3 text-xs">{error}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={handleCombineVideos}
              >
                Try Again
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={handleSkipToShare}
              >
                Skip — Share First Scene Instead
              </Button>
            </div>
          </div>
        )}

        {/* Skip option (always available) */}
        {!isLoading && !error && (
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-gray-400 hover:text-gray-600 underline"
              onClick={handleSkipToShare}
            >
              Skip combining — share individual scene videos
            </button>
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
