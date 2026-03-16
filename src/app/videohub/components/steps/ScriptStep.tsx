'use client';

import { useState } from 'react';

import { generateAndSaveVideoScriptForRecipe } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useVideoHub } from '../../context/VideoHubProvider';
import { StepWrapper } from '../shared/StepWrapper';


export function ScriptStep() {
  const { state, setScript, setError: setGlobalError } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const handleGenerateScript = async () => {
    if (!state.selectedRecipe) return;

    setScriptError(null);
    try {
      setIsLoading(true);
      const result = await generateAndSaveVideoScriptForRecipe(state.selectedRecipe.id);
      if (result.success && result.script) {
        setScript({
          scriptId: state.selectedRecipe.id,
          recipeId: state.selectedRecipe.id,
          content: result.script,
          scenes: [],
          generatedAt: new Date(),
        });
      } else if (!result.success) {
        setScriptError(result.error ?? 'Script generation failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate script';
      setScriptError(msg);
      setGlobalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip script generation and go to scene generation with a structured template
    setScript({
      scriptId: 'default-' + Date.now(),
      recipeId: state.selectedRecipe?.id || '',
      content: `Recipe video script for ${state.selectedRecipe?.title ?? 'Recipe'}.\n\nIngredients overview: ${Array.isArray(state.selectedRecipe?.ingredients) ? (state.selectedRecipe!.ingredients as string[]).slice(0, 5).join(', ') : ''}\n\nStep by step cooking process following the recipe instructions.`,
      scenes: [],
      generatedAt: new Date(),
    });
  };

  if (!state.script) {
    return (
      <StepWrapper
        stepNumber={2}
        title="Generate Video Script"
        description="AI will create a script optimized for short-form video"
        showBack
        showNext={false}
        showSkip
        onSkip={handleSkip}
        isLoading={isLoading}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">Recipe Details:</p>
            <p className="mb-1"><strong>{state.selectedRecipe?.title}</strong></p>
            <p className="text-blue-800">{state.selectedRecipe?.description}</p>
          </div>

          <Button
            onClick={handleGenerateScript}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Generating Script...' : 'Generate Script with AI'}
          </Button>

          {scriptError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold mb-1">Script generation failed</p>
              <p className="text-xs">{scriptError}</p>
            </div>
          )}

          <p className="text-center text-sm text-gray-600">
            This will analyze your recipe and create an engaging script for video.
          </p>
        </div>
      </StepWrapper>
    );
  }

  return (
    <StepWrapper
      stepNumber={2}
      title="Review Video Script"
      description="Review the AI-generated script or edit if needed"
      showBack
      showNext
      nextLabel="Continue to Scenes"
    >
      <div className="space-y-4">
        <Textarea
          value={state.script.content}
          readOnly
          className="h-64 resize-none bg-gray-50"
          placeholder="Script content will appear here..."
        />

        <div className="text-sm text-gray-600">
          <p className="font-semibold mb-2">Scenes Detected: {state.script.scenes.length}</p>
          <ul className="space-y-1">
            {state.script.scenes.slice(0, 5).map((scene, idx) => (
              <li key={idx} className="text-gray-700">
                • Scene {idx + 1}: {scene.substring(0, 50)}...
              </li>
            ))}
          </ul>
        </div>
      </div>
    </StepWrapper>
  );
}
