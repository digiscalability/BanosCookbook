'use client';

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useReducer } from 'react';

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
    | 'combining'
    | 'socialSharing';
  selectedRecipe: Recipe | null;
  script: VideoScript | null;
  scenes: Scene[];
  sceneVideos: Record<number, string>; // sceneNumber -> videoUrl
  voiceovers: Record<number, string>; // sceneNumber -> voiceoverUrl
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
  | { type: 'VIDEO_COMBINED'; videoUrl: string; duration?: number }
  | { type: 'SKIP_COMBINE' }
  | { type: 'POSTED' }
  | { type: 'RESET' }
  | { type: 'BACK' }
  | { type: 'ERROR'; message: string };

const initialState: VideoHubState = {
  currentStep: 'selectingRecipe',
  selectedRecipe: null,
  script: null,
  scenes: [],
  sceneVideos: {},
  voiceovers: {},
  combinedVideo: null,
  error: null,
};

function videoHubReducer(state: VideoHubState, action: VideoHubAction): VideoHubState {
  switch (action.type) {
    case 'SELECT_RECIPE':
      return {
        ...initialState,
        currentStep: 'scriptGeneration',
        selectedRecipe: action.recipe,
      };

    case 'SCRIPT_READY':
      return {
        ...state,
        currentStep: 'sceneGeneration',
        script: action.script,
      };

    case 'SKIP_SCRIPT':
      return {
        ...state,
        currentStep: 'sceneGeneration',
      };

    case 'SCENES_READY':
      return {
        ...state,
        currentStep: 'voiceoverGeneration',
        scenes: action.scenes,
      };

    case 'SKIP_SCENES':
      return {
        ...state,
        currentStep: 'voiceoverGeneration',
      };

    case 'VOICEOVERS_READY':
      return {
        ...state,
        currentStep: 'studioEditing',
        voiceovers: action.voiceovers,
      };

    case 'SKIP_VOICEOVERS':
      return {
        ...state,
        currentStep: 'studioEditing',
      };

    case 'UPDATE_SCENE':
      return {
        ...state,
        scenes: state.scenes.map(s =>
          s.sceneNumber === action.sceneNumber
            ? { ...s, ...action.updates }
            : s
        ),
      };

    case 'REORDER_SCENE': {
      const scenes = [...state.scenes];
      const [moved] = scenes.splice(action.fromIdx, 1);
      scenes.splice(action.toIdx, 0, moved);
      return {
        ...state,
        scenes,
      };
    }

    case 'READY_TO_GENERATE_VIDEOS':
      return {
        ...state,
        currentStep: 'videoGeneration',
      };

    case 'VIDEO_GENERATED':
      return {
        ...state,
        sceneVideos: {
          ...state.sceneVideos,
          [action.sceneNumber]: action.videoUrl,
        },
      };

    case 'ALL_VIDEOS_READY':
      return {
        ...state,
        currentStep: 'combining',
      };

    case 'SKIP_VIDEOS':
      return {
        ...state,
        currentStep: 'combining',
      };

    case 'VIDEO_COMBINED':
      return {
        ...state,
        currentStep: 'socialSharing',
        combinedVideo: {
          url: action.videoUrl,
          duration: action.duration,
        },
      };

    case 'SKIP_COMBINE':
      return {
        ...state,
        currentStep: 'socialSharing',
      };

    case 'POSTED':
    case 'RESET':
      return initialState;

    case 'BACK': {
      const stepOrder: VideoHubState['currentStep'][] = [
        'selectingRecipe',
        'scriptGeneration',
        'sceneGeneration',
        'voiceoverGeneration',
        'studioEditing',
        'videoGeneration',
        'combining',
        'socialSharing',
      ];
      const currentIdx = stepOrder.indexOf(state.currentStep);
      const prevStep = currentIdx > 0 ? stepOrder[currentIdx - 1] : 'selectingRecipe';
      return {
        ...state,
        currentStep: prevStep,
      };
    }

    case 'ERROR':
      return {
        ...state,
        error: action.message,
      };

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
  updateScene: (sceneNumber: number, updates: Partial<Scene>) => void;
  reorderScenes: (fromIdx: number, toIdx: number) => void;
  generateVideos: () => void;
  addSceneVideo: (sceneNumber: number, videoUrl: string) => void;
  setCombinedVideo: (videoUrl: string, duration?: number) => void;
  completeWorkflow: () => void;
  goBack: () => void;
  setError: (message: string) => void;
}

const VideoHubContext = createContext<VideoHubContextValue | undefined>(undefined);

export function VideoHubProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(videoHubReducer, initialState);

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

  const updateScene = useCallback((sceneNumber: number, updates: Partial<Scene>) => {
    dispatch({ type: 'UPDATE_SCENE', sceneNumber, updates });
  }, []);

  const reorderScenes = useCallback((fromIdx: number, toIdx: number) => {
    dispatch({ type: 'REORDER_SCENE', fromIdx, toIdx });
  }, []);

  const generateVideos = useCallback(() => {
    dispatch({ type: 'READY_TO_GENERATE_VIDEOS' });
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

  const setError = useCallback((message: string) => {
    dispatch({ type: 'ERROR', message });
  }, []);

  const value: VideoHubContextValue = {
    state,
    dispatch,
    selectRecipe,
    setScript,
    setScenes,
    setVoiceovers,
    updateScene,
    reorderScenes,
    generateVideos,
    addSceneVideo,
    setCombinedVideo,
    completeWorkflow,
    goBack,
    setError,
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
