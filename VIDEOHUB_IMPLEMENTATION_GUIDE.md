# Video Hub Implementation Guide: Step-by-Step

## Overview

This guide provides concrete code examples for implementing the new minimalist Video Hub architecture proposed in `VIDEOHUB_UX_REDESIGN_ANALYSIS.md`.

---

## Part 1: State Management with XState

### File: `src/app/videohub/context/videoHubMachine.ts`

```typescript
import { createMachine, assign } from 'xstate';
import type { Recipe, VideoScript, Scene } from '@/lib/types';

export interface VideoHubContext {
  selectedRecipe: Recipe | null;
  script: VideoScript | null;
  scenes: Scene[];
  sceneVideos: Map<number, string>; // sceneNumber -> videoUrl
  voiceovers: Map<number, string>; // sceneNumber -> voiceoverUrl
  combinedVideo: { url: string; duration?: number } | null;
  error: string | null;
}

export const videoHubMachine = createMachine(
  {
    id: 'videoHub',
    initial: 'selectingRecipe',
    context: {
      selectedRecipe: null,
      script: null,
      scenes: [],
      sceneVideos: new Map(),
      voiceovers: new Map(),
      combinedVideo: null,
      error: null,
    } as VideoHubContext,
    states: {
      selectingRecipe: {
        on: {
          SELECT_RECIPE: {
            target: 'scriptGeneration',
            actions: assign({
              selectedRecipe: (_, event) => event.recipe,
              script: null,
              scenes: [],
              sceneVideos: new Map(),
              voiceovers: new Map(),
              combinedVideo: null,
              error: null,
            }),
          },
        },
      },
      scriptGeneration: {
        on: {
          SCRIPT_READY: {
            target: 'sceneGeneration',
            actions: assign({
              script: (_, event) => event.script,
            }),
          },
          SKIP_SCRIPT: {
            target: 'sceneGeneration',
          },
          ERROR: {
            target: 'selectingRecipe',
            actions: assign({
              error: (_, event) => event.message,
            }),
          },
        },
      },
      sceneGeneration: {
        on: {
          SCENES_READY: {
            target: 'voiceoverGeneration',
            actions: assign({
              scenes: (_, event) => event.scenes,
            }),
          },
          SKIP_SCENES: {
            target: 'voiceoverGeneration',
          },
          ERROR: {
            target: 'scriptGeneration',
            actions: assign({ error: (_, event) => event.message }),
          },
        },
      },
      voiceoverGeneration: {
        on: {
          VOICEOVERS_READY: {
            target: 'studioEditing',
            actions: assign({
              voiceovers: (_, event) => event.voiceovers,
            }),
          },
          SKIP_VOICEOVERS: {
            target: 'studioEditing',
          },
          BACK: 'sceneGeneration',
          ERROR: {
            target: 'sceneGeneration',
            actions: assign({ error: (_, event) => event.message }),
          },
        },
      },
      studioEditing: {
        on: {
          UPDATE_SCENE: {
            actions: assign({
              scenes: (ctx, event) => {
                const updated = ctx.scenes.map(s =>
                  s.sceneNumber === event.sceneNumber
                    ? { ...s, ...event.updates }
                    : s
                );
                return updated;
              },
            }),
          },
          REORDER_SCENE: {
            actions: assign({
              scenes: (ctx, event) => {
                const scenes = [...ctx.scenes];
                const [moved] = scenes.splice(event.fromIdx, 1);
                scenes.splice(event.toIdx, 0, moved);
                return scenes;
              },
            }),
          },
          READY_TO_GENERATE_VIDEOS: 'videoGeneration',
          BACK: 'voiceoverGeneration',
        },
      },
      videoGeneration: {
        on: {
          VIDEO_GENERATED: {
            actions: assign({
              sceneVideos: (ctx, event) => {
                const map = new Map(ctx.sceneVideos);
                map.set(event.sceneNumber, event.videoUrl);
                return map;
              },
            }),
          },
          ALL_VIDEOS_READY: 'combining',
          SKIP_VIDEOS: 'combining',
          BACK: 'studioEditing',
          ERROR: {
            target: 'studioEditing',
            actions: assign({ error: (_, event) => event.message }),
          },
        },
      },
      combining: {
        on: {
          VIDEO_COMBINED: {
            target: 'socialSharing',
            actions: assign({
              combinedVideo: (_, event) => ({
                url: event.videoUrl,
                duration: event.duration,
              }),
            }),
          },
          SKIP_COMBINE: 'socialSharing',
          BACK: 'videoGeneration',
          ERROR: {
            target: 'videoGeneration',
            actions: assign({ error: (_, event) => event.message }),
          },
        },
      },
      socialSharing: {
        on: {
          POSTED: {
            target: 'selectingRecipe',
            actions: assign({
              selectedRecipe: null,
              script: null,
              scenes: [],
              sceneVideos: new Map(),
              voiceovers: new Map(),
              combinedVideo: null,
              error: null,
            }),
          },
          BACK: 'combining',
          DONE: {
            target: 'selectingRecipe',
            actions: assign({
              selectedRecipe: null,
              script: null,
              scenes: [],
              sceneVideos: new Map(),
              voiceovers: new Map(),
              combinedVideo: null,
              error: null,
            }),
          },
        },
      },
    },
  },
  {
    actions: {},
  }
);
```

### File: `src/app/videohub/context/VideoHubProvider.tsx`

```typescript
'use client';

import { ReactNode, createContext, useContext } from 'react';
import { useActor } from '@xstate/react';
import { interpret } from 'xstate';
import { videoHubMachine, type VideoHubContext } from './videoHubMachine';

export type VideoHubState = ReturnType<typeof interpret<VideoHubContext>>;

const VideoHubContext = createContext<VideoHubState | undefined>(undefined);

export function VideoHubProvider({ children }: { children: ReactNode }) {
  const machineRef = useActor(videoHubMachine)[1];

  return (
    <VideoHubContext.Provider value={machineRef}>
      {children}
    </VideoHubContext.Provider>
  );
}

export function useVideoHub() {
  const context = useContext(VideoHubContext);
  if (!context) {
    throw new Error('useVideoHub must be used within VideoHubProvider');
  }
  return context;
}
```

---

## Part 2: Step Components

### File: `src/app/videohub/components/StepWrapper.tsx`

```typescript
interface StepWrapperProps {
  stepNumber: number;
  title: string;
  description?: string;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  loading?: boolean;
  error?: string | null;
}

export function StepWrapper({
  stepNumber,
  title,
  description,
  children,
  onNext,
  onBack,
  nextLabel = 'Continue',
  loading = false,
  error,
}: StepWrapperProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
          {stepNumber}
        </div>
        <div>
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">❌ {error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-background p-6">{children}</div>

      <div className="flex gap-3 justify-end">
        {onBack && (
          <button onClick={onBack} className="btn btn-outline" disabled={loading}>
            ← Back
          </button>
        )}
        {onNext && (
          <button onClick={onNext} className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Processing...' : `${nextLabel} →`}
          </button>
        )}
      </div>
    </div>
  );
}
```

### File: `src/app/videohub/components/RecipeSelector.tsx`

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Recipe } from '@/lib/types';
import { useVideoHub } from '../context/VideoHubProvider';

export function RecipeSelector() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const videoHub = useVideoHub();

  useEffect(() => {
    (async () => {
      const { getAllRecipes } = await import('@/app/actions');
      const data = await getAllRecipes();
      setRecipes(data);
      setLoading(false);
    })();
  }, []);

  const handleSelect = useCallback(
    (recipe: Recipe) => {
      videoHub.send({ type: 'SELECT_RECIPE', recipe });
    },
    [videoHub]
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {recipes.map(recipe => (
        <button
          key={recipe.id}
          onClick={() => handleSelect(recipe)}
          className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
            videoHub.state.context.selectedRecipe?.id === recipe.id
              ? 'border-primary ring-2 ring-primary'
              : 'border-gray-200 hover:border-primary'
          }`}
        >
          {recipe.imageUrl && (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="h-32 w-full object-cover"
            />
          )}
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black to-transparent p-2">
            <p className="text-xs font-semibold text-white line-clamp-2">{recipe.title}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
```

### File: `src/app/videohub/components/StudioEditor.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import type { Scene } from '@/lib/types';

interface StudioEditorProps {
  scenes: Scene[];
  onChange: (scenes: Scene[]) => void;
  recipeId: string;
}

export function StudioEditor({ scenes, onChange, recipeId }: StudioEditorProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    scenes[0]?.id || null
  );

  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  const updateScene = useCallback(
    (sceneId: string, updates: Partial<Scene>) => {
      const updated = scenes.map(s =>
        s.id === sceneId ? { ...s, ...updates } : s
      );
      onChange(updated);
    },
    [scenes, onChange]
  );

  const reorderScene = useCallback(
    (fromIdx: number, toIdx: number) => {
      const updated = [...scenes];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      onChange(updated);
    },
    [scenes, onChange]
  );

  if (!selectedScene) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Scene List */}
      <div className="col-span-1 rounded-lg border bg-background">
        <div className="border-b px-4 py-2">
          <p className="text-sm font-semibold">Scenes ({scenes.length})</p>
        </div>
        <div className="space-y-1 overflow-y-auto max-h-96 p-2">
          {scenes.map((scene, idx) => (
            <button
              key={scene.id}
              onClick={() => setSelectedSceneId(scene.id)}
              className={`w-full rounded px-3 py-2 text-left text-sm transition-all ${
                selectedSceneId === scene.id
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <div className="font-semibold">Scene {scene.sceneNumber}</div>
              <div className="line-clamp-2 text-xs opacity-75">
                {scene.description || scene.script}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scene Preview & Editor */}
      <div className="col-span-2 space-y-4 rounded-lg border bg-background p-4">
        {/* Preview */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
          {selectedScene.imageUrl ? (
            <img
              src={selectedScene.imageUrl}
              alt="Scene preview"
              className="w-full h-full object-cover"
            />
          ) : selectedScene.videoUrl ? (
            <video
              src={selectedScene.videoUrl}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-sm">No preview</div>
          )}
        </div>

        {/* Script Editor */}
        <div>
          <label className="text-xs font-semibold mb-1 block">Narration Script</label>
          <textarea
            value={selectedScene.script}
            onChange={e => updateScene(selectedSceneId, { script: e.target.value })}
            className="w-full h-20 p-2 border rounded resize-none text-sm"
            placeholder="What should the narrator say during this scene?"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold mb-1 block">Visual Description</label>
          <textarea
            value={selectedScene.description}
            onChange={e => updateScene(selectedSceneId, { description: e.target.value })}
            className="w-full h-16 p-2 border rounded resize-none text-sm"
            placeholder="Describe what should appear on screen..."
          />
        </div>
      </div>

      {/* Controls */}
      <div className="col-span-1 space-y-4 rounded-lg border bg-background p-4">
        {/* Duration */}
        <div>
          <label className="text-xs font-semibold mb-2 block">Duration</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="60"
              value={selectedScene.duration || 5}
              onChange={e =>
                updateScene(selectedSceneId, { duration: parseInt(e.target.value) })
              }
              className="flex-1 p-2 border rounded text-sm"
            />
            <span className="flex items-center text-sm">s</span>
          </div>
        </div>

        {/* Animation */}
        <div>
          <label className="text-xs font-semibold mb-2 block">Animation</label>
          <select
            value={selectedScene.advancedOptions?.animation?.type || 'none'}
            onChange={e =>
              updateScene(selectedSceneId, {
                advancedOptions: {
                  ...selectedScene.advancedOptions,
                  animation: { type: e.target.value },
                },
              })
            }
            className="w-full p-2 border rounded text-sm"
          >
            <option value="none">None</option>
            <option value="pan-left">Pan Left</option>
            <option value="pan-right">Pan Right</option>
            <option value="zoom-in">Zoom In</option>
            <option value="zoom-out">Zoom Out</option>
            <option value="fade">Fade</option>
          </select>
        </div>

        {/* Voiceover */}
        <div>
          <label className="text-xs font-semibold mb-2 block">Voiceover</label>
          {selectedScene.voiceOverUrl ? (
            <div className="space-y-2">
              <audio
                src={selectedScene.voiceOverUrl}
                controls
                className="w-full h-8"
              />
              <button
                onClick={() => updateScene(selectedSceneId, { voiceOverUrl: undefined })}
                className="btn btn-xs btn-outline w-full"
              >
                🔄 Regenerate
              </button>
            </div>
          ) : (
            <button className="btn btn-sm btn-outline w-full">🎤 Generate</button>
          )}
        </div>

        {/* Generate Video */}
        <button className="btn btn-primary w-full text-sm">
          🎥 Generate Video
        </button>
      </div>
    </div>
  );
}
```

---

## Part 3: Main Page Component

### File: `src/app/videohub/page.tsx` (Refactored)

```typescript
'use client';

import { useActor } from '@xstate/react';
import { videoHubMachine } from './context/videoHubMachine';
import { StepWrapper } from './components/StepWrapper';
import { RecipeSelector } from './components/RecipeSelector';
import { StudioEditor } from './components/StudioEditor';
import { WorkflowStepper } from './components/WorkflowStepper';
import { ScriptStep } from './components/ScriptStep';
import { SceneStep } from './components/SceneStep';
import { VoiceoverStep } from './components/VoiceoverStep';
import { VideoGenerationStep } from './components/VideoGenerationStep';
import { CombineStep } from './components/CombineStep';
import { SocialSharingStep } from './components/SocialSharingStep';

export default function VideoHubPage() {
  const [state, send] = useActor(videoHubMachine);

  const step = state.value as string;
  const { selectedRecipe, script, scenes, combinedVideo, error } = state.context;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">🎬 Recipe Video Hub</h1>
            <div className="text-sm text-muted-foreground">
              {selectedRecipe && `Recipe: ${selectedRecipe.title}`}
            </div>
          </div>
        </div>
      </header>

      {/* Workflow Stepper */}
      <WorkflowStepper
        currentStep={step}
        steps={['Select', 'Script', 'Scenes', 'Voice', 'Studio', 'Generate', 'Combine', 'Share']}
        onStepClick={stepIdx => {
          // Navigate to step if already completed
        }}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {step === 'selectingRecipe' && (
          <StepWrapper stepNumber={1} title="Select a Recipe">
            <RecipeSelector />
          </StepWrapper>
        )}

        {step === 'scriptGeneration' && selectedRecipe && (
          <StepWrapper
            stepNumber={2}
            title="Generate Script"
            description="AI will create a video script for your recipe"
            loading={!script}
            onBack={() => send({ type: 'ERROR', message: '' })}
            onNext={() => send({ type: 'SCRIPT_READY', script })}
            nextLabel="Continue"
          >
            <ScriptStep
              recipe={selectedRecipe}
              script={script}
              onSkip={() => send({ type: 'SKIP_SCRIPT' })}
            />
          </StepWrapper>
        )}

        {step === 'sceneGeneration' && selectedRecipe && (
          <StepWrapper
            stepNumber={3}
            title="Create Scenes"
            description="Split script into individual scenes"
            loading={!scenes.length}
            onBack={() => send({ type: 'BACK' })}
            onNext={() => send({ type: 'SCENES_READY', scenes })}
          >
            <SceneStep recipe={selectedRecipe} script={script} onSkip={() => send({ type: 'SKIP_SCENES' })} />
          </StepWrapper>
        )}

        {step === 'voiceoverGeneration' && selectedRecipe && (
          <StepWrapper
            stepNumber={4}
            title="Generate Voiceovers"
            description="Create narration for each scene"
            onBack={() => send({ type: 'BACK' })}
            onNext={() => send({ type: 'VOICEOVERS_READY', voiceovers: new Map() })}
          >
            <VoiceoverStep recipe={selectedRecipe} scenes={scenes} onSkip={() => send({ type: 'SKIP_VOICEOVERS' })} />
          </StepWrapper>
        )}

        {step === 'studioEditing' && selectedRecipe && (
          <StepWrapper
            stepNumber={5}
            title="Studio Editor"
            description="Review and edit your scenes"
            onBack={() => send({ type: 'BACK' })}
            onNext={() => send({ type: 'READY_TO_GENERATE_VIDEOS' })}
            nextLabel="Generate Videos"
          >
            <StudioEditor
              scenes={scenes}
              onChange={updated => send({ type: 'UPDATE_SCENE', scenes: updated })}
              recipeId={selectedRecipe.id}
            />
          </StepWrapper>
        )}

        {step === 'videoGeneration' && selectedRecipe && (
          <StepWrapper
            stepNumber={6}
            title="Generate Videos"
            description="Create video for each scene"
            onBack={() => send({ type: 'BACK' })}
            onNext={() => send({ type: 'ALL_VIDEOS_READY' })}
          >
            <VideoGenerationStep recipe={selectedRecipe} scenes={scenes} />
          </StepWrapper>
        )}

        {step === 'combining' && selectedRecipe && (
          <StepWrapper
            stepNumber={7}
            title="Combine Scenes"
            description="Merge all scenes into final video"
            onBack={() => send({ type: 'BACK' })}
            onNext={() => send({ type: 'VIDEO_COMBINED', videoUrl: '' })}
          >
            <CombineStep recipe={selectedRecipe} scenes={scenes} />
          </StepWrapper>
        )}

        {step === 'socialSharing' && selectedRecipe && (
          <StepWrapper
            stepNumber={8}
            title="Share to Social"
            description="Post your video to Instagram"
            onBack={() => send({ type: 'BACK' })}
            onNext={() => send({ type: 'DONE' })}
            nextLabel="Start Over"
          >
            <SocialSharingStep
              recipe={selectedRecipe}
              combinedVideo={combinedVideo}
              onPosted={() => send({ type: 'POSTED' })}
            />
          </StepWrapper>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## Part 4: Integration Checklist

### Step 1: Create Directory Structure
```bash
mkdir -p src/app/videohub/context
mkdir -p src/app/videohub/components/steps
mkdir -p src/app/videohub/components/shared
```

### Step 2: Implement Files in Order
1. `videoHubMachine.ts` - State machine definition
2. `VideoHubProvider.tsx` - Context provider
3. Step components (RecipeSelector, ScriptStep, etc.)
4. Shared components (StepWrapper, WorkflowStepper)
5. Main `page.tsx`

### Step 3: Wire Up Existing Server Actions
Each step component should call existing server actions from `src/app/actions.ts`:

- `RecipeSelector` → `getAllRecipes()`
- `ScriptStep` → `generateAndSaveVideoScriptForRecipe()`
- `SceneStep` → `getSplitScenesForRecipeAction()`
- `VoiceoverStep` → `generateVoiceOverAction()`, `handleBatchVoiceoverGenerate()`
- `VideoGenerationStep` → `generateRecipeVideoAction()`, `generateSplitSceneVideoAction()`
- `CombineStep` → `combineVideoScenesAction()`
- `SocialSharingStep` → `shareRecipeToInstagram()`

### Step 4: Testing
- Test each step individually
- Test navigation (back/forward)
- Test error states
- Test mobile responsiveness

---

## Key Improvements Over Current Implementation

| Aspect | Current | New |
|--------|---------|-----|
| **State Variables** | 60+ scattered | XState machine (organized) |
| **Lines of Code** | 3,147 (monolithic) | ~400 per component (modular) |
| **Modal Dialogs** | 6+ competing | 0-1 at a time (mostly inline) |
| **User Workflow** | Unclear, many forks | 8-step linear + back button |
| **Mobile UX** | Difficult | Responsive by design |
| **Testing** | Requires full page | Can test each step independently |
| **Maintainability** | Hard (one big file) | Easy (separate concerns) |
| **Type Safety** | Partial | Full (XState types) |

---

## Deployment Strategy

### Phase 1: Parallel Implementation
- Keep old VideohubPage working
- Build new components in separate route `/videohub-v2`
- Test thoroughly

### Phase 2: Feature Flag Migration
- Add feature flag: `VIDEOHUB_V2_ENABLED`
- Route `/videohub` to new or old based on flag
- Gather user feedback

### Phase 3: Deprecate Old
- Switch flag to 100%
- Monitor error logs
- Remove old component after 2 weeks

---

## Next Document: UI/UX Mockups

See accompanying Figma mockups for visual reference of:
- Desktop layout (4-column)
- Tablet layout (2-column)
- Mobile layout (single column)
- Each of the 8 steps
- Error states
- Loading states

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Estimated Timeline**: 2 weeks end-to-end
