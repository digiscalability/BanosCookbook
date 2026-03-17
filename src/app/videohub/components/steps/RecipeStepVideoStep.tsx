'use client';

import { useEffect, useRef, useState } from 'react';

import {
  generateSingleStepVideoAction,
  generateStepVideoPromptsAction,
  getRecipeStepVideosAction,
  type StepVideoRecord,
} from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useVideoHub } from '../../context/VideoHubProvider';

type StepStatus = 'idle' | 'generating' | 'done' | 'error';

/**
 * RecipeStepVideoStep
 *
 * Generates one Runway ML video clip per recipe instruction step, then hands
 * all clip URLs to the VideoHubProvider so CombineStep can stitch them together
 * into a full cooking instructional video.
 *
 * Flow:
 *   1. On mount — fetch existing prompts/videos from Firestore
 *   2. If no prompts — auto-generate them via GPT-4o-mini → Runway-optimised strings
 *   3. "Generate All" — fires each step sequentially (Runway rate-limit safe)
 *   4. Per-step Retry on failure
 *   5. "Continue to Combine" when ≥ 1 video ready
 */
function PromptRow({ cameraAngle, duration, prompt }: { cameraAngle: string; duration: number; prompt: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="text-xs text-gray-400 space-y-1">
      <div className="flex items-center gap-2">
        <span>🎥 {cameraAngle} · {duration}s</span>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-blue-400 hover:text-blue-600 underline underline-offset-2"
        >
          {expanded ? 'hide' : 'read more'}
        </button>
      </div>
      {expanded && (
        <div className="relative bg-gray-50 border border-gray-200 rounded p-2 pr-16 text-gray-600 leading-relaxed select-all">
          {prompt}
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2 right-2 text-xs text-white bg-gray-500 hover:bg-gray-700 px-2 py-1 rounded"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

export function RecipeStepVideoStep() {
  const { state, setStepVideos } = useVideoHub();
  const recipe = state.selectedRecipe;

  const [steps, setSteps] = useState<StepVideoRecord[]>([]);
  const [stepStatus, setStepStatus] = useState<Record<number, StepStatus>>({});
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const abortRef = useRef(false);

  const recipeSteps: string[] = Array.isArray(recipe?.instructions)
    ? (recipe!.instructions as string[]).filter(Boolean)
    : [];

  const doneCount = steps.filter(s => stepStatus[s.stepIndex] === 'done' || s.videoUrl).length;
  const errorSteps = steps.filter(s => stepStatus[s.stepIndex] === 'error');
  const hasVideos = doneCount > 0;
  const allDone = steps.length > 0 && doneCount === steps.length;
  const progressPct = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

  // ── Load existing prompts/videos from Firestore on mount ────────────────
  useEffect(() => {
    if (!recipe?.id) return;

    async function load() {
      setIsLoadingPrompts(true);
      setPromptError(null);
      try {
        const result = await getRecipeStepVideosAction(recipe!.id);
        if (result.success && result.steps && result.steps.length > 0) {
          setSteps(result.steps);
          // Mark already-generated steps as done
          const initialStatus: Record<number, StepStatus> = {};
          for (const s of result.steps) {
            if (s.videoUrl) initialStatus[s.stepIndex] = 'done';
          }
          setStepStatus(initialStatus);
          setIsLoadingPrompts(false);
        } else {
          // No prompts yet — generate them (handleGeneratePrompts manages its own loading state)
          setIsLoadingPrompts(false);
          await handleGeneratePrompts();
        }
      } catch (err) {
        setPromptError(err instanceof Error ? err.message : 'Failed to load step data.');
        setIsLoadingPrompts(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);

  // ── Generate Runway prompts for all steps ───────────────────────────────
  async function handleGeneratePrompts() {
    if (!recipe?.id) return;
    setIsLoadingPrompts(true);
    setPromptError(null);
    try {
      const result = await generateStepVideoPromptsAction(recipe.id);
      if (result.success && result.steps) {
        setSteps(result.steps);
      } else {
        setPromptError(result.error ?? 'Failed to generate step prompts. Check your API key and try again.');
      }
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : 'Unexpected error generating prompts.');
    } finally {
      setIsLoadingPrompts(false);
    }
  }

  // ── Generate video for a single step ───────────────────────────────────
  async function generateStep(stepIndex: number): Promise<boolean> {
    if (!recipe?.id) return false;
    setStepStatus(prev => ({ ...prev, [stepIndex]: 'generating' }));
    try {
      const result = await generateSingleStepVideoAction(recipe.id, stepIndex);
      if (result.videoUrl) {
        setSteps(prev =>
          prev.map(s => s.stepIndex === stepIndex ? { ...s, videoUrl: result.videoUrl } : s)
        );
        setStepStatus(prev => ({ ...prev, [stepIndex]: 'done' }));
        return true;
      } else {
        setStepStatus(prev => ({ ...prev, [stepIndex]: 'error' }));
        return false;
      }
    } catch {
      setStepStatus(prev => ({ ...prev, [stepIndex]: 'error' }));
      return false;
    }
  }

  // ── Generate all steps sequentially (rate-limit safe) ──────────────────
  async function handleGenerateAll() {
    if (!recipe?.id || steps.length === 0) return;
    setIsGeneratingAll(true);
    abortRef.current = false;

    const pending = steps.filter(s => !s.videoUrl && stepStatus[s.stepIndex] !== 'done');
    for (const step of pending) {
      if (abortRef.current) break;
      await generateStep(step.stepIndex);
    }

    setIsGeneratingAll(false);
    // Note: do NOT call setStepVideos here — that would advance to 'combining' prematurely.
    // The user must explicitly click "Continue to Combine" (handleContinue) to advance.
  }

  // ── Commit videos to context and advance to combining ──────────────────
  // Bug 9 fix: setStepVideos dispatches STEP_VIDEOS_READY which transitions
  // currentStep to 'combining'. This is the only place we call it.
  function handleContinue() {
    const videoMap: Record<number, string> = {};
    for (const s of steps) {
      // Bug 10: store as 1-based keys (stepIndex + 1) — CombineStep reads via
      // Object.values() so key numbering doesn't affect it, but kept consistent.
      if (s.videoUrl) videoMap[s.stepIndex + 1] = s.videoUrl;
    }
    setStepVideos(videoMap);
  }

  // ── Early guard ─────────────────────────────────────────────────────────
  if (!recipe) {
    return (
      <StepWrapper stepNumber={6} title="Step Videos" description="" showBack showNext={false}>
        <p className="text-sm text-gray-500">No recipe selected. Go back and choose one.</p>
      </StepWrapper>
    );
  }

  if (recipeSteps.length === 0) {
    return (
      <StepWrapper stepNumber={6} title="Step Videos" description="" showBack showNext={false}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">⚠ No instruction steps found</p>
          <p className="mt-1">
            This recipe has no instruction steps. Please edit the recipe and add cooking instructions
            before generating step videos.
          </p>
        </div>
      </StepWrapper>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <StepWrapper
      stepNumber={6}
      title="Generate Instruction Step Videos"
      description={`Runway ML generates a ${steps.length || recipeSteps.length}-clip cooking video — one clip per recipe step — then merged into a full instructional video`}
      showBack
      showNext={hasVideos}
      nextLabel="Continue to Combine"
      onNext={handleContinue}
      isLoading={isGeneratingAll}
    >
      <div className="space-y-5">

        {/* Info callout */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">🎬 How this works</p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>Each recipe instruction step becomes one <strong>5–8 second Runway ML video clip</strong></li>
            <li>Clips are generated one-at-a-time to respect Runway&apos;s rate limits (~1–2 min each)</li>
            <li>Your recipe image is used as the visual reference for consistency</li>
            <li>All clips are combined in the next step into a full instructional video</li>
          </ul>
        </div>

        {/* Time estimate */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span className="font-semibold">⏱ Time estimate: </span>
          {steps.length || recipeSteps.length} steps × ~1.5 min ={' '}
          <strong>~{Math.ceil((steps.length || recipeSteps.length) * 1.5)} minutes total</strong>
          {' '}— you can leave this running in the background.
        </div>

        {/* Loading prompts state */}
        {isLoadingPrompts && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-gray-600">Generating AI prompts for each step…</span>
          </div>
        )}

        {/* Prompt generation error */}
        {promptError && !isLoadingPrompts && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold mb-1">⚠ Failed to generate step prompts</p>
            <p className="text-xs mb-3 text-red-700">{promptError}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
              onClick={handleGeneratePrompts}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Main action button */}
        {!isLoadingPrompts && steps.length > 0 && (
          <>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll || allDone}
                className="flex-1"
                size="lg"
              >
                {isGeneratingAll
                  ? `Generating… (${doneCount}/${steps.length} done)`
                  : allDone
                    ? `✓ All ${steps.length} Videos Ready`
                    : doneCount > 0
                      ? `Resume — ${steps.length - doneCount} remaining`
                      : `Generate All ${steps.length} Step Videos`}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePrompts}
                disabled={isGeneratingAll || isLoadingPrompts}
                title="Re-generate AI prompts for all steps"
                className="shrink-0"
              >
                ↺ Re-prompt
              </Button>
            </div>

            {/* Overall progress */}
            {(isGeneratingAll || doneCount > 0) && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{doneCount} of {steps.length} complete</span>
                  <span>{Math.round(progressPct)}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            )}

            {/* Error summary */}
            {errorSteps.length > 0 && !isGeneratingAll && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="font-semibold mb-1">⚠ {errorSteps.length} step{errorSteps.length > 1 ? 's' : ''} failed</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 mt-1"
                  onClick={async () => {
                    setIsGeneratingAll(true);
                    for (const s of errorSteps) await generateStep(s.stepIndex);
                    setIsGeneratingAll(false);
                  }}
                >
                  Retry All Failed
                </Button>
              </div>
            )}
          </>
        )}

        {/* Per-step list */}
        {steps.length > 0 && (
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {steps.map((step) => {
              const status: StepStatus = stepStatus[step.stepIndex] ?? (step.videoUrl ? 'done' : 'idle');
              const isExpanded = expandedStep === step.stepIndex;

              return (
                <Card key={step.stepIndex} className="overflow-hidden">
                  <div className="flex items-start gap-3 p-4">

                    {/* Step number badge */}
                    <Badge
                      variant={
                        status === 'error' ? 'destructive'
                        : status === 'done' ? 'default'
                        : 'secondary'
                      }
                      className="mt-0.5 shrink-0"
                    >
                      {step.stepIndex + 1}
                    </Badge>

                    {/* Step text + runway prompt preview */}
                    <div className="flex-grow min-w-0 space-y-1">
                      <p className="text-sm font-medium text-gray-900 leading-snug">
                        {step.stepText}
                      </p>
                      <PromptRow cameraAngle={step.cameraAngle} duration={step.duration} prompt={step.runwayPrompt} />
                    </div>

                    {/* Status / action */}
                    <div className="shrink-0 flex items-center gap-2">
                      {status === 'generating' && (
                        <span className="flex items-center gap-1 text-xs text-blue-500">
                          <span className="h-3 w-3 animate-spin rounded-full border border-blue-400 border-t-transparent" />
                          Generating…
                        </span>
                      )}

                      {status === 'done' && (
                        <button
                          type="button"
                          className="text-xs font-medium text-green-600 hover:underline"
                          onClick={() => setExpandedStep(isExpanded ? null : step.stepIndex)}
                        >
                          {isExpanded ? 'Hide ▲' : '▶ Preview'}
                        </button>
                      )}

                      {status === 'error' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => generateStep(step.stepIndex)}
                        >
                          Retry
                        </Button>
                      )}

                      {status === 'idle' && !isGeneratingAll && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-gray-500"
                          onClick={() => generateStep(step.stepIndex)}
                        >
                          Generate
                        </Button>
                      )}

                      {status === 'idle' && isGeneratingAll && (
                        <span className="text-xs text-gray-400">Queued</span>
                      )}
                    </div>
                  </div>

                  {/* Inline video preview */}
                  {isExpanded && step.videoUrl && (
                    <div className="border-t bg-gray-50 p-3">
                      <video
                        controls
                        src={step.videoUrl}
                        className="w-full rounded max-h-52 bg-black"
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Recipe steps preview (before prompts load) */}
        {steps.length === 0 && !isLoadingPrompts && recipeSteps.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto opacity-50">
            {recipeSteps.map((step, idx) => (
              <Card key={idx} className="p-3 flex items-start gap-3">
                <Badge variant="secondary" className="shrink-0">{idx + 1}</Badge>
                <p className="text-sm text-gray-700">{step}</p>
              </Card>
            ))}
          </div>
        )}

        {/* All done banner */}
        {allDone && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-semibold text-green-900">
              ✓ All {steps.length} step videos ready. Click &quot;Continue to Combine&quot; to merge them.
            </p>
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
