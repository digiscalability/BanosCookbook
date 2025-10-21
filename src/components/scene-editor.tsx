import type { VoiceOverMetadata } from '@/app/actions';
import { showNotification } from '@/lib/notify';
import { cleanForDisplay, removeProductionCues } from '@/lib/text-pruning';
import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

// Inject drag state CSS once on mount
function useSceneEditorDragStyle() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('scene-editor-drag-style')) {
      const style = document.createElement('style');
      style.id = 'scene-editor-drag-style';
      style.innerHTML = `
        .scene-dnd {
          transform: var(--scene-transform, none);
          transition: var(--scene-transition, none);
        }
        .scene-dragging {
          opacity: 0.7;
          background: #f0f0f0;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

export interface Scene {
  id: string;
  sceneNumber: number;
  script: string;
  description?: string;
  videoUrl?: string;
  imageUrls?: string[]; // Multiple generated images
  voiceOverUrl?: string;
  voiceoverMeta?: (VoiceOverMetadata & { updatedAt?: string; url?: string }) | null;
  promptSummary?: string;
  promptPreview?: string;
  subtitleLines?: string[];
  referenceImage?: string;
  // Additional metadata persisted in split_scenes by server actions
  finalized?: boolean;
  status?: 'draft' | 'finalized' | 'preview' | string;
  versions?: Array<{
    id: string;
    videoUrl?: string | null;
    imageUrl?: string | null;
    prompt?: string | null;
    createdAt?: string | number | Date;
    taskId?: string | null;
  }>;
  runwayPrompt?: string;
  runwaySettings?: Record<string, unknown> | undefined;
  videoGeneratedAt?: string | number | Date;
  imageGeneratedAt?: string | number | Date;
  advancedOptions?: {
    voice?: { enabled: boolean; voiceId?: string; pitch?: number; rate?: number; text?: string; url?: string };
    music?: { enabled: boolean; genre?: string; volume?: number };
    animation?: { enabled: boolean; style?: string };
    duration?: number;
  };
}

// Presets for advanced options (module-level so inner components can access)
const ANIMATION_PRESETS = [
  { id: 'subtle_kenburns', name: 'Subtle Ken Burns' },
  { id: 'parallax', name: 'Parallax Zoom' },
  { id: 'cinematic_pan', name: 'Cinematic Pan' },
];

export interface SceneEditorProps {
  scenes: Scene[];
  onChange: (scenes: Scene[]) => void;
  onDelete?: (sceneId: string) => void;
  onAdd?: () => void;
  editable?: boolean;
  recipeId?: string; // Needed for per-scene regeneration
  reorderEnabled?: boolean; // Toggle drag-and-drop
  onPreview?: (scene: Scene) => void;
  onHistory?: (sceneNumber: number) => Promise<void>;
  onAssetGenerated?: (asset: { type: 'video' | 'audio' | 'image'; url?: string; sceneNumber?: number; metadata?: Record<string, unknown> }) => void;
  activeSceneNumber?: number | null;
  onSceneFocus?: (sceneNumber: number) => void;
}

function SortableSceneItem({ scene, index, onChange: onSceneChange, onDelete, editable, recipeId, onRegenerate, loading, reorderEnabled, onPreview, onAssetGenerated, isActive, onFocus }: {
  scene: Scene;
  index: number;
  onChange: (scene: Scene) => void;
  onDelete?: (sceneId: string) => void;
  editable?: boolean;
  recipeId?: string;
  onRegenerate?: (sceneNumber: number) => void;
  loading?: boolean;
  reorderEnabled?: boolean;
  onPreview?: (scene: Scene) => void;
  onAssetGenerated?: (asset: { type: 'video' | 'audio' | 'image'; url?: string; sceneNumber?: number; metadata?: Record<string, unknown> }) => void;
  isActive?: boolean;
  onFocus?: (sceneNumber: number) => void;
}) {
  const [imageLoading, setImageLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  // Always call the hook to preserve hooks order; use values only when reorderEnabled
  const _sortable = useSortable({ id: scene.id });
  const attributes = reorderEnabled ? _sortable.attributes : undefined;
  const listeners = reorderEnabled ? _sortable.listeners : undefined;
  const setNodeRef = reorderEnabled ? _sortable.setNodeRef : undefined;
  const transform = reorderEnabled ? _sortable.transform : undefined;
  const transition = reorderEnabled ? _sortable.transition : undefined;
  const isDragging = reorderEnabled ? _sortable.isDragging : false;

  // Compose dynamic style for drag transform/transition
  // Compose dynamic style for drag transform/transition
  let dragClass = '';
  if (transform || transition) {
    dragClass = 'scene-dnd-var';
    if (typeof window !== 'undefined') {
      const el = document.getElementById(`scene-dnd-${scene.id}`);
      if (el) {
        const tVal = transform ?? null;
        el.style.setProperty('--scene-transform', CSS.Transform.toString(tVal) || '');
        el.style.setProperty('--scene-transition', transition || '');
      }
    }
  }

  const voiceUrl = scene.advancedOptions?.voice?.url || scene.voiceOverUrl || scene.voiceoverMeta?.url;
  // Asset badges for potential future use
  // const assetBadges = [
  //   { key: 'video', label: 'Video', active: typeof scene.videoUrl === 'string' && scene.videoUrl.length > 0 },
  //   { key: 'image', label: 'Images', active: Array.isArray(scene.imageUrls) && scene.imageUrls.length > 0 },
  //   { key: 'voice', label: 'Voice', active: typeof voiceUrl === 'string' && voiceUrl.length > 0 },
  // ];

  // Per-scene image generation handler
  const handleGenerateImage = async () => {
    if (!recipeId) return;
    setImageLoading(true);
    try {
      const { generateSceneImageAction } = await import('@/app/actions');
      const result = await generateSceneImageAction({
        recipeId,
        sceneNumber: scene.sceneNumber,
        title: scene.description || '',
        description: scene.description || '',
        cuisine: '', // Optionally pass cuisine if available
        ingredients: '', // Optionally pass ingredients if available
        sceneScript: scene.script,
        sceneDescription: scene.description || ''
      });
      if (result.success && result.imageUrls) {
        onSceneChange({ ...scene, imageUrls: result.imageUrls });
        const firstUrl = result.imageUrls[0] || result.images?.[0]?.url;
        onAssetGenerated?.({ type: 'image', url: firstUrl, sceneNumber: scene.sceneNumber, metadata: { source: 'scene-image' } });
      } else {
        showNotification(result.error || 'Failed to generate image for this scene.', 'error');
      }
    } catch (err) {
      showNotification((err as Error).message || 'Unknown error during image generation.', 'error');
    } finally {
      setImageLoading(false);
    }
  };

  // Finalize/unfinalize scene
  const handleFinalize = async (finalized: boolean) => {
    if (!recipeId) return;
    if (!finalized && !confirm('Are you sure you want to un-finalize this scene? This will allow regeneration.')) return;
    try {
      const { finalizeSceneAction } = await import('@/app/actions');
      const res = await finalizeSceneAction(recipeId, scene.sceneNumber, finalized);
      if (res.success) {
        onSceneChange({ ...scene, finalized });
      } else {
        showNotification(res.error || 'Failed to finalize scene', 'error');
      }
    } catch (err) {
      showNotification((err as Error).message || 'Unknown error', 'error');
    }
  };

  // Generate lightweight storyboard image for quick preview
  const handleGenerateStoryboard = async () => {
    if (!recipeId) return;
    try {
      const { generateSceneStoryboardAction } = await import('@/app/actions');
      const res = await generateSceneStoryboardAction(recipeId, scene.sceneNumber);
      if (res.success && res.imageUrl) {
        onSceneChange({ ...scene, imageUrls: [...(scene.imageUrls || []), res.imageUrl] });
        // call parent preview if available
        if (onPreview) onPreview({ ...scene, imageUrls: [...(scene.imageUrls || []), res.imageUrl] });
        onAssetGenerated?.({ type: 'image', url: res.imageUrl, sceneNumber: scene.sceneNumber, metadata: { source: 'storyboard' } });
      } else {
        showNotification(res.error || 'Failed to generate storyboard image', 'error');
      }
    } catch (err) {
      showNotification((err as Error).message || 'Unknown error generating storyboard', 'error');
    }
  };

  // Prompt preview/edit state
  const [prompt, setPrompt] = useState('');
  useEffect(() => {
    // Build a default prompt from scene script/description (remove markdown artifacts)
    let base = (scene.description || '') + '. ' + scene.script;
    base = base.replace(/^[\-*\d.\s]+/gm, '').replace(/[*_`>]/g, '').trim();
    setPrompt(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.description, scene.script]);

  return (
    <div
      ref={setNodeRef}
      id={`scene-dnd-${scene.id}`}
      data-scene-number={scene.sceneNumber}
      tabIndex={0}
      className={`flex items-start gap-3 border rounded-lg p-4 mb-2 bg-white scene-dnd${isDragging ? ' scene-dragging' : ''} ${dragClass} ${isActive ? 'border-primary shadow-lg ring-2 ring-primary/30' : 'shadow-sm'}`}
      onMouseEnter={() => onFocus?.(scene.sceneNumber)}
      onFocus={() => onFocus?.(scene.sceneNumber)}
      {...attributes}
    >
      {reorderEnabled ? (
        <button {...listeners} className="cursor-grab p-2 text-gray-400 hover:text-primary">
          <GripVertical />
        </button>
      ) : (
        <div className="p-2 text-gray-200" aria-hidden />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-primary">Scene {index + 1}</span>
          {scene.finalized && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Finalized</span>}
          <button onClick={() => setCollapsed(c => !c)} className="ml-2 text-xs text-muted-foreground underline">
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button
            className="ml-2 btn btn-xs btn-outline"
            onClick={() => onPreview && onPreview(scene)}
            title="Preview this scene"
          >
            ▶ Preview
          </button>
          <button
            className="ml-2 btn btn-xs btn-outline"
            onClick={handleGenerateStoryboard}
            title="Generate quick storyboard image"
          >
            🖼️ Storyboard
          </button>
          <button
            className="ml-2 btn btn-xs btn-outline"
            onClick={() => handleFinalize(!scene.finalized)}
            title={scene.finalized ? 'Un-finalize scene' : 'Finalize scene'}
          >
            {scene.finalized ? '🔓 Un-finalize' : '🔒 Finalize'}
          </button>
          {/* Voiceover controls */}
          {editable && recipeId && (
            <>
              <button
                className="ml-2 btn btn-xs btn-outline"
                onClick={async () => {
                  if (!scene.advancedOptions?.voice?.enabled) return showNotification('Enable voice-over in Advanced Options first', 'info');
                  try {
                    const { generateVoiceOverAction, markSceneVoiceOverAction } = await import('@/app/actions');
                    // OPTIMIZATION: Get voiceover text and clean it from cues
                    const { prepareForVoiceover } = await import('@/lib/text-pruning');
                    const rawText = scene.advancedOptions?.voice?.text || scene.script.split('\n')[0] || '';
                    const cleanedText = prepareForVoiceover(rawText);

                    if (!cleanedText || cleanedText.length < 10) {
                      return showNotification('Scene text contains only cues/markers. Please add actual narration content.', 'error');
                    }

                    const res = await generateVoiceOverAction(cleanedText, scene.advancedOptions?.voice?.voiceId, { recipeId, sceneNumber: scene.sceneNumber, context: 'scene-voiceover' });
                    if (!res.success || !res.url) return showNotification(res.error || 'Failed to generate voiceover', 'error');
                    const meta = res.metadata ?? undefined;
                    const mark = await markSceneVoiceOverAction(recipeId, scene.sceneNumber, res.url, meta);
                    if (!mark.success) return showNotification(mark.error || 'Failed to save voiceover URL', 'error');
                    onSceneChange({
                      ...scene,
                      voiceOverUrl: res.url,
                      voiceoverMeta: meta ? { ...meta, url: res.url } : scene.voiceoverMeta,
                      advancedOptions: {
                        ...(scene.advancedOptions || {}),
                        voice: {
                          ...(scene.advancedOptions?.voice || {}),
                          enabled: scene.advancedOptions?.voice?.enabled ?? true,
                          url: res.url,
                        },
                      },
                    });
                    const assetMetadata = meta ? { ...meta } : { voiceId: scene.advancedOptions?.voice?.voiceId };
                    onAssetGenerated?.({ type: 'audio', url: res.url, sceneNumber: scene.sceneNumber, metadata: assetMetadata });
                    showNotification('Voiceover generated and saved', 'success');
                  } catch (err) {
                    showNotification((err as Error).message || 'Unknown error generating voiceover', 'error');
                  }
                }}
                title="Generate voiceover for this scene"
              >
                🔉 Generate Voiceover
              </button>
              {voiceUrl && (
                <audio className="ml-2" controls src={String(voiceUrl)} />
              )}
            </>
          )}
          {scene.videoUrl && (
            <>
              <a href={scene.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline ml-2">View Video</a>
              <button
                className="ml-2 btn btn-xs btn-instagram"
                onClick={async () => {
                  if (!recipeId) return;
                  try {
                    const { shareSceneVideoToInstagram } = await import('@/app/actions');
                    const result = await shareSceneVideoToInstagram(recipeId, scene.sceneNumber);
                    if (result.success) {
                      showNotification(`Scene ${scene.sceneNumber} video posted to Instagram successfully! ${result.permalink}`, 'success');
                    } else {
                      showNotification(result.error || 'Failed to post to Instagram', 'error');
                    }
                  } catch (err) {
                    showNotification((err as Error).message || 'Unknown error', 'error');
                  }
                }}
                title="Post this scene video to Instagram as a Reel"
              >
                📸 Post to IG
              </button>
            </>
          )}
          {editable && recipeId && (
            <button
              className={`ml-2 btn btn-xs btn-outline ${loading || scene.finalized ? 'opacity-60 pointer-events-none' : ''}`}
              onClick={() => {
                if (scene.finalized) {
                  showNotification('This scene is finalized and cannot be regenerated. Un-finalize to allow regeneration.', 'info');
                  return;
                }
                if (onRegenerate) onRegenerate(scene.sceneNumber);
              }}
              title={scene.finalized ? 'Scene finalized' : 'Regenerate video for this scene'}
            >
              {loading ? 'Regenerating...' : 'Regenerate Video'}
            </button>
          )}
          {editable && recipeId && (
            <button
              className={`ml-2 btn btn-xs btn-outline ${imageLoading ? 'opacity-60 pointer-events-none' : ''}`}
              onClick={handleGenerateImage}
              disabled={imageLoading}
              title="Generate image for this scene"
            >
              {imageLoading ? 'Generating...' : (scene.imageUrls ? 'Regenerate Image' : 'Generate Image')}
            </button>
          )}
        </div>
        {scene.imageUrls && scene.imageUrls.length > 0 && (
          <div className="mb-2">
            <div className="text-sm font-medium mb-1">Generated Images:</div>
            <div className="flex gap-2 overflow-x-auto">
              {scene.imageUrls.map((url, imgIndex) => (
                <Image key={imgIndex} src={url} alt={`Scene ${index + 1} image ${imgIndex + 1}`} width={160} height={80} className="rounded shadow max-w-40 max-h-20 object-cover flex-shrink-0" />
              ))}
            </div>
          </div>
        )}

        {/* Assets Timeline */}
        <div className="mb-2 border-t pt-2">
          <div className="text-sm font-medium mb-1">Assets:</div>
          <div className="space-y-1">
            {scene.videoUrl && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-muted-foreground">🎬 Video</span>
                <div className="flex-1 bg-blue-100 rounded px-2 py-1">
                  <video controls className="w-full h-8" src={scene.videoUrl} />
                </div>
                <span className="w-12 text-right">{scene.advancedOptions?.duration || 5}s</span>
              </div>
            )}
            {voiceUrl && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-muted-foreground">🎤 Voice</span>
                <div className="flex-1 bg-green-100 rounded px-2 py-1">
                  <audio controls className="w-full h-6" src={voiceUrl} />
                </div>
                <span className="w-24 text-right">
                  {scene.voiceoverMeta?.voiceId || scene.advancedOptions?.voice?.voiceId || 'Voice'}
                </span>
              </div>
            )}
            {scene.imageUrls && scene.imageUrls.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-muted-foreground">🖼️ Images</span>
                <div className="flex-1 bg-yellow-100 rounded px-2 py-1 flex gap-1 overflow-x-auto">
                  {scene.imageUrls.map((url, imgIndex) => (
                    <Image
                      key={imgIndex}
                      src={url}
                      alt={`Scene ${scene.sceneNumber} reference image ${imgIndex + 1}`}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-cover rounded flex-shrink-0"
                    />
                  ))}
                </div>
                <span className="w-12 text-right">{scene.imageUrls.length} img</span>
              </div>
            )}
            {scene.versions && scene.versions.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-muted-foreground">📼 Versions</span>
                <div className="flex-1 bg-purple-100 rounded px-2 py-1 flex gap-1 overflow-x-auto">
                  {scene.versions.map((v, vIndex) => (
                    <div key={vIndex} className="flex flex-col items-center">
                      {v.videoUrl && <video controls className="w-16 h-8" src={v.videoUrl} />}
                      {v.imageUrl && (
                        <Image
                          src={v.imageUrl}
                          alt={`Scene ${scene.sceneNumber} version ${vIndex + 1}`}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <span className="text-xs">{vIndex + 1}</span>
                    </div>
                  ))}
                </div>
                <span className="w-12 text-right">{scene.versions.length} ver</span>
              </div>
            )}
          </div>
        </div>
        {editable ? (
          <>
            {/* Collapsed summary view with quick toggles */}
            {collapsed ? (
              <div className="flex items-center justify-between gap-4 p-2 bg-gray-50 rounded mb-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{cleanForDisplay(scene.description || scene.script.split('\n')[0] || 'Scene')}</div>
                  <div className="text-xs text-muted-foreground">{
                    (() => {
                      const cleaned = removeProductionCues(scene.script);
                      return cleaned.length > 120 ? cleaned.slice(0, 120) + '…' : cleaned;
                    })()
                  }</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs flex items-center gap-1">
                    ⏱
                    <input
                      type="number"
                      min={1}
                      value={scene.advancedOptions?.duration ?? 5}
                      onChange={(e) => onSceneChange({ ...scene, advancedOptions: { ...(scene.advancedOptions || {}), duration: Math.max(1, parseInt(e.target.value || '1')) } })}
                      className="w-16 px-2 py-1 border rounded text-sm"
                      title="Scene duration (s)"
                    />
                  </label>
                  <select
                    value={scene.advancedOptions?.animation?.style || ''}
                    onChange={(e) => onSceneChange({ ...scene, advancedOptions: { ...(scene.advancedOptions || {}), animation: { ...(scene.advancedOptions?.animation || {}), style: e.target.value, enabled: !!e.target.value } } })}
                    className="text-sm px-2 py-1 border rounded"
                    title="Animation style"
                  >
                    <option value="">No Animation</option>
                    {ANIMATION_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={!!scene.advancedOptions?.voice?.enabled} onChange={(e) => onSceneChange({ ...scene, advancedOptions: { ...(scene.advancedOptions || {}), voice: { ...(scene.advancedOptions?.voice || {}), enabled: e.target.checked } } })} />
                    🎤
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={!!scene.advancedOptions?.music?.enabled} onChange={(e) => onSceneChange({ ...scene, advancedOptions: { ...(scene.advancedOptions || {}), music: { ...(scene.advancedOptions?.music || {}), enabled: e.target.checked } } })} />
                    🎵
                  </label>
                </div>
              </div>
            ) : (
              <>
                <Input
                  value={scene.description || ''}
                  onChange={e => onSceneChange({ ...scene, description: e.target.value })}
                  placeholder="Scene description"
                  className="mb-2"
                />
                <Textarea
                  value={scene.script}
                  onChange={e => onSceneChange({ ...scene, script: e.target.value })}
                  placeholder="Scene script"
                  className="mb-2"
                  rows={3}
                />
                {/* Prompt preview/edit field below script */}
                <div className="mb-2">
                  <label className="block text-xs font-semibold mb-1">Prompt Preview / Edit</label>
                  <Textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-xs"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="secondary" onClick={() => setPrompt((scene.description || '') + '. ' + scene.script.replace(/^[\-*\d.\s]+/gm, '').replace(/[*_`>]/g, '').trim())}>AI Fill</Button>
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(prompt)}>Copy Prompt</Button>
                  </div>
                </div>
                {/* Generate buttons below script/prompt */}
                <div className="flex gap-2 mt-2">
                  {editable && recipeId && (
                      <Button size="sm" variant="outline" onClick={() => {
                        if (scene.finalized) return showNotification('Scene is finalized. Un-finalize to regenerate.', 'info');
                        if (onRegenerate) onRegenerate(scene.sceneNumber);
                      }} disabled={loading || scene.finalized} title={scene.finalized ? 'Scene finalized' : 'Regenerate video for this scene'}>
                        {loading ? 'Regenerating...' : 'Regenerate Video'}
                      </Button>
                    )}
                  {editable && recipeId && (
                    <Button size="sm" variant="outline" onClick={handleGenerateImage} disabled={imageLoading} title="Generate image for this scene">
                      {imageLoading ? 'Generating...' : (scene.imageUrls && scene.imageUrls.length > 0 ? 'Generate More Images' : 'Generate Image')}
                    </Button>
                  )}
                </div>
                {/* Advanced Options per scene */}
                <div className="border-t pt-3 mt-2">
                  <button
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="flex items-center justify-between w-full text-left font-semibold text-sm mb-2"
                  >
                    ⚙️ Advanced Options
                    <span className="text-lg">{advancedOpen ? '−' : '+'}</span>
                  </button>
                  {advancedOpen && (
                    <div className="space-y-3 ml-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!scene.advancedOptions?.voice?.enabled}
                          onChange={(e) => onSceneChange({ ...scene, advancedOptions: { ...(scene.advancedOptions || {}), voice: { ...(scene.advancedOptions?.voice || {}), enabled: e.target.checked } } })}
                        />
                        <span className="text-sm">🎤 Voice-over</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!scene.advancedOptions?.music?.enabled}
                          onChange={(e) => onSceneChange({ ...scene, advancedOptions: { ...(scene.advancedOptions || {}), music: { ...(scene.advancedOptions?.music || {}), enabled: e.target.checked } } })}
                        />
                        <span className="text-sm">🎵 Background Music</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!scene.advancedOptions?.animation?.enabled}
                          onChange={(e) => onSceneChange({ ...scene, advancedOptions: { ...(scene.advancedOptions || {}), animation: { ...(scene.advancedOptions?.animation || {}), enabled: e.target.checked } } })}
                        />
                        <span className="text-sm">🎞️ Animation</span>
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {scene.description && <div className="text-sm text-muted-foreground mb-1">{scene.description}</div>}
            <pre className="whitespace-pre-wrap text-xs bg-muted/50 rounded p-2 overflow-x-auto mb-2">{scene.script.replace(/^[\-*\d.\s]+/gm, '').replace(/[*_`>]/g, '').trim()}</pre>
          </>
        )}
      </div>
      {editable && onDelete && (
        <button onClick={() => onDelete(scene.id)} className="ml-2 text-red-500 hover:text-red-700" title="Delete scene">
          <span className="sr-only">Delete scene</span>
          <Trash2 />
        </button>
      )}
    </div>
  );
}

export function SceneEditor({ scenes, onChange, onDelete, onAdd, editable = true, recipeId, reorderEnabled = false, onPreview, onHistory, onAssetGenerated, activeSceneNumber = null, onSceneFocus }: SceneEditorProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  useSceneEditorDragStyle();
  const [internalScenes, setInternalScenes] = useState(scenes);
  const [loadingScene, setLoadingScene] = useState<number | null>(null);

  // Presets for advanced options
  // Note: presets are defined at module level

  // Keep internal state in sync with props
  useEffect(() => {
    setInternalScenes(scenes);
  }, [scenes]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = internalScenes.findIndex(s => s.id === active.id);
      const newIndex = internalScenes.findIndex(s => s.id === over.id);
      const newScenes = arrayMove(internalScenes, oldIndex, newIndex).map((scene, idx) => ({ ...scene, sceneNumber: idx + 1 }));
      setInternalScenes(newScenes);
      onChange(newScenes);
    }
  };

  const handleSceneChange = (idx: number, updated: Scene) => {
    const newScenes = [...internalScenes];
    newScenes[idx] = updated;
    setInternalScenes(newScenes);
    onChange(newScenes);
  };

  const handleDelete = (sceneId: string) => {
    const newScenes = internalScenes.filter(s => s.id !== sceneId).map((scene, idx) => ({ ...scene, sceneNumber: idx + 1 }));
    setInternalScenes(newScenes);
    onChange(newScenes);
    if (onDelete) onDelete(sceneId);
  };

  // Per-scene video regeneration
  const handleRegenerate = async (sceneNumber: number) => {
    if (!recipeId) return;
    setLoadingScene(sceneNumber);
    try {
      // Dynamically import the server action (for client safety)
      const { generateSplitSceneVideoAction } = await import('@/app/actions');
      const result = await generateSplitSceneVideoAction(recipeId, sceneNumber);
      if (result.success && result.videoUrl) {
        // Update the videoUrl for this scene
        const idx = internalScenes.findIndex(s => s.sceneNumber === sceneNumber);
        if (idx !== -1) {
          const updated = { ...internalScenes[idx], videoUrl: result.videoUrl };
          handleSceneChange(idx, updated);
        }
        onAssetGenerated?.({ type: 'video', url: result.videoUrl, sceneNumber, metadata: { source: 'scene-video-regenerate' } });
      } else {
        showNotification(result.error || 'Failed to regenerate video for this scene.', 'error');
      }
    } catch (err) {
      showNotification((err as Error).message || 'Unknown error during regeneration.', 'error');
    } finally {
      setLoadingScene(null);
    }
  };

  return (
    <div>
      {reorderEnabled ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={internalScenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {internalScenes.map((scene, idx) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                index={idx}
                onChange={updated => handleSceneChange(idx, updated)}
                onDelete={handleDelete}
                editable={editable}
                recipeId={recipeId}
                onRegenerate={handleRegenerate}
                loading={loadingScene === scene.sceneNumber}
                reorderEnabled={reorderEnabled}
                onPreview={onPreview}
                onAssetGenerated={onAssetGenerated}
                isActive={activeSceneNumber === scene.sceneNumber}
                onFocus={onSceneFocus}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <div>
          {internalScenes.map((scene, idx) => (
            <SortableSceneItem
              key={scene.id}
              scene={scene}
              index={idx}
              onChange={updated => handleSceneChange(idx, updated)}
              onDelete={handleDelete}
              editable={editable}
              recipeId={recipeId}
              onRegenerate={handleRegenerate}
              loading={loadingScene === scene.sceneNumber}
              reorderEnabled={reorderEnabled}
              onPreview={onPreview}
              onAssetGenerated={onAssetGenerated}
              isActive={activeSceneNumber === scene.sceneNumber}
              onFocus={onSceneFocus}
            />
          ))}
        </div>
      )}
      {editable && onAdd && (
        <Button className="mt-4 w-full" onClick={onAdd} variant="secondary">
          + Add Scene
        </Button>
      )}
    </div>
  );
}

export default SceneEditor;
