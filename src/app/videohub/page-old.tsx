'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SplitScene, VideoHubStatusData, VoiceOverMetadata } from '@/app/actions';
import PromptConfirmModal from '@/components/prompt-confirm-modal';
import RecipeListModal from '@/components/recipe-list-modal';
import SceneEditor, { Scene } from '@/components/scene-editor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VideoPreviewModal from '@/components/video-preview-modal';
import { getAllRecipes } from '@/lib/firestore-recipes';
import { fetchAllVideoScripts, VideoScriptDoc } from '@/lib/firestore-video-scripts';
import { showNotification } from '@/lib/notify';
import { RUNWAY_MODELS, RunwayModel } from '@/lib/openai-video-gen';
import type { Recipe } from '@/lib/types';

// fetchSplitScenesForRecipe (client) may be blocked by Firestore rules; prefer server action

function normalizeAdvancedOptions(raw: unknown): Scene['advancedOptions'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const normalized: Scene['advancedOptions'] = {};

  const voiceRaw = obj.voice as Record<string, unknown> | undefined;
  if (voiceRaw) {
    normalized.voice = {
      enabled: !!voiceRaw.enabled,
      voiceId: typeof voiceRaw.voiceId === 'string' ? voiceRaw.voiceId : undefined,
      pitch: typeof voiceRaw.pitch === 'number' ? voiceRaw.pitch : undefined,
      rate: typeof voiceRaw.rate === 'number' ? voiceRaw.rate : undefined,
      text: typeof voiceRaw.text === 'string' ? voiceRaw.text : undefined,
      url: typeof voiceRaw.url === 'string' ? voiceRaw.url : undefined,
    };
  }

  const musicRaw = obj.music as Record<string, unknown> | undefined;
  if (musicRaw) {
    normalized.music = {
      enabled: !!musicRaw.enabled,
      genre: typeof musicRaw.genre === 'string' ? musicRaw.genre : undefined,
      volume: typeof musicRaw.volume === 'number' ? musicRaw.volume : undefined,
    };
  }

  const animationRaw = obj.animation as Record<string, unknown> | undefined;
  if (animationRaw) {
    normalized.animation = {
      enabled: !!animationRaw.enabled,
      style: typeof animationRaw.style === 'string' ? animationRaw.style : undefined,
    };
  }

  if (typeof obj.duration === 'number') {
    normalized.duration = obj.duration;
  } else if (typeof obj.duration === 'string') {
    const parsed = Number(obj.duration);
    if (Number.isFinite(parsed)) normalized.duration = parsed;
  }

  if (
    !normalized.voice &&
    !normalized.music &&
    !normalized.animation &&
    typeof normalized.duration === 'undefined'
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeVoiceoverMeta(raw: unknown): Scene['voiceoverMeta'] {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const bytes = typeof obj.bytes === 'number' ? obj.bytes : undefined;
  const durationEstimate =
    typeof obj.durationEstimate === 'number' ? obj.durationEstimate : undefined;
  const textHash = typeof obj.textHash === 'string' ? obj.textHash : undefined;
  const sourceRaw = typeof obj.source === 'string' ? obj.source : undefined;
  const createdAt = typeof obj.createdAt === 'string' ? obj.createdAt : undefined;

  if (
    typeof bytes !== 'number' ||
    typeof durationEstimate !== 'number' ||
    !textHash ||
    !sourceRaw ||
    !createdAt
  ) {
    return null;
  }

  const source: VoiceOverMetadata['source'] =
    sourceRaw === 'gemini' || sourceRaw === 'elevenlabs' || sourceRaw === 'unknown'
      ? (sourceRaw as VoiceOverMetadata['source'])
      : 'unknown';

  const meta: Scene['voiceoverMeta'] = {
    bytes,
    durationEstimate,
    textHash,
    source,
    createdAt,
  };

  if (typeof obj.voiceId === 'string') meta.voiceId = obj.voiceId;
  if (typeof obj.context === 'string') meta.context = obj.context;
  if (typeof obj.recipeId === 'string') meta.recipeId = obj.recipeId;
  if (typeof obj.sceneNumber === 'number') meta.sceneNumber = obj.sceneNumber;
  if (typeof obj.url === 'string') meta.url = obj.url;
  if (typeof obj.updatedAt === 'string') meta.updatedAt = obj.updatedAt;

  return meta;
}

function mapSplitSceneToClient(scene: SplitScene): Scene {
  const images = Array.isArray(scene.imageUrls)
    ? scene.imageUrls.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      )
    : [];
  const singleImage = (scene as { imageUrl?: unknown }).imageUrl;
  if (
    typeof singleImage === 'string' &&
    singleImage.trim().length > 0 &&
    !images.includes(singleImage)
  ) {
    images.push(singleImage);
  }

  const subtitleLines = Array.isArray(scene.subtitleLines)
    ? scene.subtitleLines.filter(
        (line): line is string => typeof line === 'string' && line.trim().length > 0
      )
    : undefined;

  return {
    id: String(scene.sceneNumber ?? Math.random()),
    sceneNumber: Number(scene.sceneNumber ?? 0),
    script: typeof scene.script === 'string' ? scene.script : '',
    description: typeof scene.description === 'string' ? scene.description : '',
    videoUrl: typeof scene.videoUrl === 'string' ? scene.videoUrl : undefined,
    imageUrls: images,
    voiceOverUrl: typeof scene.voiceOverUrl === 'string' ? scene.voiceOverUrl : undefined,
    voiceoverMeta: normalizeVoiceoverMeta(scene.voiceOverMeta ?? scene.voiceoverMeta),
    subtitleLines,
    referenceImage: typeof scene.referenceImage === 'string' ? scene.referenceImage : undefined,
    promptSummary: typeof scene.promptSummary === 'string' ? scene.promptSummary : undefined,
    promptPreview: typeof scene.promptPreview === 'string' ? scene.promptPreview : undefined,
    advancedOptions: normalizeAdvancedOptions(scene.advancedOptions),
  };
}

// Async confirmation and prompt helpers using Dialog components
interface ConfirmDialogState {
  open: boolean;
  message: string;
  resolve?: (value: boolean) => void;
}

interface PromptDialogState {
  open: boolean;
  message: string;
  defaultValue: string;
  resolve?: (value: string | null) => void;
}

function SceneTimeline({
  scenes,
  activeScene,
  onSelect,
}: {
  scenes: Scene[];
  activeScene: number | null;
  onSelect: (sceneNumber: number) => void;
}) {
  if (!Array.isArray(scenes) || scenes.length === 0) return null;

  const readyCount = scenes.filter(
    scene => typeof scene.videoUrl === 'string' && scene.videoUrl.length > 0
  ).length;

  return (
    <div className="rounded-2xl border border-primary/20 bg-muted/40 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-wide text-primary">
          Scene Timeline
        </div>
        <div className="text-xs text-muted-foreground">
          {readyCount}/{scenes.length} ready
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {scenes.map(scene => {
          const isActive = activeScene === scene.sceneNumber;
          const summarySource =
            scene.description && scene.description.trim().length > 0
              ? scene.description
              : scene.script;
          const summary = (summarySource || '').replace(/\s+/g, ' ').trim();
          const preview = summary.length > 140 ? `${summary.slice(0, 140)}…` : summary;
          const hasVideo = typeof scene.videoUrl === 'string' && scene.videoUrl.length > 0;
          const duration =
            typeof scene.advancedOptions?.duration === 'number'
              ? scene.advancedOptions.duration
              : undefined;
          const animationLabel = scene.advancedOptions?.animation?.style
            ? scene.advancedOptions.animation.style.replace(/_/g, ' ')
            : 'Static';
          const voiceoverUrl =
            scene.voiceOverUrl || scene.advancedOptions?.voice?.url || scene.voiceoverMeta?.url;
          const hasVoiceover = typeof voiceoverUrl === 'string' && voiceoverUrl.length > 0;
          const voiceoverLabel = hasVoiceover
            ? scene.voiceoverMeta?.voiceId || scene.advancedOptions?.voice?.voiceId || 'Voice ready'
            : 'Voiceover needed';

          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelect(scene.sceneNumber)}
              className={`flex min-w-[12rem] flex-1 flex-col rounded-xl border px-3 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isActive ? 'border-primary bg-background shadow-md ring-2 ring-primary/20' : 'border-transparent bg-primary/5 hover:bg-primary/10'}`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-primary">Scene {scene.sceneNumber}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${hasVideo ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {hasVideo ? 'Ready' : 'Needs video'}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {preview || 'No description yet.'}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>{duration ?? 5}s runtime</span>
                <span>{animationLabel}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={hasVideo ? 'font-semibold text-green-700' : 'text-amber-700'}>
                  {hasVideo ? 'Video ready' : 'Video pending'}
                </span>
                <span className={hasVoiceover ? 'font-semibold text-green-700' : 'text-amber-700'}>
                  {voiceoverLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VideoHubStepper({
  status,
  loading,
  error,
  onStepAction,
}: {
  status: VideoHubStatusData | null;
  loading: boolean;
  error?: string | null;
  onStepAction?: (key: NonNullable<VideoHubStatusData['nextAction']>['key']) => void;
}) {
  const activeKey = status?.nextAction?.key;
  const steps = [
    {
      key: 'script' as const,
      label: 'Script',
      ready: status?.scriptReady ?? false,
      detail: status?.scriptReady ? 'Narrative prepared' : 'Generate the video script.',
      actionLabel: 'Generate script',
    },
    {
      key: 'image' as const,
      label: 'Recipe Image',
      ready: status?.imageReady ?? false,
      detail: status?.imageReady ? 'Image ready for AI video' : 'Add a public recipe image.',
      actionLabel: 'Add image',
    },
    {
      key: 'scenes' as const,
      label: 'Scenes',
      ready: status?.scenesReady ?? false,
      detail:
        status?.sceneStats && status.sceneStats.total > 0
          ? `${status.sceneStats.videosReady}/${status.sceneStats.total} videos ready`
          : 'Split the script into scenes.',
      actionLabel: 'Split script',
    },
    {
      key: 'voice' as const,
      label: 'Voiceovers',
      ready: status?.voiceoverReady ?? false,
      detail:
        status?.sceneStats && status.sceneStats.total > 0
          ? `${status.sceneStats.voiceoversReady}/${status.sceneStats.total} narrated`
          : 'Generate narration for each scene.',
      actionLabel: 'Generate voiceovers',
    },
    {
      key: 'assets' as const,
      label: 'Assets',
      ready: status?.assetsReady ?? false,
      detail: `Videos ${status?.assetStats?.videos ?? 0} · Audio ${status?.assetStats?.audios ?? 0}`,
      actionLabel: 'Generate videos',
    },
    {
      key: 'share' as const,
      label: 'Share',
      ready: status?.shareReady ?? false,
      detail: status?.shareReady ? 'Ready to publish' : 'Post to Instagram when ready.',
      actionLabel: 'Share now',
    },
  ];

  return (
    <div className="mb-8 rounded-2xl border border-primary/20 bg-background/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold uppercase tracking-wide text-primary">
            Creation Checklist
          </h2>
          {status?.suggestions?.length ? (
            <p className="mt-1 text-xs text-muted-foreground">{status.suggestions[0]}</p>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {loading
            ? 'Updating…'
            : activeKey
              ? `Next: ${status?.nextAction?.label}`
              : 'All steps ready'}
        </div>
      </div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map(step => {
            const isActive = !step.ready && activeKey === step.key;
            const className = [
              'rounded-xl border px-3 py-3 transition-all',
              step.ready
                ? 'border-green-200 bg-green-50 shadow-sm'
                : 'border-primary/30 bg-primary/5 shadow-sm',
              isActive ? 'ring-1 ring-primary/50' : 'opacity-100',
            ].join(' ');
            return (
              <div key={step.key} className={className}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">{step.label}</span>
                  <span
                    className={`text-[11px] font-semibold uppercase ${step.ready ? 'text-green-700' : 'text-amber-700'}`}
                  >
                    {step.ready ? 'Ready' : 'Pending'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{step.detail}</p>
                {!step.ready && onStepAction ? (
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                    onClick={() => onStepAction(step.key)}
                  >
                    {step.actionLabel}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VideoHubPage() {
  // Runway model selection state
  const [selectedModel, setSelectedModel] = useState<RunwayModel>('gen4_turbo');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoScripts, setVideoScripts] = useState<VideoScriptDoc[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<{ [recipeId: string]: boolean }>({});
  const [error, setError] = useState<{ [recipeId: string]: string | null }>({});
  const [statusData, setStatusData] = useState<VideoHubStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Video preview modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoModalLoading, setVideoModalLoading] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [promptModalInitial, setPromptModalInitial] = useState<string | undefined>(undefined);
  const [promptModalSettings, setPromptModalSettings] = useState<
    { ratio?: string; duration?: number } | undefined
  >(undefined);
  const [pendingGenerateMode, setPendingGenerateMode] = useState<'single' | 'multi' | null>(null);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);

  // Polling helper
  const pollRunwayTask = useCallback(
    async (
      taskId: string,
      onProgress: (progress: number, status?: string, output?: unknown) => void
    ) => {
      try {
        const { checkRunwayTaskStatusAction } = await import('@/app/actions');
        let lastProgress = -1;
        for (let i = 0; i < 60; i++) {
          // poll up to ~5 minutes (60 * 5s)
          const res = await checkRunwayTaskStatusAction(taskId);
          if (!res.success) break;
          const prog =
            typeof res.progress === 'number'
              ? res.progress
              : ((res.output as { progress?: number })?.progress ?? 0);
          if (prog !== lastProgress) {
            onProgress(prog, res.status, res.output);
            lastProgress = prog;
          }
          if (
            res.status === 'succeeded' ||
            res.status === 'failed' ||
            (res.output && (res.output as { length?: number }).length)
          )
            return res;
          await new Promise(r => setTimeout(r, 5000));
        }
      } catch (_err) {
        showNotification((_err as Error).message || 'Save failed', 'error');
      }
      return null;
    },
    []
  );

  const [videoModalError, setVideoModalError] = useState<string | undefined>();
  const [videoVideoUrl, setVideoVideoUrl] = useState<string | undefined>();
  const [videoImageUrl, setVideoImageUrl] = useState<string | undefined>();

  // CapCut modal state
  const [capCutModalOpen, setCapCutModalOpen] = useState(false);
  const [selectedRecipeForCapCut, setSelectedRecipeForCapCut] = useState<Recipe | null>(null);

  // Multi-scene video state
  const [multiSceneModalOpen, setMultiSceneModalOpen] = useState(false);
  const [multiSceneLoading, setMultiSceneLoading] = useState(false);
  const [multiSceneError, setMultiSceneError] = useState<string | undefined>();
  // Multi-scene video data type
  interface MultiSceneVideoData {
    success: boolean;
    sceneVideos?: Array<{ sceneNumber: number; videoUrl: string; script: string }>;
    combinedInstructions?: string;
    error?: string;
  }

  const [multiSceneData, setMultiSceneData] = useState<MultiSceneVideoData | null>(null);

  // Dialog state for confirm/prompt replacements
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    message: '',
    resolve: undefined,
  });
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>({
    open: false,
    message: '',
    defaultValue: '',
    resolve: undefined,
  });

  // Helper functions for confirm and prompt dialogs
  const showConfirmDialog = (message: string): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setConfirmDialog({
        open: true,
        message,
        resolve,
      });
    });
  };

  const showPromptDialog = (message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise<string | null>(resolve => {
      setPromptDialog({
        open: true,
        message,
        defaultValue,
        resolve,
      });
    });
  };

  const handleConfirmClose = (confirmed: boolean) => {
    if (confirmDialog.resolve) {
      confirmDialog.resolve(confirmed);
    }
    setConfirmDialog({ open: false, message: '', resolve: undefined });
  };

  const handlePromptClose = (value: string | null) => {
    if (promptDialog.resolve) {
      promptDialog.resolve(value);
    }
    setPromptDialog({ open: false, message: '', defaultValue: '', resolve: undefined });
  };

  type VideoHubAsset = {
    id: string;
    recipeId: string;
    type: 'video' | 'audio' | 'image';
    url: string;
    sceneNumber?: number | null;
    source?: string | null;
    storagePath?: string | null;
    model?: string | null;
    ratio?: string | null;
    duration?: number | null;
    voiceId?: string | null;
    prompt?: string | null;
    taskId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  const [sceneEditorScenes, setSceneEditorScenes] = useState<Scene[]>([]);
  const [sceneEditorDirty, setSceneEditorDirty] = useState(false);
  const [reorderEnabled, setReorderEnabled] = useState(false);
  const [sceneCount, setSceneCount] = useState(3);
  const [splitScenes, setSplitScenes] = useState<Scene[]>([]);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitError, setSplitError] = useState<string | undefined>();
  const [showSceneSections, setShowSceneSections] = useState(true);
  const [currentRecipeId, setCurrentRecipeId] = useState<string>('');
  const [combinedVideos, setCombinedVideos] = useState<{
    [recipeId: string]: { url: string; duration?: number; fileSize?: number };
  }>({});
  const [multiSceneDoc, setMultiSceneDoc] = useState<{
    recipeId: string;
    scenes: Scene[];
    sceneVideos: Scene[];
    combinedVideo?: {
      url: string;
      duration?: number;
      fileSize?: number;
      processingMethod?: string;
      generatedAt?: Date | string | number;
      instructions?: string | null;
    };
    combinedInstructions?: string;
  } | null>(null);
  const [activeSceneNumber, setActiveSceneNumber] = useState<number | null>(null);

  const [audioPreview, setAudioPreview] = useState<{ url: string; generatedAt: number } | null>(
    null
  );
  const [audioPreviewLoading, setAudioPreviewLoading] = useState(false);
  const [assetLibrary, setAssetLibrary] = useState<VideoHubAsset[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [voiceoverBatchGenerating, setVoiceoverBatchGenerating] = useState(false);
  const [voiceoverBatchProgress, setVoiceoverBatchProgress] = useState(0);
  const [voiceoverBatchTotal, setVoiceoverBatchTotal] = useState(0);

  // Instagram video posting state
  const [instagramPosting, setInstagramPosting] = useState(false);

  // Audio options state
  const [audioOptions, setAudioOptions] = useState({
    voiceOver: {
      enabled: false,
      text: '',
      voice: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice
    },
    backgroundMusic: {
      enabled: false,
      genre: 'upbeat',
      volume: 0.3,
    },
  });
  const [showAudioOptions, setShowAudioOptions] = useState(false);

  // Advanced scripting state
  const [advancedOptions, setAdvancedOptions] = useState({
    transitions: {
      enabled: true,
      type: 'fade',
      duration: 0.5,
    },
    timing: {
      sceneDuration: 5,
      totalDuration: 30,
    },
    effects: {
      textOverlays: true,
      backgroundMusic: false,
      colorGrading: 'warm',
    },
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const fetchAssets = useCallback(async (recipeId: string) => {
    const { getVideoHubAssetsAction } = await import('@/app/actions');
    const response = await getVideoHubAssetsAction(recipeId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to load assets.');
    }
    return response.assets ?? [];
  }, []);

  const refreshAssets = useCallback(
    async (recipeIdOverride?: string) => {
      const targetId = recipeIdOverride || currentRecipeId;
      if (!targetId) return;
      setAssetLoading(true);
      setAssetError(null);
      try {
        const assets = await fetchAssets(targetId);
        setAssetLibrary(assets);
      } catch (err) {
        setAssetError((err as Error).message || 'Failed to load assets.');
      } finally {
        setAssetLoading(false);
      }
    },
    [currentRecipeId, fetchAssets]
  );

  const refreshStatus = useCallback(
    async (recipeIdOverride?: string) => {
      const targetId = recipeIdOverride || currentRecipeId;
      if (!targetId) {
        setStatusData(null);
        return;
      }
      setStatusLoading(true);
      setStatusError(null);
      try {
        const { getVideoHubStatusAction } = await import('@/app/actions');
        const res = await getVideoHubStatusAction(targetId);
        if (!res.success) {
          setStatusError(res.error || 'Failed to load status');
          setStatusData(null);
        } else {
          setStatusData(res.data ?? null);
        }
      } catch (err) {
        setStatusError((err as Error).message || 'Failed to load status');
        setStatusData(null);
      } finally {
        setStatusLoading(false);
      }
    },
    [currentRecipeId]
  );

  const refreshData = useCallback(() => {
    setLoading(true);
    Promise.all([fetchAllVideoScripts(), getAllRecipes()]).then(([scripts, recipeList]) => {
      setVideoScripts(scripts);
      setRecipes(recipeList);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const runGenerateScript = useCallback(
    async (recipeId: string) => {
      setGenerating(prev => ({ ...prev, [recipeId]: true }));
      setError(prev => ({ ...prev, [recipeId]: null }));
      try {
        const { generateAndSaveVideoScriptForRecipe } = await import('@/app/actions');
        const res = await generateAndSaveVideoScriptForRecipe(recipeId);
        if (!res.success) {
          const message = res.error || 'Failed to generate script';
          setError(prev => ({ ...prev, [recipeId]: message }));
          showNotification(message, 'error');
        } else {
          showNotification('Video script generated!', 'success');
          refreshData();
          await refreshStatus(recipeId);
        }
      } catch (err) {
        const message = (err as Error).message || 'Unknown error';
        setError(prev => ({ ...prev, [recipeId]: message }));
        showNotification(message, 'error');
      } finally {
        setGenerating(prev => ({ ...prev, [recipeId]: false }));
      }
    },
    [refreshData, refreshStatus]
  );

  const scrollSceneIntoView = useCallback((sceneNumber: number) => {
    if (typeof document === 'undefined') return;
    const target = document.querySelector(`[data-scene-number="${sceneNumber}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }
  }, []);

  const handleBatchVoiceoverGenerate = useCallback(async () => {
    if (voiceoverBatchGenerating) return;
    if (!currentRecipeId) {
      showNotification('Select a recipe first.', 'info');
      return;
    }

    const targets = sceneEditorScenes.filter(scene => {
      const voiceUrl =
        scene.voiceOverUrl || scene.advancedOptions?.voice?.url || scene.voiceoverMeta?.url;
      if (voiceUrl) return false;
      const sourceText = scene.advancedOptions?.voice?.text || scene.description || scene.script;
      return Boolean(sourceText && sourceText.trim().length > 0);
    });

    if (targets.length === 0) {
      showNotification('All scenes already have voiceovers.', 'success');
      return;
    }

    setVoiceoverBatchGenerating(true);
    setVoiceoverBatchProgress(0);
    setVoiceoverBatchTotal(targets.length);

    try {
      const { generateVoiceOverAction, markSceneVoiceOverAction } = await import('@/app/actions');
      for (let index = 0; index < targets.length; index += 1) {
        const scene = targets[index];
        const sourceText = (
          scene.advancedOptions?.voice?.text ||
          scene.description ||
          scene.script ||
          ''
        ).trim();
        if (!sourceText) {
          showNotification(`Scene ${scene.sceneNumber} has no text for narration.`, 'info');
          setVoiceoverBatchProgress(index + 1);
          continue;
        }

        try {
          const result = await generateVoiceOverAction(
            sourceText,
            scene.advancedOptions?.voice?.voiceId,
            {
              recipeId: currentRecipeId,
              sceneNumber: scene.sceneNumber,
              context: 'voiceover-batch',
            }
          );

          if (!result.success || !result.url) {
            showNotification(
              result.error || `Voiceover failed for scene ${scene.sceneNumber}`,
              'error'
            );
          } else {
            await markSceneVoiceOverAction(
              currentRecipeId,
              scene.sceneNumber,
              result.url,
              result.metadata
            );
            setSceneEditorScenes(prev => {
              const updated = prev.map(existing => {
                if (existing.sceneNumber !== scene.sceneNumber) return existing;
                return {
                  ...existing,
                  voiceOverUrl: result.url,
                  voiceoverMeta: result.metadata
                    ? { ...result.metadata, url: result.url }
                    : existing.voiceoverMeta,
                  advancedOptions: {
                    ...(existing.advancedOptions || {}),
                    voice: {
                      ...(existing.advancedOptions?.voice || {}),
                      enabled: existing.advancedOptions?.voice?.enabled ?? true,
                      url: result.url,
                    },
                  },
                };
              });
              return updated;
            });
            setSceneEditorDirty(true);
          }
        } catch (voiceErr) {
          showNotification(
            (voiceErr as Error).message || `Voiceover failed for scene ${scene.sceneNumber}`,
            'error'
          );
        }

        setVoiceoverBatchProgress(index + 1);
      }

      await refreshAssets(currentRecipeId);
      await refreshStatus(currentRecipeId);
      showNotification('Voiceovers updated!', 'success');
    } finally {
      setVoiceoverBatchGenerating(false);
      setVoiceoverBatchProgress(0);
      setVoiceoverBatchTotal(0);
    }
  }, [currentRecipeId, refreshAssets, refreshStatus, sceneEditorScenes, voiceoverBatchGenerating]);

  const handleStepperAction = useCallback(
    async (key: NonNullable<VideoHubStatusData['nextAction']>['key']) => {
      const recipe = recipes[currentIndex];
      if (!recipe) return;

      switch (key) {
        case 'script':
          await runGenerateScript(recipe.id);
          break;
        case 'image':
          showNotification(
            'Open the recipe editor to add an image. We will open the recipe in a new tab.',
            'info'
          );
          if (typeof window !== 'undefined') {
            window.open(`/recipes/${recipe.id}`, '_blank');
          }
          break;
        case 'scenes':
          setShowSceneSections(true);
          if (sceneEditorScenes.length > 0) {
            scrollSceneIntoView(sceneEditorScenes[0].sceneNumber);
          }
          showNotification('Use “Split Script into Scenes” to break the story into clips.', 'info');
          break;
        case 'voice':
          if (voiceoverBatchGenerating) {
            showNotification('Voiceover generation already running.', 'info');
            return;
          }
          await handleBatchVoiceoverGenerate();
          break;
        case 'assets':
          if (!recipe.imageUrl || recipe.imageUrl.startsWith('data:')) {
            showNotification('Add a public recipe image before generating video assets.', 'error');
            return;
          }
          try {
            const { generateRecipeVideoAction } = await import('@/app/actions');
            const preview = await generateRecipeVideoAction(recipe.id, selectedModel, {
              previewOnly: true,
            });
            if (!preview.success) {
              showNotification(preview.error || 'Failed to prepare prompt', 'error');
              return;
            }
            setPromptModalInitial(preview.promptText);
            setPromptModalSettings({
              ratio: preview.settings?.ratio,
              duration: preview.settings?.duration,
            });
            setPendingGenerateMode('single');
            setPendingRecipeId(recipe.id);
            setPromptModalOpen(true);
          } catch (assetErr) {
            showNotification((assetErr as Error).message || 'Failed to prepare generator', 'error');
          }
          break;
        case 'share':
          showNotification(
            'Scroll to the Asset Library to post your finished video to Instagram.',
            'info'
          );
          break;
        default:
          break;
      }
    },
    [
      currentIndex,
      handleBatchVoiceoverGenerate,
      recipes,
      runGenerateScript,
      sceneEditorScenes,
      scrollSceneIntoView,
      selectedModel,
      voiceoverBatchGenerating,
    ]
  );

  const handleCopyMarketingIdea = useCallback(async (idea: string, recipeTitle: string) => {
    try {
      const caption = `${recipeTitle}\n\n${idea}`.trim();
      if (!navigator?.clipboard?.writeText) throw new Error('Clipboard access unavailable');
      await navigator.clipboard.writeText(caption);
      showNotification('Idea copied to clipboard!', 'success');
    } catch (copyErr) {
      showNotification((copyErr as Error).message || 'Failed to copy idea', 'error');
    }
  }, []);

  const handlePlanMarketingIdea = useCallback(
    async (idea: string, recipeTitle: string) => {
      showNotification(
        'Planning flow coming soon. Idea copied so you can paste it into your calendar.',
        'info'
      );
      try {
        await handleCopyMarketingIdea(idea, recipeTitle);
      } catch {
        /* copy handled above */
      }
    },
    [handleCopyMarketingIdea]
  );

  useEffect(() => {
    if (!currentRecipeId) {
      setAssetLibrary([]);
      return;
    }
    let cancelled = false;
    setAssetLoading(true);
    setAssetError(null);
    (async () => {
      try {
        const assets = await fetchAssets(currentRecipeId);
        if (!cancelled) {
          setAssetLibrary(assets);
        }
      } catch (err) {
        if (!cancelled) {
          setAssetError((err as Error).message || 'Failed to load assets.');
        }
      } finally {
        if (!cancelled) {
          setAssetLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentRecipeId, fetchAssets]);

  useEffect(() => {
    if (!currentRecipeId) {
      setStatusData(null);
      setStatusError(null);
      return;
    }
    void refreshStatus(currentRecipeId);
  }, [currentRecipeId, refreshStatus]);

  const groupedAssets = useMemo(() => {
    const videos = assetLibrary.filter(asset => asset.type === 'video');
    const images = assetLibrary.filter(asset => asset.type === 'image');
    const audios = assetLibrary.filter(asset => asset.type === 'audio');
    return { videos, images, audios };
  }, [assetLibrary]);

  const missingVoiceoverCount = useMemo(() => {
    return sceneEditorScenes.filter(scene => {
      const voiceUrl =
        scene.voiceOverUrl || scene.advancedOptions?.voice?.url || scene.voiceoverMeta?.url;
      if (voiceUrl) return false;
      const sourceText = scene.advancedOptions?.voice?.text || scene.description || scene.script;
      return Boolean(sourceText && sourceText.trim().length > 0);
    }).length;
  }, [sceneEditorScenes]);

  const handleCopyAssetUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showNotification('Asset URL copied to clipboard', 'success');
    } catch (err) {
      console.warn('Failed to copy asset URL:', err instanceof Error ? err.message : err);
      showNotification('Failed to copy asset URL', 'error');
    }
  }, []);

  const formatAssetTimestamp = useCallback((value?: string | null) => {
    if (!value) return 'Unknown';
    try {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
    } catch {
      return value;
    }
  }, []);

  const handlePromptConfirm = useCallback(
    async (editedPrompt: string, settings: { ratio?: string; duration?: number }) => {
      if (!pendingRecipeId || !pendingGenerateMode) return;

      if (pendingGenerateMode === 'single') {
        setVideoModalOpen(true);
        setVideoModalLoading(true);
        setVideoModalError(undefined);
        setVideoVideoUrl(undefined);
        setVideoImageUrl(undefined);
        try {
          const { generateRecipeVideoAction } = await import('@/app/actions');
          const res = await generateRecipeVideoAction(pendingRecipeId, selectedModel, {
            previewOnly: false,
            ratio: settings.ratio,
            duration: settings.duration,
            promptOverride: editedPrompt,
          });

          if (res.success) {
            if (res.taskId) {
              await pollRunwayTask(res.taskId, () => {
                setVideoModalLoading(true);
              });
            }
            if (res.videoUrl) setVideoVideoUrl(res.videoUrl);
            if (res.imageUrl) setVideoImageUrl(res.imageUrl);
            await refreshAssets(pendingRecipeId);
            await refreshStatus(pendingRecipeId);
          } else {
            setVideoModalError(res.error || 'Generation failed');
          }
        } catch (err) {
          setVideoModalError((err as Error).message || 'Unknown error');
        } finally {
          setVideoModalLoading(false);
          setPendingGenerateMode(null);
          setPendingRecipeId(null);
        }
      }

      if (pendingGenerateMode === 'multi') {
        setMultiSceneModalOpen(true);
        setMultiSceneLoading(true);
        setMultiSceneError(undefined);
        try {
          const { generateMultiSceneVideoForRecipe } = await import('@/app/actions');
          const res = await generateMultiSceneVideoForRecipe(pendingRecipeId, selectedModel, {
            defaultDuration: settings.duration,
            ratio: settings.ratio,
          });

          if (res.success) {
            setMultiSceneData(res as MultiSceneVideoData);
            if (res.sceneVideos && res.sceneVideos.length > 0) {
              const baseScenes =
                multiSceneDoc && multiSceneDoc.recipeId === pendingRecipeId
                  ? multiSceneDoc.scenes
                  : [];
              const mappedScenes = res.sceneVideos.map(scene => {
                const base = baseScenes?.find?.(entry => entry.sceneNumber === scene.sceneNumber);
                return {
                  id: String(scene.sceneNumber),
                  sceneNumber: scene.sceneNumber,
                  script: scene.script,
                  description: base?.description || '',
                  videoUrl: scene.videoUrl,
                  imageUrls: base?.imageUrls || [],
                  advancedOptions: base?.advancedOptions,
                } as Scene;
              });
              setSceneEditorScenes(mappedScenes);
              setSceneEditorDirty(true);
            }
            await refreshAssets(pendingRecipeId);
            await refreshStatus(pendingRecipeId);
          } else {
            setMultiSceneError(res.error || 'Multi-scene generation failed');
          }
        } catch (err) {
          setMultiSceneError((err as Error).message || 'Unknown error');
        } finally {
          setMultiSceneLoading(false);
          setPendingGenerateMode(null);
          setPendingRecipeId(null);
        }
      }
    },
    [
      multiSceneDoc,
      pendingGenerateMode,
      pendingRecipeId,
      pollRunwayTask,
      refreshAssets,
      refreshStatus,
      selectedModel,
    ]
  );

  useEffect(() => {
    if (!multiSceneModalOpen && splitScenes.length > 0) {
      setSceneEditorScenes(splitScenes);
      setSceneEditorDirty(false);
    }
  }, [multiSceneModalOpen, splitScenes]);

  useEffect(() => {
    if (sceneEditorScenes.length === 0) {
      setActiveSceneNumber(null);
      return;
    }
    if (
      !activeSceneNumber ||
      !sceneEditorScenes.some(scene => scene.sceneNumber === activeSceneNumber)
    ) {
      setActiveSceneNumber(sceneEditorScenes[0].sceneNumber);
    }
  }, [sceneEditorScenes, activeSceneNumber]);

  useEffect(() => {
    const recipe = recipes[currentIndex];
    if (!recipe) {
      setMultiSceneDoc(null);
      return;
    }

    let active = true;
    setCurrentRecipeId(recipe.id);

    (async () => {
      try {
        const { getMultiSceneVideoDataAction } = await import('@/app/actions');
        const res = await getMultiSceneVideoDataAction(recipe.id);
        if (!active) return;

        if (res.success && res.data) {
          const baseScenes: Scene[] = (res.data.scenes || []).map((rawScene: SplitScene) => {
            const mapped = mapSplitSceneToClient(rawScene);
            return {
              ...mapped,
              videoUrl: undefined,
            };
          });

          const baseSceneMap = new Map<number, Scene>(
            baseScenes.map(scene => [scene.sceneNumber, scene])
          );
          const videoMap = new Map<
            number,
            {
              script: string;
              videoUrl?: string;
              duration?: number;
              runwaySettings?: Record<string, unknown>;
            }
          >();
          for (const video of res.data.sceneVideos || []) {
            videoMap.set(video.sceneNumber, {
              script: video.script,
              videoUrl: video.videoUrl,
              duration: video.duration,
              runwaySettings: video.runwaySettings,
            });
          }

          const mergedScenes: Scene[] = baseScenes.map(scene => {
            const video = videoMap.get(scene.sceneNumber);
            return {
              ...scene,
              script: video?.script || scene.script,
              videoUrl: video?.videoUrl || scene.videoUrl,
            };
          });

          for (const [sceneNumber, video] of videoMap.entries()) {
            if (!baseSceneMap.has(sceneNumber)) {
              mergedScenes.push({
                id: String(sceneNumber),
                sceneNumber,
                script: video.script,
                description: '',
                videoUrl: video.videoUrl,
                imageUrls: [],
              });
            }
          }

          const combinedInstructions =
            res.data.combinedInstructions ?? res.data.combinedVideo?.instructions ?? undefined;
          const combinedMeta = res.data.combinedVideo
            ? {
                url: res.data.combinedVideo.url,
                duration: res.data.combinedVideo.duration,
                fileSize: res.data.combinedVideo.fileSize,
                processingMethod: res.data.combinedVideo.processingMethod,
                generatedAt: res.data.combinedVideo.generatedAt ?? Date.now(),
                instructions: combinedInstructions ?? res.data.combinedVideo.instructions ?? null,
              }
            : undefined;

          setMultiSceneDoc({
            recipeId: recipe.id,
            scenes: baseScenes,
            sceneVideos: mergedScenes,
            combinedVideo: combinedMeta,
            combinedInstructions,
          });

          if (combinedMeta?.url) {
            setCombinedVideos(prev => ({
              ...prev,
              [recipe.id]: {
                url: combinedMeta.url,
                duration: combinedMeta.duration,
                fileSize: combinedMeta.fileSize,
              },
            }));
          } else {
            setCombinedVideos(prev => {
              if (!prev[recipe.id]) return prev;
              const next = { ...prev };
              delete next[recipe.id];
              return next;
            });
          }

          if (!multiSceneLoading) {
            if (mergedScenes.some(scene => !!scene.videoUrl)) {
              setMultiSceneData({
                success: true,
                sceneVideos: mergedScenes
                  .filter(scene => !!scene.videoUrl)
                  .map(scene => ({
                    sceneNumber: scene.sceneNumber,
                    videoUrl: scene.videoUrl as string,
                    script: scene.script,
                  })),
                combinedInstructions,
              });
            } else if (combinedInstructions) {
              setMultiSceneData({ success: true, sceneVideos: [], combinedInstructions });
            } else {
              setMultiSceneData(null);
            }
          }
        } else {
          setMultiSceneDoc({ recipeId: recipe.id, scenes: [], sceneVideos: [] });
          setCombinedVideos(prev => {
            if (!prev[recipe.id]) return prev;
            const next = { ...prev };
            delete next[recipe.id];
            return next;
          });
          if (!multiSceneLoading) setMultiSceneData(null);
        }
      } catch (err) {
        if (active) {
          console.warn('Failed to load multi-scene metadata', err);
          setMultiSceneDoc({ recipeId: recipe.id, scenes: [], sceneVideos: [] });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [recipes, currentIndex, multiSceneLoading]);

  // When scripts and recipes load, auto-fetch split scenes for the current recipe if enabled
  useEffect(() => {
    (async () => {
      try {
        if (!showSceneSections) return;
        const recipe = recipes[currentIndex];
        if (!recipe) return;
        const vs = scriptMap.get(recipe.id);
        if (!vs || !vs.script) return;
        setSplitLoading(true);
        setCurrentRecipeId(recipe.id);
        const { getSplitScenesForRecipeAction } = await import('@/app/actions');
        const res = await getSplitScenesForRecipeAction(recipe.id);
        if (res.success) {
          const mapped = (res.scenes || []).map((s: SplitScene) => mapSplitSceneToClient(s));
          setSplitScenes(mapped);
          setSceneEditorScenes(mapped);
        }
      } catch {
        // ignore - user can manually split
      } finally {
        setSplitLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSceneSections, recipes, videoScripts, currentIndex]);

  // Map video scripts by recipeId for fast lookup
  const scriptMap = new Map(videoScripts.map(vs => [vs.recipeId, vs]));

  return (
    <main className="container mx-auto px-4 py-12 duration-500 animate-in fade-in">
      <header className="mb-8 text-center">
        <h1 className="mb-4 font-headline text-4xl font-bold text-primary md:text-5xl">
          Video Hub
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Discover short-form video content generated from our recipes. See scripts, previews, and
          shareable content for Instagram and TikTok Reels.
        </p>
      </header>
      <div className="mb-8 flex justify-center">
        <RecipeListModal />
      </div>
      <VideoHubStepper
        status={statusData}
        loading={statusLoading}
        error={statusError}
        onStepAction={handleStepperAction}
      />
      <section>
        {loading ? (
          <div>Loading video content...</div>
        ) : recipes.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-muted-foreground">
            No recipes found. Add a recipe to get started!
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-7xl flex-row items-center justify-center">
            <div className="relative flex w-full justify-center">
              {(() => {
                const recipe = recipes[currentIndex];
                const vs = scriptMap.get(recipe.id);
                return (
                  <div
                    key={recipe.id}
                    className="relative flex w-full min-w-[320px] max-w-7xl flex-col gap-6 rounded-2xl border-2 border-primary/30 bg-background p-10 shadow-xl transition-all duration-300"
                  >
                    {/* Navigation Buttons and Title Row */}
                    {/* Runway Model Selection Dropdown */}
                    <div className="mb-4">
                      <label
                        htmlFor="runway-model-select"
                        className="mb-1 block text-sm font-semibold text-primary"
                      >
                        Runway Model for Video Generation:
                      </label>
                      <select
                        id="runway-model-select"
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value as RunwayModel)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        title="Select Runway ML model"
                      >
                        {RUNWAY_MODELS.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} – {model.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-6 flex w-full flex-row items-center justify-between">
                      <button
                        className="btn btn-primary z-10 h-16 w-16 rounded-full text-3xl font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/60"
                        onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                        disabled={currentIndex === 0}
                        aria-label="Previous script"
                      >
                        &#8592;
                      </button>
                      <div className="flex flex-1 justify-center">
                        <a
                          href={`/recipes/${recipe.id}`}
                          className="block text-center text-2xl font-bold text-primary underline hover:text-primary/80 md:text-3xl lg:text-4xl"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {recipe.title}
                        </a>
                      </div>
                      <button
                        className="btn btn-primary z-10 h-16 w-16 rounded-full text-3xl font-bold shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/60"
                        onClick={() => setCurrentIndex(i => Math.min(recipes.length - 1, i + 1))}
                        disabled={currentIndex === recipes.length - 1}
                        aria-label="Next script"
                      >
                        &#8594;
                      </button>
                    </div>
                    <div className="mb-2 text-xs text-muted-foreground">By {recipe.author}</div>

                    {/* Recipe Image Preview */}
                    {recipe.imageUrl ? (
                      <div className="mb-4">
                        <div className="mb-2 text-sm font-semibold text-primary">
                          Recipe Image (for video generation):
                        </div>
                        <div className="relative mx-auto max-w-md overflow-hidden rounded-lg border-2 border-primary/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            className="h-auto max-h-64 w-full object-cover"
                          />
                        </div>
                        <div className="mx-auto mt-1 max-w-md truncate text-center text-xs text-muted-foreground">
                          {recipe.imageUrl.startsWith('data:') ? (
                            <span className="text-yellow-600">
                              ⚠️ Data URI - may not work with Runway ML (upload to storage needed)
                            </span>
                          ) : recipe.imageUrl.includes('firebasestorage') ||
                            recipe.imageUrl.includes('unsplash') ||
                            recipe.imageUrl.includes('googleapis') ? (
                            <span className="text-green-600">
                              ✅ Valid public URL - Ready for Runway ML
                            </span>
                          ) : (
                            <span className="text-blue-600">🔗 External URL</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
                        <div className="mb-1 font-semibold text-yellow-700">⚠️ No Recipe Image</div>
                        <div className="text-xs text-yellow-600">
                          This recipe needs an image for video generation.
                          <br />
                          Please add an image to the recipe first.
                        </div>
                      </div>
                    )}

                    {vs && vs.script && vs.script.trim() !== '' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="mb-1 text-base font-bold">Video Script</div>
                          <div>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={showSceneSections}
                                onChange={async e => {
                                  const show = e.target.checked;
                                  setShowSceneSections(show);
                                  if (show) {
                                    setSplitLoading(true);
                                    setSplitError(undefined);
                                    try {
                                      setCurrentRecipeId(recipe.id);
                                      const { getSplitScenesForRecipeAction } = await import(
                                        '@/app/actions'
                                      );
                                      const res = await getSplitScenesForRecipeAction(recipe.id);
                                      if (res.success) {
                                        const mapped = (res.scenes || []).map((s: SplitScene) =>
                                          mapSplitSceneToClient(s)
                                        );
                                        setSplitScenes(mapped);
                                        setSceneEditorScenes(mapped);
                                      } else {
                                        setSplitError(res.error || 'Failed to load scenes');
                                      }
                                    } catch (err) {
                                      setSplitError(
                                        (err as Error).message || 'Failed to load scenes'
                                      );
                                    } finally {
                                      setSplitLoading(false);
                                    }
                                  }
                                }}
                              />
                              <span className="text-xs">Show Scene Sections (default)</span>
                            </label>
                          </div>
                        </div>
                        {/* By default show scenes - only show full script when toggle off */}
                        {!showSceneSections && (
                          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-sm">
                            {vs.script}
                          </pre>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            className="btn btn-outline"
                            onClick={async () => {
                              if (!showSceneSections) {
                                setSplitLoading(true);
                                setSplitError(undefined);
                                try {
                                  setCurrentRecipeId(recipe.id);
                                  // Use server action to avoid client permission errors
                                  const { getSplitScenesForRecipeAction } = await import(
                                    '@/app/actions'
                                  );
                                  const res = await getSplitScenesForRecipeAction(recipe.id);
                                  if (res.success) {
                                    const mapped = (res.scenes || []).map((s: SplitScene) =>
                                      mapSplitSceneToClient(s)
                                    );
                                    setSplitScenes(mapped);
                                    setSceneEditorScenes(mapped);
                                  } else {
                                    setSplitError(res.error || 'Failed to load scenes');
                                  }
                                  setShowSceneSections(true);
                                  setSceneEditorDirty(false);
                                } catch (err) {
                                  setSplitError((err as Error).message || 'Failed to load scenes');
                                } finally {
                                  setSplitLoading(false);
                                }
                              } else {
                                setShowSceneSections(false);
                              }
                            }}
                          >
                            {showSceneSections ? 'Hide Scene Sections' : 'Show Scene Sections'}
                          </button>

                          <button
                            className="btn btn-secondary"
                            onClick={async () => {
                              setSplitLoading(true);
                              setSplitError(undefined);
                              try {
                                const { splitMainScriptIntoScenesAction } = await import(
                                  '@/app/actions'
                                );
                                const res = await splitMainScriptIntoScenesAction(
                                  recipe.id,
                                  sceneCount
                                );
                                if (!res.success) {
                                  setSplitError(res.error || 'Failed to split script');
                                } else {
                                  const { getSplitScenesForRecipeAction } = await import(
                                    '@/app/actions'
                                  );
                                  const result = await getSplitScenesForRecipeAction(recipe.id);
                                  if (result.success) {
                                    const mapped = (result.scenes || []).map((s: SplitScene) =>
                                      mapSplitSceneToClient(s)
                                    );
                                    setSplitScenes(mapped);
                                    setSceneEditorScenes(mapped);
                                    setShowSceneSections(true);
                                    setSceneEditorDirty(true);
                                    setCurrentRecipeId(recipe.id);
                                    await refreshStatus(recipe.id);
                                  } else {
                                    setSplitError(result.error || 'Failed to load split scenes');
                                  }
                                }
                              } catch (err) {
                                setSplitError((err as Error).message || 'Unknown error');
                              } finally {
                                setSplitLoading(false);
                              }
                            }}
                          >
                            Split Script into Scenes
                          </button>
                        </div>
                        {splitLoading && (
                          <div className="text-sm text-muted-foreground">Loading scenes...</div>
                        )}
                        {splitError && <div className="text-sm text-red-600">{splitError}</div>}
                        {showSceneSections && (
                          <div className="mt-4 space-y-4">
                            <SceneTimeline
                              scenes={sceneEditorScenes}
                              activeScene={activeSceneNumber}
                              onSelect={sceneNumber => {
                                setActiveSceneNumber(sceneNumber);
                                scrollSceneIntoView(sceneNumber);
                              }}
                            />
                            {missingVoiceoverCount > 0 && (
                              <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm">
                                <div className="text-muted-foreground">
                                  {voiceoverBatchGenerating
                                    ? `Generating voiceovers… (${voiceoverBatchProgress}/${voiceoverBatchTotal || missingVoiceoverCount})`
                                    : `${missingVoiceoverCount} scene${missingVoiceoverCount === 1 ? '' : 's'} still need narration.`}
                                </div>
                                <button
                                  type="button"
                                  className={`btn btn-xs btn-secondary ${voiceoverBatchGenerating ? 'pointer-events-none opacity-60' : ''}`}
                                  onClick={() => {
                                    void handleBatchVoiceoverGenerate();
                                  }}
                                  disabled={voiceoverBatchGenerating}
                                >
                                  {voiceoverBatchGenerating
                                    ? 'Generating…'
                                    : 'Auto-generate voiceovers'}
                                </button>
                              </div>
                            )}
                            <SceneEditor
                              scenes={sceneEditorScenes}
                              onChange={scenes => {
                                setSceneEditorScenes(scenes);
                                setSceneEditorDirty(true);
                              }}
                              editable={true}
                              recipeId={recipe.id}
                              reorderEnabled={reorderEnabled}
                              onAssetGenerated={() => {
                                void refreshAssets(recipe.id);
                                void refreshStatus(recipe.id);
                              }}
                              activeSceneNumber={activeSceneNumber}
                              onSceneFocus={sceneNumber => setActiveSceneNumber(sceneNumber)}
                            />
                            <div className="flex gap-2">
                              <button
                                className={`btn btn-primary ${!sceneEditorDirty ? 'pointer-events-none opacity-60' : ''}`}
                                onClick={async () => {
                                  if (!recipe.id) return;
                                  try {
                                    const { saveMultiSceneVideoScenesAction } = await import(
                                      '@/app/actions'
                                    );
                                    const payload = sceneEditorScenes.map(s => ({
                                      id: s.id,
                                      sceneNumber: s.sceneNumber,
                                      script: s.script,
                                      description: s.description,
                                      videoUrl: s.videoUrl,
                                      imageUrls: s.imageUrls,
                                      advancedOptions: s.advancedOptions,
                                    }));
                                    const result = await saveMultiSceneVideoScenesAction(
                                      recipe.id,
                                      payload
                                    );
                                    if (result.success) {
                                      showNotification('Scenes saved successfully', 'success');
                                      setSceneEditorDirty(false);
                                      await refreshStatus(recipe.id);
                                    } else {
                                      showNotification(
                                        result.error || 'Failed to save scenes',
                                        'error'
                                      );
                                    }
                                  } catch (err) {
                                    showNotification(
                                      (err as Error).message || 'Save failed',
                                      'error'
                                    );
                                  }
                                }}
                              >
                                💾 Save Scenes
                              </button>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={reorderEnabled}
                                  onChange={() => setReorderEnabled(v => !v)}
                                />
                                <span className="text-sm">Rearrange</span>
                              </label>
                            </div>
                          </div>
                        )}
                        {vs.marketingIdeas && vs.marketingIdeas.length > 0 && (
                          <div className="mt-6">
                            <div className="mb-2 text-lg font-semibold text-primary">
                              Marketing Ideas
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              {vs.marketingIdeas.map((idea, idx) => (
                                <div
                                  key={idx}
                                  className="flex flex-col justify-between rounded-xl border border-primary/20 bg-primary/5 p-4"
                                >
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                                      Idea {idx + 1}
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                      {idea}
                                    </p>
                                  </div>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-secondary"
                                      onClick={() => {
                                        void handleCopyMarketingIdea(idea, recipe.title);
                                      }}
                                    >
                                      📋 Copy caption
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline"
                                      onClick={() => {
                                        void handlePlanMarketingIdea(idea, recipe.title);
                                      }}
                                    >
                                      🗓️ Plan post
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {!recipe.imageUrl ? (
                          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-4">
                            <div className="mb-1 text-sm font-semibold text-red-700">
                              ❌ Cannot Generate Video
                            </div>
                            <div className="text-xs text-red-600">
                              This recipe needs an image first. Please edit the recipe and add an
                              image.
                            </div>
                          </div>
                        ) : recipe.imageUrl.startsWith('data:') ? (
                          <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                            <div className="mb-1 text-sm font-semibold text-yellow-700">
                              ⚠️ Image Upload Required
                            </div>
                            <div className="mb-2 text-xs text-yellow-600">
                              Data URIs don&apos;t work with Runway ML. The image needs to be
                              uploaded to Firebase Storage first.
                            </div>
                            <button className="btn btn-accent w-full" disabled>
                              🎬 Generate Video (Upload Image First)
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            <button
                              className="btn btn-accent w-full"
                              onClick={async () => {
                                // Preview prompt and settings first
                                try {
                                  const { generateRecipeVideoAction } = await import(
                                    '@/app/actions'
                                  );
                                  const preview = await generateRecipeVideoAction(
                                    recipe.id,
                                    selectedModel,
                                    { previewOnly: true }
                                  );
                                  if (!preview.success) {
                                    showNotification(
                                      preview.error || 'Failed to prepare prompt',
                                      'error'
                                    );
                                    return;
                                  }

                                  setPromptModalInitial(preview.promptText);
                                  setPromptModalSettings({
                                    ratio: preview.settings?.ratio,
                                    duration: preview.settings?.duration,
                                  });
                                  // mark pending generation so the modal's confirm knows what to run
                                  setPendingGenerateMode('single');
                                  setPendingRecipeId(recipe.id);
                                  setPromptModalOpen(true);
                                  return;
                                } catch (err) {
                                  setVideoModalError((err as Error).message || 'Unknown error');
                                } finally {
                                  setVideoModalLoading(false);
                                }
                              }}
                            >
                              🎬 Generate Single-Scene Video
                            </button>

                            <button
                              className="btn btn-secondary w-full"
                              onClick={async () => {
                                setCurrentRecipeId(recipe.id);
                                setMultiSceneError(undefined);

                                const cached =
                                  multiSceneDoc && multiSceneDoc.recipeId === recipe.id
                                    ? multiSceneDoc
                                    : null;
                                let proceedWithGeneration = true;

                                if (
                                  cached &&
                                  (cached.sceneVideos.length > 0 || cached.scenes.length > 0)
                                ) {
                                  proceedWithGeneration = await showConfirmDialog(
                                    'Existing multi-scene data found for this recipe. Click OK to regenerate new scenes, or Cancel to open the current editor.'
                                  );
                                  if (!proceedWithGeneration) {
                                    const initialScenes =
                                      cached.sceneVideos.length > 0
                                        ? cached.sceneVideos
                                        : cached.scenes;
                                    setSceneEditorScenes(initialScenes);
                                    setSceneEditorDirty(false);
                                    setMultiSceneModalOpen(true);
                                    setMultiSceneLoading(false);
                                    if (
                                      cached.sceneVideos.length > 0 ||
                                      cached.combinedInstructions
                                    ) {
                                      setMultiSceneData({
                                        success: true,
                                        sceneVideos: cached.sceneVideos
                                          .filter(scene => !!scene.videoUrl)
                                          .map(scene => ({
                                            sceneNumber: scene.sceneNumber,
                                            videoUrl: scene.videoUrl as string,
                                            script: scene.script,
                                          })),
                                        combinedInstructions: cached.combinedInstructions,
                                      });
                                    } else {
                                      setMultiSceneData(null);
                                    }
                                    return;
                                  }
                                }

                                setMultiSceneModalOpen(true);
                                setMultiSceneLoading(true);
                                setMultiSceneData(null);

                                try {
                                  const {
                                    generateAndSaveMultiSceneVideoScriptForRecipe,
                                    generateMultiSceneVideoForRecipe,
                                  } = await import('@/app/actions');
                                  const scriptResult =
                                    await generateAndSaveMultiSceneVideoScriptForRecipe(
                                      recipe.id,
                                      sceneCount
                                    );
                                  if (!scriptResult.success) {
                                    setMultiSceneError(
                                      scriptResult.error || 'Failed to generate script'
                                    );
                                    return;
                                  }

                                  const preview = await generateMultiSceneVideoForRecipe(
                                    recipe.id,
                                    selectedModel,
                                    {
                                      previewOnly: true,
                                      defaultDuration: advancedOptions.timing.sceneDuration,
                                      ratio: undefined,
                                    }
                                  );
                                  if (!preview.success) {
                                    setMultiSceneError(
                                      preview.error || 'Failed to prepare preview'
                                    );
                                    return;
                                  }

                                  const scenePreviewText =
                                    preview.preview?.scenes
                                      .map(
                                        s =>
                                          `Scene ${s.sceneNumber}: duration=${s.settings.duration}s, ratio=${s.settings.ratio}\nPrompt: ${s.promptText}`
                                      )
                                      .join('\n\n') || '';
                                  setPromptModalInitial(scenePreviewText);
                                  setPromptModalSettings({
                                    ratio: undefined,
                                    duration: advancedOptions.timing.sceneDuration,
                                  });
                                  setPendingGenerateMode('multi');
                                  setPendingRecipeId(recipe.id);
                                  setPromptModalOpen(true);
                                } catch (err) {
                                  setMultiSceneError((err as Error).message || 'Unknown error');
                                } finally {
                                  setMultiSceneLoading(false);
                                }
                              }}
                            >
                              🎭 Generate Multi-Scene Video ({sceneCount} scenes)
                            </button>

                            <button
                              className="btn btn-outline w-full"
                              onClick={() => {
                                setSelectedRecipeForCapCut(recipe);
                                setCapCutModalOpen(true);
                              }}
                            >
                              📱 Create with CapCut (Free)
                            </button>

                            <div className="flex gap-2">
                              <select
                                value={sceneCount}
                                onChange={e => setSceneCount(Number(e.target.value))}
                                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                                title="Number of scenes"
                              >
                                <option value={2}>2 Scenes</option>
                                <option value={3}>3 Scenes</option>
                                <option value={4}>4 Scenes</option>
                                <option value={5}>5 Scenes</option>
                              </select>

                              {vs.videoUrl && (
                                <button
                                  className="btn btn-outline flex-1"
                                  onClick={async () => {
                                    setInstagramPosting(true);
                                    try {
                                      const { shareVideoToInstagram } = await import(
                                        '@/app/actions'
                                      );
                                      const result = await shareVideoToInstagram(recipe.id);
                                      if (!result.success) {
                                        showNotification(
                                          result.error || 'Failed to post to Instagram',
                                          'error'
                                        );
                                      } else {
                                        showNotification(
                                          'Video posted to Instagram successfully!',
                                          'success'
                                        );
                                      }
                                    } catch (err) {
                                      showNotification(
                                        (err as Error).message || 'Unknown error',
                                        'error'
                                      );
                                    } finally {
                                      setInstagramPosting(false);
                                    }
                                  }}
                                  disabled={instagramPosting}
                                >
                                  {instagramPosting ? '📤 Posting...' : '📸 Post to Instagram'}
                                </button>
                              )}
                            </div>

                            {/* Audio Options Section */}
                            <div className="mt-4 border-t pt-4">
                              <button
                                onClick={() => setShowAudioOptions(!showAudioOptions)}
                                className="mb-2 flex w-full items-center justify-between text-left text-sm font-semibold"
                              >
                                🎵 Audio Options
                                <span className="text-lg">{showAudioOptions ? '−' : '+'}</span>
                              </button>

                              {showAudioOptions && (
                                <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                                  {/* Voice-over Section */}
                                  <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={audioOptions.voiceOver.enabled}
                                        onChange={e =>
                                          setAudioOptions(prev => ({
                                            ...prev,
                                            voiceOver: {
                                              ...prev.voiceOver,
                                              enabled: e.target.checked,
                                            },
                                          }))
                                        }
                                        className="rounded"
                                      />
                                      <span className="text-sm font-medium">🎤 Add Voice-over</span>
                                    </label>

                                    {audioOptions.voiceOver.enabled && (
                                      <div className="ml-6 space-y-2">
                                        <textarea
                                          placeholder="Enter voice-over text (will be spoken over the video)"
                                          value={audioOptions.voiceOver.text}
                                          onChange={e =>
                                            setAudioOptions(prev => ({
                                              ...prev,
                                              voiceOver: {
                                                ...prev.voiceOver,
                                                text: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
                                          rows={3}
                                        />
                                        <select
                                          value={audioOptions.voiceOver.voice}
                                          onChange={e =>
                                            setAudioOptions(prev => ({
                                              ...prev,
                                              voiceOver: {
                                                ...prev.voiceOver,
                                                voice: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                          title="Voice selection"
                                        >
                                          <option value="21m00Tcm4TlvDq8ikWAM">
                                            Rachel (Female, Professional)
                                          </option>
                                          <option value="AZnzlk1XvdvUeBnXmlld">
                                            Domi (Female, Young)
                                          </option>
                                          <option value="EXAVITQu4vr4xnSDxMaL">
                                            Bella (Female, Warm)
                                          </option>
                                          <option value="ErXwobaYiN019PkySvjV">
                                            Antoni (Male, Warm)
                                          </option>
                                          <option value="VR6AewLTigWG4xSOukaG">
                                            Arnold (Male, Professional)
                                          </option>
                                          <option value="pNInz6obpgDQGcFmaJgB">
                                            Adam (Male, Deep)
                                          </option>
                                        </select>
                                      </div>
                                    )}
                                  </div>

                                  {/* Background Music Section */}
                                  <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={audioOptions.backgroundMusic.enabled}
                                        onChange={e =>
                                          setAudioOptions(prev => ({
                                            ...prev,
                                            backgroundMusic: {
                                              ...prev.backgroundMusic,
                                              enabled: e.target.checked,
                                            },
                                          }))
                                        }
                                        className="rounded"
                                      />
                                      <span className="text-sm font-medium">
                                        🎵 Add Background Music
                                      </span>
                                    </label>

                                    {audioOptions.backgroundMusic.enabled && (
                                      <div className="ml-6 space-y-2">
                                        <select
                                          value={audioOptions.backgroundMusic.genre}
                                          onChange={e =>
                                            setAudioOptions(prev => ({
                                              ...prev,
                                              backgroundMusic: {
                                                ...prev.backgroundMusic,
                                                genre: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                          title="Music genre selection"
                                        >
                                          <option value="upbeat">Upbeat & Energetic</option>
                                          <option value="calm">Calm & Relaxing</option>
                                          <option value="energetic">High Energy</option>
                                          <option value="default">Default Cooking Theme</option>
                                        </select>

                                        <div className="space-y-1">
                                          <label className="text-xs text-gray-600">
                                            Music Volume:{' '}
                                            {Math.round(audioOptions.backgroundMusic.volume * 100)}%
                                          </label>
                                          <input
                                            type="range"
                                            min="0.1"
                                            max="1"
                                            step="0.1"
                                            value={audioOptions.backgroundMusic.volume}
                                            onChange={e =>
                                              setAudioOptions(prev => ({
                                                ...prev,
                                                backgroundMusic: {
                                                  ...prev.backgroundMusic,
                                                  volume: parseFloat(e.target.value),
                                                },
                                              }))
                                            }
                                            className="w-full"
                                            title="Background music volume"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Audio Preview Button */}
                                  {(audioOptions.voiceOver.enabled &&
                                    audioOptions.voiceOver.text.trim()) ||
                                  audioOptions.backgroundMusic.enabled ? (
                                    <div className="space-y-2">
                                      <button
                                        className={`btn btn-secondary w-full text-sm ${audioPreviewLoading ? 'pointer-events-none opacity-80' : ''}`}
                                        onClick={async () => {
                                          if (audioPreviewLoading) return;
                                          if (
                                            audioOptions.voiceOver.enabled &&
                                            audioOptions.voiceOver.text.trim()
                                          ) {
                                            setAudioPreviewLoading(true);
                                            try {
                                              const { generateVoiceOverAction } = await import(
                                                '@/app/actions'
                                              );
                                              const result = await generateVoiceOverAction(
                                                audioOptions.voiceOver.text.trim(),
                                                audioOptions.voiceOver.voice,
                                                {
                                                  recipeId: currentRecipeId,
                                                  context: 'audio-preview',
                                                }
                                              );
                                              if (!result.success || !result.url) {
                                                showNotification(
                                                  result.error ||
                                                    'Failed to generate audio preview.',
                                                  'error'
                                                );
                                              } else {
                                                setAudioPreview({
                                                  url: result.url,
                                                  generatedAt: Date.now(),
                                                });
                                                showNotification('Audio preview ready!', 'success');
                                                await refreshAssets(currentRecipeId);
                                                await refreshStatus(currentRecipeId);
                                              }
                                            } catch (err) {
                                              showNotification(
                                                (err as Error).message ||
                                                  'Failed to generate audio preview.',
                                                'error'
                                              );
                                            } finally {
                                              setAudioPreviewLoading(false);
                                            }
                                          } else {
                                            showNotification(
                                              'Background music preview is not available yet. Add voice-over text to generate an audio preview.',
                                              'info'
                                            );
                                          }
                                        }}
                                      >
                                        {audioPreviewLoading
                                          ? 'Generating Preview…'
                                          : '🔊 Preview Audio'}
                                      </button>
                                      {audioPreview?.url ? (
                                        <div className="flex items-center gap-2">
                                          <audio
                                            controls
                                            className="w-full"
                                            src={audioPreview.url}
                                          />
                                          <button
                                            type="button"
                                            className="btn btn-xs btn-outline"
                                            onClick={() => setAudioPreview(null)}
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            {/* Advanced Options Section */}
                            <div className="mt-4 border-t pt-4">
                              <button
                                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                className="mb-2 flex w-full items-center justify-between text-left text-sm font-semibold"
                              >
                                ⚙️ Advanced Options
                                <span className="text-lg">{showAdvancedOptions ? '−' : '+'}</span>
                              </button>

                              {showAdvancedOptions && (
                                <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                                  {/* Transitions Settings */}
                                  <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={advancedOptions.transitions.enabled}
                                        onChange={e =>
                                          setAdvancedOptions(prev => ({
                                            ...prev,
                                            transitions: {
                                              ...prev.transitions,
                                              enabled: e.target.checked,
                                            },
                                          }))
                                        }
                                        className="rounded"
                                      />
                                      <span className="text-sm font-medium">
                                        🌈 Enable Transitions
                                      </span>
                                    </label>

                                    {advancedOptions.transitions.enabled && (
                                      <div className="ml-6 space-y-2">
                                        <div className="flex gap-2">
                                          <select
                                            value={advancedOptions.transitions.type}
                                            onChange={e =>
                                              setAdvancedOptions(prev => ({
                                                ...prev,
                                                transitions: {
                                                  ...prev.transitions,
                                                  type: e.target.value,
                                                },
                                              }))
                                            }
                                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                                            title="Transition type"
                                          >
                                            <option value="fade">Fade</option>
                                            <option value="slide">Slide</option>
                                            <option value="zoom">Zoom</option>
                                          </select>

                                          <input
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={advancedOptions.transitions.duration}
                                            onChange={e =>
                                              setAdvancedOptions(prev => ({
                                                ...prev,
                                                transitions: {
                                                  ...prev.transitions,
                                                  duration: Math.max(
                                                    0.1,
                                                    parseFloat(e.target.value)
                                                  ),
                                                },
                                              }))
                                            }
                                            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
                                            title="Transition duration (seconds)"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Timing Settings */}
                                  <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                      <span className="text-sm font-medium">
                                        ⏱️ Set Scene Timing
                                      </span>
                                    </label>

                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={advancedOptions.timing.sceneDuration}
                                        onChange={e =>
                                          setAdvancedOptions(prev => ({
                                            ...prev,
                                            timing: {
                                              ...prev.timing,
                                              sceneDuration: Math.max(1, parseInt(e.target.value)),
                                            },
                                          }))
                                        }
                                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        title="Scene duration (seconds)"
                                      />

                                      <input
                                        type="number"
                                        min="1"
                                        value={advancedOptions.timing.totalDuration}
                                        onChange={e =>
                                          setAdvancedOptions(prev => ({
                                            ...prev,
                                            timing: {
                                              ...prev.timing,
                                              totalDuration: Math.max(1, parseInt(e.target.value)),
                                            },
                                          }))
                                        }
                                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        title="Total video duration (seconds)"
                                      />
                                    </div>
                                  </div>

                                  {/* Effects Settings */}
                                  <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={advancedOptions.effects.textOverlays}
                                        onChange={e =>
                                          setAdvancedOptions(prev => ({
                                            ...prev,
                                            effects: {
                                              ...prev.effects,
                                              textOverlays: e.target.checked,
                                            },
                                          }))
                                        }
                                        className="rounded"
                                      />
                                      <span className="text-sm font-medium">
                                        📝 Add Text Overlays
                                      </span>
                                    </label>

                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={advancedOptions.effects.backgroundMusic}
                                        onChange={e =>
                                          setAdvancedOptions(prev => ({
                                            ...prev,
                                            effects: {
                                              ...prev.effects,
                                              backgroundMusic: e.target.checked,
                                            },
                                          }))
                                        }
                                        className="rounded"
                                      />
                                      <span className="text-sm font-medium">
                                        🎶 Add Background Music
                                      </span>
                                    </label>

                                    <div>
                                      <label className="text-sm font-medium">
                                        🎨 Color Grading
                                      </label>
                                      <select
                                        value={advancedOptions.effects.colorGrading}
                                        onChange={e =>
                                          setAdvancedOptions(prev => ({
                                            ...prev,
                                            effects: {
                                              ...prev.effects,
                                              colorGrading: e.target.value,
                                            },
                                          }))
                                        }
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        title="Color grading style"
                                      >
                                        <option value="warm">Warm & Cozy</option>
                                        <option value="cool">Cool & Calm</option>
                                        <option value="vibrant">Vibrant & Energetic</option>
                                        <option value="default">Default</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Preview Button */}
                                  <button
                                    className="btn btn-secondary w-full text-sm"
                                    onClick={() => {
                                      // TODO: Implement advanced options preview functionality
                                      showNotification(
                                        'Advanced options preview coming soon! This will show a preview of your video with the selected advanced options.',
                                        'info'
                                      );
                                    }}
                                  >
                                    🎬 Preview with Advanced Options
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="mb-1 text-base font-bold">Video Script</div>
                        <div className="mb-2 text-xs text-yellow-700">
                          No script generated yet or model misconfigured.
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            void runGenerateScript(recipe.id);
                          }}
                          disabled={generating[recipe.id]}
                        >
                          {generating[recipe.id] ? 'Generating...' : 'Generate Video Script'}
                        </button>
                        {error[recipe.id] && (
                          <div className="mt-1 text-xs text-red-600">{error[recipe.id]}</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto mt-12 w-full max-w-7xl">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-primary">Asset Library</h2>
            <p className="text-sm text-muted-foreground">
              Every generated video, audio clip, and image for this recipe is saved here so you can
              reuse assets without regenerating them.
            </p>
          </div>
          <button
            className="btn btn-outline btn-sm self-start md:self-auto"
            onClick={() => {
              void refreshAssets(currentRecipeId);
            }}
            disabled={assetLoading || !currentRecipeId}
          >
            {assetLoading ? 'Refreshing...' : 'Refresh Assets'}
          </button>
        </div>
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          {assetLoading ? (
            <div className="text-sm text-muted-foreground">Loading assets...</div>
          ) : assetError ? (
            <div className="text-sm text-red-600">{assetError}</div>
          ) : assetLibrary.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No assets yet. Generate videos, audio, or images to populate this library.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedAssets.videos.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-primary">
                      Videos ({groupedAssets.videos.length})
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {groupedAssets.videos.map(asset => (
                      <div key={asset.id} className="space-y-2 rounded-lg border bg-muted/40 p-3">
                        <video controls className="w-full rounded" src={asset.url} />
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {asset.sceneNumber ? <span>Scene {asset.sceneNumber}</span> : null}
                          {asset.duration ? <span>Duration: {asset.duration}s</span> : null}
                          {asset.model ? <span>Model: {asset.model}</span> : null}
                          {asset.ratio ? <span>Ratio: {asset.ratio}</span> : null}
                          {asset.source ? <span>Source: {asset.source}</span> : null}
                          <span>{formatAssetTimestamp(asset.createdAt)}</span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            className="btn btn-xs btn-outline flex-1"
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleCopyAssetUrl(asset.url)}
                          >
                            Copy URL
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupedAssets.audios.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-primary">
                    Audio ({groupedAssets.audios.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {groupedAssets.audios.map(asset => (
                      <div key={asset.id} className="space-y-2 rounded-lg border bg-muted/40 p-3">
                        <audio controls className="w-full" src={asset.url} />
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {asset.sceneNumber ? <span>Scene {asset.sceneNumber}</span> : null}
                          {asset.voiceId ? <span>Voice: {asset.voiceId}</span> : null}
                          {asset.source ? <span>Source: {asset.source}</span> : null}
                          <span>{formatAssetTimestamp(asset.createdAt)}</span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            className="btn btn-xs btn-outline flex-1"
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleCopyAssetUrl(asset.url)}
                          >
                            Copy URL
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupedAssets.images.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xl font-semibold text-primary">
                    Images ({groupedAssets.images.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {groupedAssets.images.map(asset => (
                      <div key={asset.id} className="space-y-2 rounded-lg border bg-muted/40 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.source || 'Generated scene image'}
                          className="h-40 w-full rounded object-cover"
                        />
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {asset.sceneNumber ? <span>Scene {asset.sceneNumber}</span> : null}
                          {asset.source ? <span>Source: {asset.source}</span> : null}
                          <span>{formatAssetTimestamp(asset.createdAt)}</span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            className="btn btn-xs btn-outline flex-1"
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open
                          </a>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleCopyAssetUrl(asset.url)}
                          >
                            Copy URL
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <PromptConfirmModal
        open={promptModalOpen}
        onOpenChange={open => setPromptModalOpen(open)}
        initialPrompt={promptModalInitial}
        settings={promptModalSettings}
        onConfirm={async (prompt, settings) => {
          // Submit depending on pending mode
          await handlePromptConfirm(prompt, settings);
        }}
      />

      {/* Video Preview Modal */}
      <VideoPreviewModal
        open={videoModalOpen}
        onOpenChange={setVideoModalOpen}
        videoUrl={videoVideoUrl}
        imageUrl={videoImageUrl}
        isLoading={videoModalLoading}
        error={videoModalError}
        recipeId={currentRecipeId}
        recipeTitle={recipes[currentIndex]?.title}
      />

      {/* CapCut Instructions Modal */}
      {capCutModalOpen && selectedRecipeForCapCut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-green-700">
                  🎬 Create Video with CapCut (Free)
                </h2>
                <button
                  onClick={() => setCapCutModalOpen(false)}
                  className="text-2xl text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <h3 className="mb-2 font-semibold text-green-800">
                    📱 How to Create Your Recipe Video
                  </h3>
                  <div className="space-y-2 text-sm text-green-700">
                    <p>
                      <strong>Step 1:</strong> Download and open the CapCut app on your phone
                    </p>
                    <p>
                      <strong>Step 2:</strong> Tap "New Project" and import your recipe image
                    </p>
                    <p>
                      <strong>Step 3:</strong> Use CapCut's AI Video Generator with this prompt:
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="mb-2 font-semibold text-blue-800">🎯 AI Video Prompt</h4>
                  <div className="rounded border bg-white p-3 font-mono text-sm">
                    Create a cinematic recipe video for: &ldquo;{selectedRecipeForCapCut.title}
                    &rdquo;
                    <br />
                    <br />
                    {scriptMap.get(selectedRecipeForCapCut.id)?.script?.replace(/'/g, '\u2019') ||
                      'Generate a video script first'}
                    <br />
                    <br />
                    Style: Professional food photography, smooth camera movements, appetizing
                    presentation
                  </div>
                  <button
                    onClick={() => {
                      const script =
                        scriptMap.get(selectedRecipeForCapCut.id)?.script ||
                        'Generate a video script first';
                      navigator.clipboard
                        .writeText(`Create a cinematic recipe video for: "${selectedRecipeForCapCut.title}"

${script}

Style: Professional food photography, smooth camera movements, appetizing presentation`);
                      showNotification('Prompt copied to clipboard!', 'success');
                    }}
                    className="btn btn-sm btn-secondary mt-2"
                  >
                    📋 Copy Prompt
                  </button>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <h4 className="mb-2 font-semibold text-yellow-800">⚡ Quick CapCut Workflow</h4>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-yellow-700">
                    <li>Open CapCut &rarr; New Project</li>
                    <li>Import recipe image from gallery</li>
                    <li>Tap &ldquo;AI&rdquo; &rarr; &ldquo;AI Video Generator&rdquo;</li>
                    <li>Paste the prompt above</li>
                    <li>Generate video (5-10 seconds)</li>
                    <li>Add text overlays for ingredients</li>
                    <li>Export in 1080p for Instagram/TikTok</li>
                  </ol>
                </div>

                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <h4 className="mb-2 font-semibold text-purple-800">🎨 Pro Tips</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-purple-700">
                    <li>Use CapCut&apos;s auto-captions for accessibility</li>
                    <li>Add background music from CapCut&apos;s free library</li>
                    <li>Apply &ldquo;Food&rdquo; color grading for better appeal</li>
                    <li>Export as 9:16 ratio for mobile viewing</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setCapCutModalOpen(false)} className="btn btn-secondary">
                    Close
                  </button>
                  <a
                    href="https://www.capcut.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    📱 Open CapCut Website
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Scene Video Modal */}
      {multiSceneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-green-700">🎭 Multi-Scene Video Results</h2>
                <button
                  onClick={() => setMultiSceneModalOpen(false)}
                  className="text-2xl text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {multiSceneLoading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-700" />
                  <p>Generating multi-scene video...</p>
                </div>
              ) : multiSceneError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="mb-2 font-semibold text-red-700">❌ Error</div>
                  <div className="text-sm text-red-600">{multiSceneError}</div>
                </div>
              ) : multiSceneData ? (
                <div className="space-y-6">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <h3 className="mb-2 font-semibold text-green-800">
                      ✅ Multi-Scene Video Ready!
                    </h3>
                    <p className="text-sm text-green-700">
                      Split into{' '}
                      {sceneEditorScenes.length ||
                        multiSceneData.sceneVideos?.length ||
                        splitScenes.length ||
                        0}{' '}
                      scenes.
                      {(() => {
                        const videoCount =
                          sceneEditorScenes.filter(s => s.videoUrl).length ||
                          multiSceneData.sceneVideos?.filter(
                            (s: { videoUrl?: string }) => s.videoUrl
                          ).length ||
                          0;
                        return videoCount > 0
                          ? ` Generated ${videoCount} video${videoCount !== 1 ? 's' : ''}.`
                          : ' Generate videos below.';
                      })()}{' '}
                      You can edit, rearrange, or preview scenes before combining.
                    </p>
                  </div>

                  {/* Scene Editor Integration */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Scenes</div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={reorderEnabled}
                          onChange={() => setReorderEnabled(v => !v)}
                        />
                        <span>Rearrange</span>
                      </label>
                    </div>
                  </div>
                  <SceneEditor
                    scenes={
                      sceneEditorScenes.length > 0
                        ? sceneEditorScenes
                        : multiSceneData.sceneVideos?.map(
                            (scene: {
                              sceneNumber: number;
                              script: string;
                              description?: string;
                              videoUrl?: string;
                              imageUrl?: string;
                            }) => ({
                              id: scene.sceneNumber.toString(),
                              sceneNumber: scene.sceneNumber,
                              script: scene.script,
                              description: scene.description || '',
                              videoUrl: scene.videoUrl,
                              imageUrls: scene.imageUrl ? [scene.imageUrl] : [],
                            })
                          ) || []
                    }
                    onChange={scenes => {
                      setSceneEditorScenes(scenes);
                      setSceneEditorDirty(true);
                    }}
                    editable={true}
                    recipeId={currentRecipeId}
                    reorderEnabled={reorderEnabled}
                    onPreview={async scene => {
                      // Preview handler: generate if missing, then open preview modal
                      setVideoModalOpen(true);
                      setVideoModalLoading(true);
                      setVideoModalError(undefined);
                      setVideoVideoUrl(undefined);
                      setVideoImageUrl(undefined);
                      try {
                        if (scene.videoUrl) {
                          setVideoVideoUrl(scene.videoUrl);
                          setVideoImageUrl(scene.imageUrls?.[0] || undefined);
                        } else {
                          const { generateSplitSceneVideoAction } = await import('@/app/actions');
                          const result = await generateSplitSceneVideoAction(
                            currentRecipeId,
                            scene.sceneNumber
                          );
                          if (result.success && result.videoUrl) {
                            setVideoVideoUrl(result.videoUrl);
                            // update local scene data so UI reflects generated video
                            setSceneEditorScenes(prev => {
                              const copy = prev.map(s =>
                                s.sceneNumber === scene.sceneNumber
                                  ? { ...s, videoUrl: result.videoUrl }
                                  : s
                              );
                              setSceneEditorDirty(true);
                              return copy;
                            });
                            await refreshAssets(currentRecipeId);
                          } else {
                            setVideoModalError(result.error || 'Failed to generate scene video');
                          }
                        }
                      } catch (err) {
                        setVideoModalError((err as Error).message || 'Unknown error');
                      } finally {
                        setVideoModalLoading(false);
                      }
                    }}
                    onHistory={async sceneNumber => {
                      if (!currentRecipeId) return;
                      setMultiSceneLoading(true);
                      try {
                        const { getSceneHistoryAction } = await import('@/app/actions');
                        const res = await getSceneHistoryAction(currentRecipeId, sceneNumber);
                        if (!res.success) {
                          showNotification(res.error || 'No history found', 'error');
                        } else {
                          const list = res.history || [];
                          if (list.length === 0) {
                            showNotification('No history available for this scene.', 'info');
                          } else if (list.length === 1) {
                            setVideoVideoUrl(list[0].videoUrl);
                            setVideoModalOpen(true);
                          } else {
                            const display = list
                              .map((h, i) => `${i + 1}: ${h.videoUrl}`)
                              .join('\n');
                            const choice = await showPromptDialog(
                              `Scene history:\n${display}\n\nEnter number to preview`,
                              '1'
                            );
                            const idx = Number(choice) - 1;
                            if (!isNaN(idx) && idx >= 0 && idx < list.length) {
                              setVideoVideoUrl(list[idx].videoUrl);
                              setVideoModalOpen(true);
                            }
                          }
                        }
                      } catch (err) {
                        showNotification(
                          (err as Error).message || 'Failed to fetch history',
                          'error'
                        );
                      } finally {
                        setMultiSceneLoading(false);
                      }
                    }}
                    onAssetGenerated={() => {
                      void refreshAssets(currentRecipeId);
                      void refreshStatus(currentRecipeId);
                    }}
                  />

                  {/* Save Scenes Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      className={`btn btn-primary ${!sceneEditorDirty ? 'pointer-events-none opacity-60' : ''}`}
                      disabled={!sceneEditorDirty || multiSceneLoading}
                      onClick={async () => {
                        if (!currentRecipeId || sceneEditorScenes.length === 0) return;
                        setMultiSceneLoading(true);
                        setMultiSceneError(undefined);
                        try {
                          const { saveMultiSceneVideoScenesAction } = await import('@/app/actions');
                          const result = await saveMultiSceneVideoScenesAction(
                            currentRecipeId,
                            sceneEditorScenes
                          );
                          if (result.success) {
                            setSceneEditorDirty(false);
                            showNotification('Scenes saved successfully!', 'success');
                            await refreshStatus(currentRecipeId);
                          } else {
                            setMultiSceneError(result.error || 'Failed to save scenes');
                          }
                        } catch (err) {
                          setMultiSceneError((err as Error).message || 'Unknown error');
                        } finally {
                          setMultiSceneLoading(false);
                        }
                      }}
                    >
                      💾 Save Scenes
                    </button>
                  </div>

                  {multiSceneData.combinedInstructions && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h4 className="mb-2 font-semibold text-blue-800">
                        🎬 Video Combination Instructions
                      </h4>
                      <pre className="whitespace-pre-wrap font-mono text-sm text-blue-700">
                        {multiSceneData.combinedInstructions}
                      </pre>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              multiSceneData.combinedInstructions || ''
                            );
                            showNotification('Instructions copied to clipboard!', 'success');
                          }}
                          className="btn btn-sm btn-secondary"
                        >
                          📋 Copy Instructions
                        </button>
                        <button
                          onClick={async () => {
                            setMultiSceneLoading(true);
                            setMultiSceneError(undefined);
                            try {
                              if (!currentRecipeId) {
                                setMultiSceneError('Select a recipe before combining videos.');
                                return;
                              }
                              const { combineVideoScenesAction } = await import('@/app/actions');
                              const result = await combineVideoScenesAction(currentRecipeId);
                              if (result.success) {
                                // Update combined videos state
                                const combinedUrl = result.combinedVideoUrl;
                                if (combinedUrl) {
                                  setCombinedVideos(prev => {
                                    const next = { ...prev };
                                    next[currentRecipeId] = {
                                      url: combinedUrl,
                                      duration: result.duration,
                                      fileSize: result.fileSize,
                                    };
                                    return next;
                                  });
                                }
                                setMultiSceneDoc(prev => {
                                  if (!prev || prev.recipeId !== currentRecipeId) return prev;
                                  return {
                                    ...prev,
                                    combinedVideo: result.combinedVideoUrl
                                      ? {
                                          url: result.combinedVideoUrl,
                                          duration: result.duration,
                                          fileSize: result.fileSize,
                                          processingMethod: result.processingMethod,
                                          generatedAt: Date.now(),
                                          instructions:
                                            prev.combinedVideo?.instructions ??
                                            prev.combinedInstructions ??
                                            null,
                                        }
                                      : prev.combinedVideo,
                                  };
                                });
                                showNotification(
                                  'Video combination completed! Check the combined video below.',
                                  'success'
                                );
                                await refreshAssets(currentRecipeId);
                                await refreshStatus(currentRecipeId);
                              } else {
                                setMultiSceneError(result.error || 'Failed to combine videos');
                              }
                            } catch (err) {
                              setMultiSceneError((err as Error).message || 'Unknown error');
                            } finally {
                              setMultiSceneLoading(false);
                            }
                          }}
                          className="btn btn-sm btn-primary"
                        >
                          🎬 Auto-Combine Videos
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show combined video if available */}
                  {combinedVideos[currentRecipeId] && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <h4 className="mb-2 font-semibold text-green-800">
                        ✅ Combined Video Ready!
                      </h4>
                      <video controls className="w-full max-w-md rounded">
                        <source src={combinedVideos[currentRecipeId].url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="mt-2 text-sm text-green-700">
                        <strong>Duration:</strong>{' '}
                        {combinedVideos[currentRecipeId].duration || 'Unknown'} seconds
                        <br />
                        <strong>File Size:</strong>{' '}
                        {combinedVideos[currentRecipeId].fileSize
                          ? `${(combinedVideos[currentRecipeId].fileSize / (1024 * 1024)).toFixed(1)} MB`
                          : 'Unknown'}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          className="btn btn-instagram"
                          onClick={async () => {
                            setMultiSceneLoading(true);
                            try {
                              const { shareMultiSceneVideoToInstagram } = await import(
                                '@/app/actions'
                              );
                              const result = await shareMultiSceneVideoToInstagram(currentRecipeId);
                              if (result.success) {
                                showNotification(
                                  `Combined video posted to Instagram successfully! ${result.permalink}`,
                                  'success'
                                );
                              } else {
                                showNotification(
                                  result.error || 'Failed to post to Instagram',
                                  'error'
                                );
                              }
                            } catch (err) {
                              showNotification((err as Error).message || 'Unknown error', 'error');
                            } finally {
                              setMultiSceneLoading(false);
                            }
                          }}
                          disabled={multiSceneLoading}
                        >
                          📸 Post Combined Video to Instagram
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button onClick={() => setMultiSceneModalOpen(false)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={open => !open && handleConfirmClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmClose(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmClose(true)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt Dialog */}
      <Dialog open={promptDialog.open} onOpenChange={open => !open && handlePromptClose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Required</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-3 text-sm text-gray-600">{promptDialog.message}</p>
            <input
              id="prompt-input"
              type="text"
              defaultValue={promptDialog.defaultValue}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  handlePromptClose(value);
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => handlePromptClose(null)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const input = document.getElementById('prompt-input') as HTMLInputElement;
                handlePromptClose(input?.value || null);
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
