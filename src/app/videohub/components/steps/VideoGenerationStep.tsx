'use client';

import { useState } from 'react';

import { generateSplitSceneVideoAction } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useVideoHub } from '../../context/VideoHubProvider';

type SceneStatus = 'idle' | 'generating' | 'done' | 'error';

export function VideoGenerationStep() {
  const { state, addSceneVideo } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<Record<number, SceneStatus>>({});
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  const totalScenes = state.scenes.length;
  const generatedCount = Object.keys(state.sceneVideos).length;
  const allGenerated = generatedCount === totalScenes && totalScenes > 0;
  const progress = totalScenes > 0 ? (generatedCount / totalScenes) * 100 : 0;

  const generateScene = async (sceneNumber: number) => {
    if (!state.selectedRecipe) return;
    setSceneStatus(prev => ({ ...prev, [sceneNumber]: 'generating' }));
    try {
      const result = await generateSplitSceneVideoAction(
        state.selectedRecipe.id,
        sceneNumber
      );
      if (result.videoUrl) {
        addSceneVideo(sceneNumber, result.videoUrl);
        setSceneStatus(prev => ({ ...prev, [sceneNumber]: 'done' }));
      } else {
        setSceneStatus(prev => ({ ...prev, [sceneNumber]: 'error' }));
      }
    } catch {
      setSceneStatus(prev => ({ ...prev, [sceneNumber]: 'error' }));
    }
  };

  const handleGenerateAll = async () => {
    if (!state.selectedRecipe || totalScenes === 0) return;
    setIsLoading(true);
    // Sequential — Runway rate limits prevent parallel generation
    for (const scene of state.scenes) {
      if (!state.sceneVideos[scene.sceneNumber]) {
        await generateScene(scene.sceneNumber);
      }
    }
    setIsLoading(false);
  };

  const handleRetryScene = async (sceneNumber: number) => {
    await generateScene(sceneNumber);
  };

  const errorScenes = state.scenes.filter(s => sceneStatus[s.sceneNumber] === 'error');
  const hasErrors = errorScenes.length > 0;

  return (
    <StepWrapper
      stepNumber={6}
      title="Generate Scene Videos"
      description="Runway ML generates a video clip for each scene using your recipe image"
      showBack
      showNext={generatedCount > 0}
      nextLabel="Continue to Combine"
      isLoading={isLoading}
    >
      <div className="space-y-5">
        {/* Time expectation callout */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">⏱ Heads up — this step takes a while</p>
          <p>Each scene takes <strong>1–2 minutes</strong> to generate via Runway ML. For {totalScenes} scenes, expect <strong>{totalScenes}–{totalScenes * 2} minutes</strong> total. Videos are generated one at a time to stay within API rate limits.</p>
        </div>

        {/* Main action button */}
        <Button
          onClick={handleGenerateAll}
          disabled={isLoading || allGenerated}
          className="w-full"
          size="lg"
        >
          {isLoading
            ? `Generating scene ${Object.values(sceneStatus).filter(s => s === 'generating').length > 0
                ? state.scenes.find(s => sceneStatus[s.sceneNumber] === 'generating')?.sceneNumber
                : '…'}… (${generatedCount}/${totalScenes} done)`
            : allGenerated
              ? `✓ All ${totalScenes} Videos Ready`
              : generatedCount > 0
                ? `Resume — Generate Remaining ${totalScenes - generatedCount} Videos`
                : `Generate All ${totalScenes} Videos`}
        </Button>

        {/* Overall progress */}
        {(isLoading || generatedCount > 0) && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{generatedCount} of {totalScenes} complete</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error summary */}
        {hasErrors && !isLoading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold mb-1">⚠ {errorScenes.length} scene{errorScenes.length > 1 ? 's' : ''} failed</p>
            <p className="mb-2">You can retry individual scenes below or continue to Combine with the videos you have.</p>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
              onClick={async () => {
                setIsLoading(true);
                for (const s of errorScenes) await handleRetryScene(s.sceneNumber);
                setIsLoading(false);
              }}
            >
              Retry All Failed Scenes
            </Button>
          </div>
        )}

        {/* Per-scene list */}
        <div className="space-y-3 max-h-[32rem] overflow-y-auto">
          {state.scenes.map((scene) => {
            const videoUrl = state.sceneVideos[scene.sceneNumber];
            const status = sceneStatus[scene.sceneNumber] ?? (videoUrl ? 'done' : 'idle');
            const isExpanded = expandedScene === scene.sceneNumber;

            return (
              <Card key={scene.sceneNumber} className="overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Badge variant={status === 'error' ? 'destructive' : status === 'done' ? 'default' : 'secondary'}>
                    {scene.sceneNumber}
                  </Badge>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{scene.content.substring(0, 60)}…</p>
                    <p className="text-xs text-gray-500">~{scene.duration}s</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {status === 'generating' && (
                      <span className="text-xs text-blue-500 animate-pulse">Generating…</span>
                    )}
                    {status === 'done' && videoUrl && (
                      <button
                        type="button"
                        className="text-xs text-green-600 font-medium hover:underline"
                        onClick={() => setExpandedScene(isExpanded ? null : scene.sceneNumber)}
                      >
                        {isExpanded ? 'Hide ▲' : '▶ Preview'}
                      </button>
                    )}
                    {status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleRetryScene(scene.sceneNumber)}
                      >
                        Retry
                      </Button>
                    )}
                    {status === 'idle' && !isLoading && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-gray-500"
                        onClick={() => {
                          generateScene(scene.sceneNumber);
                        }}
                      >
                        Generate
                      </Button>
                    )}
                    {status === 'idle' && isLoading && (
                      <span className="text-xs text-gray-400">Queued</span>
                    )}
                  </div>
                </div>

                {/* Inline video preview */}
                {isExpanded && videoUrl && (
                  <div className="border-t bg-gray-50 p-3">
                    <video
                      controls
                      src={videoUrl}
                      className="w-full rounded max-h-48 bg-black"
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {allGenerated && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-semibold text-green-900">
              ✓ All {totalScenes} scene videos are ready. Click &quot;Continue to Combine&quot; above.
            </p>
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
