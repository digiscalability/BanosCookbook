'use client';

import { useEffect, useState } from 'react';

import { combineVideoScenesAction, combineRecipeStepVideosAction, getRecipeStepVideosAction, getCombinedVideoUrlAction } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import { useVideoHub } from '../../context/VideoHubProvider';

export function CombineStep() {
  const { state, setCombinedVideo, dispatch } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // On mount: sync both step videos and combined video from Firestore.
  // This handles the case where the user jumped here via the stepper (bypassing
  // handleContinue) or where localStorage has a stale/first-clip combined URL.
  useEffect(() => {
    const recipeId = state.selectedRecipe?.id;
    if (!recipeId) return;

    // 1. Load step videos if context is empty
    if (Object.keys(state.stepVideos).length === 0 && Object.keys(state.sceneVideos).length === 0) {
      getRecipeStepVideosAction(recipeId).then((result) => {
        if (!result.success || !result.steps) return;
        const videoMap: Record<number, string> = {};
        for (const s of result.steps) {
          if (s.videoUrl) videoMap[s.stepIndex + 1] = s.videoUrl;
        }
        if (Object.keys(videoMap).length > 0) {
          dispatch({ type: 'STEP_VIDEOS_READY', stepVideos: videoMap });
        }
      });
    }

    // 2. Always refresh combined video URL from Firestore (overrides stale localStorage value)
    getCombinedVideoUrlAction(recipeId).then((result) => {
      if (result.success && result.combinedVideoUrl) {
        // Only update if it differs from what's cached (avoids no-op re-renders)
        if (result.combinedVideoUrl !== state.combinedVideo?.url) {
          setCombinedVideo(result.combinedVideoUrl);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedRecipe?.id]);

  // Prefer step videos (recipe-step based) over scene videos (script based)
  const stepVideoCount = Object.keys(state.stepVideos).length;
  const sceneVideoCount = Object.keys(state.sceneVideos).length;
  const usingStepVideos = stepVideoCount > 0;
  const videoCount = usingStepVideos ? stepVideoCount : sceneVideoCount;
  const totalScenes = usingStepVideos
    ? stepVideoCount
    : state.scenes.length;
  const estimatedDuration = usingStepVideos
    ? stepVideoCount * 6          // avg 6s per step clip
    : state.scenes.reduce((sum, s) => sum + s.duration, 0);

  const handleCombineVideos = async () => {
    if (!state.selectedRecipe || videoCount === 0) return;

    setError(null);
    setIsLoading(true);
    setProgress(20);

    try {
      const ticker = setInterval(() => {
        setProgress(p => Math.min(p + 5, 85));
      }, 3000);

      // Call the appropriate combiner
      const result = usingStepVideos
        ? await combineRecipeStepVideosAction(state.selectedRecipe.id)
        : await combineVideoScenesAction(state.selectedRecipe.id);

      clearInterval(ticker);
      setProgress(100);

      if (result.success && result.combinedVideoUrl) {
        setCombinedVideo(result.combinedVideoUrl, result.duration);
      } else {
        setError(result.error ?? 'Combining failed — check server logs for details.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while combining videos.');
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleSkipToShare = () => {
    const firstUrl =
      Object.values(state.stepVideos)[0] ??
      Object.values(state.sceneVideos)[0];
    if (!firstUrl) {
      setError('No videos available to share. Please go back and generate at least one video clip.');
      return;
    }
    setCombinedVideo(firstUrl, 0);
  };

  // Already combined — show success + preview
  if (state.combinedVideo?.url) {
    return (
      <StepWrapper
        stepNumber={7}
        title="Video Ready"
        description={usingStepVideos ? `${totalScenes} step clip${totalScenes !== 1 ? 's' : ''} ready to share` : 'Scenes stitched into one video'}
        showBack
        showNext
        nextLabel="Continue to Share"
        onNext={() => dispatch({ type: 'JUMP_TO_STEP', step: 'socialSharing' })}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">✓ Video combined successfully!</p>
            {state.combinedVideo.duration && (
              <p className="text-xs text-green-700 mt-1">Duration: ~{state.combinedVideo.duration}s</p>
            )}
          </div>
          <video controls src={state.combinedVideo.url} className="w-full rounded-lg bg-black max-h-64" />
          <ul className="space-y-1 text-sm text-gray-600">
            <li>✓ {totalScenes} {usingStepVideos ? 'step clips' : 'scenes'} combined</li>
            <li>✓ Ready to share on Instagram</li>
          </ul>
        </div>
      </StepWrapper>
    );
  }

  return (
    <StepWrapper
      stepNumber={7}
      title="Combine Videos"
      description={usingStepVideos
        ? `Merge ${videoCount} recipe step clips into one full cooking instructional video`
        : 'Merge all scene videos into one final video using FFmpeg'}
      showBack
      showNext={false}
      isLoading={isLoading}
    >
      <div className="space-y-5">
        {/* Source summary */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-2">Ready to Combine:</p>
          <ul className="space-y-1 text-xs">
            {usingStepVideos ? (
              <>
                <li>• <strong>{stepVideoCount}</strong> recipe step video clips</li>
                <li>• ~{estimatedDuration}s estimated total runtime</li>
                <li>• Mode: <strong>Step-by-step instructional video</strong></li>
              </>
            ) : (
              <>
                <li>• {sceneVideoCount} of {totalScenes} scene videos ready</li>
                <li>• ~{estimatedDuration}s estimated total duration</li>
              </>
            )}
          </ul>
        </div>

        {/* FFmpeg note */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">ℹ️ About video combining</p>
          <p>FFmpeg on the server concatenates your clips. If it&apos;s unavailable, use <strong>Skip</strong> to share the first clip directly.</p>
        </div>

        {/* Combine button */}
        <Button
          onClick={handleCombineVideos}
          disabled={isLoading || videoCount === 0}
          className="w-full"
          size="lg"
        >
          {isLoading
            ? 'Combining Videos…'
            : `Combine ${videoCount} ${usingStepVideos ? 'Step Clip' : 'Scene'}${videoCount !== 1 ? 's' : ''} Into One Video`}
        </Button>

        {/* Progress */}
        {isLoading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing with FFmpeg…</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold mb-1">⚠ Combining failed</p>
            <p className="mb-3 text-xs">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={handleCombineVideos}>
                Try Again
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={handleSkipToShare}>
                Skip — Use First Clip
              </Button>
            </div>
          </div>
        )}

        {/* Skip link */}
        {!isLoading && !error && (
          <div className="text-center">
            <button
              type="button"
              className="text-sm text-gray-400 hover:text-gray-600 underline"
              onClick={handleSkipToShare}
            >
              Skip combining — share individual clip
            </button>
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
