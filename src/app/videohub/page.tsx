'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getRecipeById } from '@/lib/firestore-recipes';
import { WorkflowStepper } from './components/shared/WorkflowStepper';
import { CombineStep } from './components/steps/CombineStep';
import { RecipeSelector } from './components/steps/RecipeSelector';
import { SceneStep } from './components/steps/SceneStep';
import { ScriptStep } from './components/steps/ScriptStep';
import { SocialSharingStep } from './components/steps/SocialSharingStep';
import { StudioEditor } from './components/steps/StudioEditor';
import { VideoGenerationStep } from './components/steps/VideoGenerationStep';
import { VoiceoverStep } from './components/steps/VoiceoverStep';
import { RecipeStepVideoStep } from './components/steps/RecipeStepVideoStep';
import { ProtectedPage } from '@/components/auth/protected-page';
import { useVideoHub, VideoHubProvider, type VideoHubState } from './context/VideoHubProvider';

function RecipePreloader() {
  const { state, selectRecipe } = useVideoHub();
  const searchParams = useSearchParams();

  useEffect(() => {
    const recipeId = searchParams?.get('recipeId');
    if (recipeId && state.currentStep === 'selectingRecipe' && !state.selectedRecipe) {
      getRecipeById(recipeId).then(recipe => {
        if (recipe) selectRecipe(recipe);
      });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function VideoHubContent() {
  const { state, jumpToStep } = useVideoHub();

  const steps = [
    { label: 'Recipe', id: 'selectingRecipe' },
    { label: 'Script', id: 'scriptGeneration' },
    { label: 'Scenes', id: 'sceneGeneration' },
    { label: 'Voiceover', id: 'voiceoverGeneration' },
    { label: 'Studio', id: 'studioEditing' },
    { label: 'Step Videos', id: 'stepVideoGeneration' },
    { label: 'Scene Videos', id: 'videoGeneration' },
    { label: 'Combine', id: 'combining' },
    { label: 'Share', id: 'socialSharing' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <Suspense>
        <RecipePreloader />
      </Suspense>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Recipe Video Hub</h1>
          <p className="text-gray-600">Create professional recipe videos in 8 simple steps</p>
        </div>

        {/* Workflow Stepper */}
        <WorkflowStepper
          steps={steps}
          currentStep={state.currentStep}
          className="mb-8"
          onStepClick={(stepId) => jumpToStep(stepId as VideoHubState['currentStep'])}
        />

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {state.currentStep === 'selectingRecipe' && <RecipeSelector />}
          {state.currentStep === 'scriptGeneration' && <ScriptStep />}
          {state.currentStep === 'sceneGeneration' && <SceneStep />}
          {state.currentStep === 'voiceoverGeneration' && <VoiceoverStep />}
          {state.currentStep === 'studioEditing' && <StudioEditor />}
          {state.currentStep === 'stepVideoGeneration' && <RecipeStepVideoStep />}
          {state.currentStep === 'videoGeneration' && <VideoGenerationStep />}
          {state.currentStep === 'combining' && <CombineStep />}
          {state.currentStep === 'socialSharing' && <SocialSharingStep />}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Create amazing recipe videos with AI-powered automation</p>
        </div>
      </div>
    </div>
  );
}

export default function VideoHubPage() {
  return (
    <ProtectedPage redirectTo="/videohub">
      <VideoHubProvider>
        <VideoHubContent />
      </VideoHubProvider>
    </ProtectedPage>
  );
}
