'use client';

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useEffect, useReducer } from 'react';

import type { Recipe } from '@/lib/types';

export interface VideoScript {
  scriptId: string;
  recipeId: string;
  content: string;
  scenes: string[];
  generatedAt: Date;
}

export interface Scene {
  sceneNumber: number;
  content: string;
  duration: number; // in seconds
  voiceoverUrl?: string;
  notes: string;
}

export interface VideoHubState {
  currentStep:
    | 'selectingRecipe'
    | 'scriptGeneration'
    | 'sceneGeneration'
    | 'voiceoverGeneration'
    | 'studioEditing'
    | 'videoGeneration'
    | 'stepVideoGeneration'
    | 'combining'
    | 'socialSharing';
  selectedRecipe: Recipe | null;
  script: VideoScript | null;
  scenes: Scene[];
  sceneVideos: Record<number, string>; // sceneNumber -> videoUrl (scene-based flow)
  stepVideos: Record<number, string>;  // stepIndex+1 -> videoUrl (step-based flow)
  voiceovers: Record<number, string>;  // sceneNumber -> voiceoverUrl
  combinedVideo: { url: string; duration?: number } | null;
  error: string | null;
}

export type VideoHubAction =
  | { type: 'SELECT_RECIPE'; recipe: Recipe }
  | { type: 'SCRIPT_READY'; script: VideoScript }
  | { type: 'SKIP_SCRIPT' }
  | { type: 'SCENES_READY'; scenes: Scene[] }
  | { type: 'SKIP_SCENES' }
  | { type: 'VOICEOVERS_READY'; voiceovers: Record<number, string> }
  | { type: 'SKIP_VOICEOVERS' }
  | { type: 'UPDATE_SCENE'; sceneNumber: number; updates: Partial<Scene> }
  | { type: 'REORDER_SCENE'; fromIdx: number; toIdx: number }
  | { type: 'READY_TO_GENERATE_VIDEOS' }
  | { type: 'VIDEO_GENERATED'; sceneNumber: number; videoUrl: string }
  | { type: 'ALL_VIDEOS_READY' }
  | { type: 'SKIP_VIDEOS' }
  | { type: 'GO_TO_STEP_VIDEOS' }
  | { type: 'STEP_VIDEOS_READY'; stepVideos: Record<number, string> }
  | { type: 'SKIP_STEP_VIDEOS' }
  | { type: 'VIDEO_COMBINED'; videoUrl: string; duration?: number }
  | { type: 'CLEAR_COMBINED_VIDEO' }
  | { type: 'SKIP_COMBINE' }
  | { type: 'POSTED' }
  | { type: 'RESET' }
  | { type: 'BACK' }
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'JUMP_TO_STEP'; step: VideoHubState['currentStep'] };

const initialState: VideoHubState = {
  currentStep: 'selectingRecipe',
  selectedRecipe: null,
  script: null,
  scenes: [],
  sceneVideos: {},
  stepVideos: {},
  voiceovers: {},
  combinedVideo: null,
  error: null,
};

const STORAGE_KEY = 'videohub_state_v1';

function loadPersistedState(): VideoHubState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as VideoHubState;
    // Guard: if we're back at the start, clear storage rather than restore
    if (parsed.currentStep === 'selectingRecipe') return initialState;
    return parsed;
  } catch {
    return initialState;
  }
}

function videoHubReducer(state: VideoHubState, action: VideoHubAction): VideoHubState {
  switch (action.type) {
    case 'SELECT_RECIPE':
      return {
        ...initialState,
        currentStep: 'scriptGeneration',
        selectedRecipe: action.recipe,
      };

    case 'SCRIPT_READY':
      return { ...state, currentStep: 'sceneGeneration', script: action.script };

    case 'SKIP_SCRIPT':
      return { ...state, currentStep: 'sceneGeneration' };

    case 'SCENES_READY':
      return { ...state, currentStep: 'voiceoverGeneration', scenes: action.scenes };

    case 'SKIP_SCENES':
      return { ...state, currentStep: 'voiceoverGeneration' };

    case 'VOICEOVERS_READY':
      return { ...state, currentStep: 'studioEditing', voiceovers: action.voiceovers };

    case 'SKIP_VOICEOVERS':
      return { ...state, currentStep: 'studioEditing' };

    case 'UPDATE_SCENE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.sceneNumber === action.sceneNumber ? { ...s, ...action.updates } : s
        ),
      };

    case 'REORDER_SCENE': {
      const scenes = [...state.scenes];
      const [moved] = scenes.splice(action.fromIdx, 1);
      scenes.splice(action.toIdx, 0, moved);
      return { ...state, scenes };
    }

    case 'GO_TO_STEP_VIDEOS':
      return { ...state, currentStep: 'stepVideoGeneration' };

    case 'READY_TO_GENERATE_VIDEOS':
      return { ...state, currentStep: 'videoGeneration' };

    case 'VIDEO_GENERATED':
      return {
        ...state,
        sceneVideos: { ...state.sceneVideos, [action.sceneNumber]: action.videoUrl },
      };

    case 'ALL_VIDEOS_READY':
      return { ...state, currentStep: 'combining' };

    case 'SKIP_VIDEOS':
      return { ...state, currentStep: 'combining' };

    case 'STEP_VIDEOS_READY':
      return { ...state, currentStep: 'combining', stepVideos: action.stepVideos };

    case 'SKIP_STEP_VIDEOS':
      return { ...state, currentStep: 'combining' };

    case 'VIDEO_COMBINED':
      return {
        ...state,
        currentStep: 'socialSharing',
        combinedVideo: { url: action.videoUrl, duration: action.duration },
      };

    case 'CLEAR_COMBINED_VIDEO':
      return { ...state, combinedVideo: null };

    case 'SKIP_COMBINE':
      return { ...state, currentStep: 'socialSharing' };

    case 'POSTED':
    case 'RESET':
      return initialState;

    case 'BACK': {
      // Bug 16+20: stepVideoGeneration and videoGeneration are parallel paths —
      // only one is ever used. Use a conditional map instead of a linear array
      // so BACK skips the unused parallel path.
      const backMap: Partial<Record<VideoHubState['currentStep'], VideoHubState['currentStep']>> = {
        scriptGeneration: 'selectingRecipe',
        sceneGeneration: 'scriptGeneration',
        voiceoverGeneration: 'sceneGeneration',
        studioEditing: 'voiceoverGeneration',
        stepVideoGeneration: 'studioEditing',
        videoGeneration: 'studioEditing',  // Both parallel paths go back to studio
        combining: Object.keys(state.stepVideos).length > 0
          ? 'stepVideoGeneration'
          : 'videoGeneration',
        socialSharing: 'combining',
      };
      const prev = backMap[state.currentStep];
      return prev ? { ...state, currentStep: prev } : state;
    }

    case 'ERROR':
      return { ...state, error: action.message };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'JUMP_TO_STEP':
      return { ...state, currentStep: action.step };

    default:
      return state;
  }
}

export interface VideoHubContextValue {
  state: VideoHubState;
  dispatch: (action: VideoHubAction) => void;
  selectRecipe: (recipe: Recipe) => void;
  setScript: (script: VideoScript) => void;
  setScenes: (scenes: Scene[]) => void;
  setVoiceovers: (voiceovers: Record<number, string>) => void;
  setStepVideos: (stepVideos: Record<number, string>) => void;
  updateScene: (sceneNumber: number, updates: Partial<Scene>) => void;
  reorderScenes: (fromIdx: number, toIdx: number) => void;
  generateVideos: () => void;
  goToStepVideos: () => void;
  addSceneVideo: (sceneNumber: number, videoUrl: string) => void;
  setCombinedVideo: (videoUrl: string, duration?: number) => void;
  completeWorkflow: () => void;
  goBack: () => void;
  jumpToStep: (step: VideoHubState['currentStep']) => void;
  setError: (message: string) => void;
  clearError: () => void;
}

const VideoHubContext = createContext<VideoHubContextValue | undefined>(undefined);

export function VideoHubProvider({ children }: { children: ReactNode }) {
  // Lazy-init from localStorage so in-progress work survives tab closes
  const [state, dispatch] = useReducer(
    videoHubReducer,
    undefined,
    () => {
      if (typeof window === 'undefined') return initialState;
      return loadPersistedState();
    }
  );

  // Persist every state change to localStorage (skip the reset/initial state)
  useEffect(() => {
    if (state.currentStep === 'selectingRecipe') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Storage quota exceeded or private-browsing restriction — silently ignore
      }
    }
  }, [state]);

  const selectRecipe = useCallback((recipe: Recipe) => {
    dispatch({ type: 'SELECT_RECIPE', recipe });
  }, []);

  const setScript = useCallback((script: VideoScript) => {
    dispatch({ type: 'SCRIPT_READY', script });
  }, []);

  const setScenes = useCallback((scenes: Scene[]) => {
    dispatch({ type: 'SCENES_READY', scenes });
  }, []);

  const setVoiceovers = useCallback((voiceovers: Record<number, string>) => {
    dispatch({ type: 'VOICEOVERS_READY', voiceovers });
  }, []);

  const setStepVideos = useCallback((stepVideos: Record<number, string>) => {
    dispatch({ type: 'STEP_VIDEOS_READY', stepVideos });
  }, []);

  const updateScene = useCallback((sceneNumber: number, updates: Partial<Scene>) => {
    dispatch({ type: 'UPDATE_SCENE', sceneNumber, updates });
  }, []);

  const reorderScenes = useCallback((fromIdx: number, toIdx: number) => {
    dispatch({ type: 'REORDER_SCENE', fromIdx, toIdx });
  }, []);

  const generateVideos = useCallback(() => {
    dispatch({ type: 'READY_TO_GENERATE_VIDEOS' });
  }, []);

  const goToStepVideos = useCallback(() => {
    dispatch({ type: 'GO_TO_STEP_VIDEOS' });
  }, []);

  const addSceneVideo = useCallback((sceneNumber: number, videoUrl: string) => {
    dispatch({ type: 'VIDEO_GENERATED', sceneNumber, videoUrl });
  }, []);

  const setCombinedVideo = useCallback((videoUrl: string, duration?: number) => {
    dispatch({ type: 'VIDEO_COMBINED', videoUrl, duration });
  }, []);

  const completeWorkflow = useCallback(() => {
    dispatch({ type: 'POSTED' });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'BACK' });
  }, []);

  const jumpToStep = useCallback((step: VideoHubState['currentStep']) => {
    dispatch({ type: 'JUMP_TO_STEP', step });
  }, []);

  const setError = useCallback((message: string) => {
    dispatch({ type: 'ERROR', message });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: VideoHubContextValue = {
    state,
    dispatch,
    selectRecipe,
    setScript,
    setScenes,
    setVoiceovers,
    setStepVideos,
    updateScene,
    reorderScenes,
    generateVideos,
    goToStepVideos,
    addSceneVideo,
    setCombinedVideo,
    completeWorkflow,
    goBack,
    jumpToStep,
    setError,
    clearError,
  };

  return (
    <VideoHubContext.Provider value={value}>
      {children}
    </VideoHubContext.Provider>
  );
}

export function useVideoHub(): VideoHubContextValue {
  const context = React.useContext(VideoHubContext);
  if (context === undefined) {
    throw new Error('useVideoHub must be used within VideoHubProvider');
  }
  return context;
}
