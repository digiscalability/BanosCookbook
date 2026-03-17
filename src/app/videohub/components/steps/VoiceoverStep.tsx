'use client';

import { useState } from 'react';

import { generateVoiceOverAction } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useVideoHub } from '../../context/VideoHubProvider';

interface VoiceoverOption {
  voice: string;
  language: string;
  speed: number;
}

export function VoiceoverStep() {
  const { state, setVoiceovers } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, 'pending' | 'generating' | 'done' | 'error'>>({});
  // Per-scene error messages (Bug 6)
  const [sceneErrors, setSceneErrors] = useState<Record<number, string>>({});
  // Per-scene audio durations (seconds, measured via onLoadedMetadata)
  const [audioDurations, setAudioDurations] = useState<Record<number, number>>({});
  const [voiceOptions, setVoiceOptions] = useState<VoiceoverOption>({
    voice: 'alloy',
    language: 'en-US', // TODO: language/speed are UI-only until generateVoiceOverAction accepts them (Bug 7)
    speed: 1.0,        // TODO: speed is UI-only until generateVoiceOverAction accepts it (Bug 7)
  });

  const availableVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  const doneCount = Object.values(progressMap).filter(s => s === 'done').length;
  const totalScenes = state.scenes.length;

  const handleGenerateVoiceovers = async () => {
    if (!state.selectedRecipe || totalScenes === 0) return;

    setIsLoading(true);
    setSceneErrors({});
    // Reset progress state
    const initial: Record<number, 'pending' | 'generating' | 'done' | 'error'> = {};
    for (const scene of state.scenes) initial[scene.sceneNumber] = 'pending';
    setProgressMap(initial);

    // Fire all scenes in parallel, updating progress per scene as each resolves
    const voiceoverMap: Record<number, string> = {};
    await Promise.all(
      state.scenes.map(async (scene) => {
        setProgressMap(prev => ({ ...prev, [scene.sceneNumber]: 'generating' }));
        try {
          const result = await generateVoiceOverAction(
            String(scene.content ?? ""),
            voiceOptions.voice,
            { recipeId: state.selectedRecipe?.id, sceneNumber: scene.sceneNumber }
          );
          if (result.url) {
            voiceoverMap[scene.sceneNumber] = result.url;
            setProgressMap(prev => ({ ...prev, [scene.sceneNumber]: 'done' }));
          } else {
            const errMsg = result.error ?? 'Failed to generate voiceover';
            setProgressMap(prev => ({ ...prev, [scene.sceneNumber]: 'error' }));
            setSceneErrors(prev => ({ ...prev, [scene.sceneNumber]: errMsg }));
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to generate voiceover';
          setProgressMap(prev => ({ ...prev, [scene.sceneNumber]: 'error' }));
          setSceneErrors(prev => ({ ...prev, [scene.sceneNumber]: errMsg }));
        }
      })
    );

    setVoiceovers(voiceoverMap);
    setIsLoading(false);
  };

  const handleRegenerateOne = async (sceneNumber: number) => {
    const scene = state.scenes.find(s => s.sceneNumber === sceneNumber);
    if (!scene || !state.selectedRecipe) return;
    setProgressMap(prev => ({ ...prev, [sceneNumber]: 'generating' }));
    setSceneErrors(prev => { const next = { ...prev }; delete next[sceneNumber]; return next; });
    try {
      const result = await generateVoiceOverAction(
        String(scene.content ?? ""),
        voiceOptions.voice,
        { recipeId: state.selectedRecipe.id, sceneNumber }
      );
      if (result.url) {
        const updated = { ...state.voiceovers, [sceneNumber]: result.url };
        setVoiceovers(updated);
        setProgressMap(prev => ({ ...prev, [sceneNumber]: 'done' }));
      } else {
        const errMsg = result.error ?? 'Failed to generate voiceover';
        setProgressMap(prev => ({ ...prev, [sceneNumber]: 'error' }));
        setSceneErrors(prev => ({ ...prev, [sceneNumber]: errMsg }));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to generate voiceover';
      setProgressMap(prev => ({ ...prev, [sceneNumber]: 'error' }));
      setSceneErrors(prev => ({ ...prev, [sceneNumber]: errMsg }));
    }
  };

  const progressPct = totalScenes > 0 ? (doneCount / totalScenes) * 100 : 0;
  const hasVoiceovers = Object.keys(state.voiceovers).length > 0;
  // Allow proceeding even if all voiceovers failed — user can continue without voiceovers (Bug 6/8)
  const generationAttempted = Object.keys(progressMap).length > 0 && !isLoading;

  return (
    <StepWrapper
      stepNumber={4}
      title="Generate Voiceovers"
      description="AI creates natural-sounding narration for each scene — all generated in parallel"
      showBack
      showNext={hasVoiceovers || generationAttempted}
      nextLabel="Continue to Editor"
      showSkip={!hasVoiceovers && !isLoading && !generationAttempted}
      onSkip={() => setVoiceovers({})}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        {/* Voice Options */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
            <Select
              value={voiceOptions.voice}
              onValueChange={(v) => setVoiceOptions({ ...voiceOptions, voice: v })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map(v => (
                  <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <Select
              value={voiceOptions.language}
              onValueChange={(l) => setVoiceOptions({ ...voiceOptions, language: l })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="en-GB">English (UK)</SelectItem>
                <SelectItem value="es-ES">Spanish</SelectItem>
                <SelectItem value="fr-FR">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Speed</label>
            <Select
              value={voiceOptions.speed.toString()}
              onValueChange={(s) => setVoiceOptions({ ...voiceOptions, speed: parseFloat(s) })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.75">Slow (0.75x)</SelectItem>
                <SelectItem value="1">Normal (1.0x)</SelectItem>
                <SelectItem value="1.25">Fast (1.25x)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateVoiceovers}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading
            ? `Generating Voiceovers… ${doneCount}/${totalScenes} done`
            : hasVoiceovers
              ? `Regenerate All ${totalScenes} Voiceovers`
              : `Generate Voiceovers for ${totalScenes} Scenes`}
        </Button>

        {/* Skip voiceovers button — available after failed generation so user is never stuck (Bug 8) */}
        {generationAttempted && !hasVoiceovers && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setVoiceovers({})}
          >
            Skip Voiceovers — Continue Without Audio
          </Button>
        )}

        {/* Overall progress bar (shown during generation) */}
        {isLoading && (
          <div className="space-y-1">
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-center text-gray-500">
              All scenes generate in parallel — usually done in under a minute
            </p>
          </div>
        )}

        {/* Per-scene list */}
        {(isLoading || hasVoiceovers || generationAttempted) && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Scenes</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {state.scenes.map((scene) => {
                const status = progressMap[scene.sceneNumber];
                const voiceoverUrl = state.voiceovers[scene.sceneNumber];
                const isSceneGenerating = status === 'generating';
                const isSceneError = status === 'error';
                const sceneErrMsg = sceneErrors[scene.sceneNumber];

                return (
                  <Card key={scene.sceneNumber} className="p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant={isSceneError ? 'destructive' : 'secondary'}>
                        {scene.sceneNumber}
                      </Badge>
                      <span className="flex-grow text-sm text-gray-600 truncate">
                        {String(scene.content ?? '').substring(0, 60)}…
                      </span>
                      <div className="shrink-0 text-xs font-medium">
                        {isSceneGenerating && <span className="text-blue-500 animate-pulse">Generating…</span>}
                        {status === 'done' && <span className="text-green-600">✓ Done</span>}
                        {isSceneError && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs text-red-600 border-red-300"
                            onClick={() => handleRegenerateOne(scene.sceneNumber)}
                          >
                            Retry
                          </Button>
                        )}
                        {(!status || status === 'pending') && voiceoverUrl && (
                          <span className="text-green-600">✓ Ready</span>
                        )}
                      </div>
                    </div>

                    {/* Per-scene error message */}
                    {isSceneError && sceneErrMsg && (
                      <p className="text-xs text-red-600 mt-1 ml-1">{sceneErrMsg}</p>
                    )}

                    {/* Audio preview */}
                    {voiceoverUrl && (
                      <div className="space-y-1">
                        <audio
                          controls
                          src={voiceoverUrl}
                          className="w-full h-8"
                          onLoadedMetadata={(e) => {
                            const dur = (e.currentTarget as HTMLAudioElement).duration;
                            if (isFinite(dur)) {
                              setAudioDurations(prev => ({ ...prev, [scene.sceneNumber]: Math.round(dur * 10) / 10 }));
                            }
                          }}
                        />
                        {audioDurations[scene.sceneNumber] != null && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">
                              Audio: {audioDurations[scene.sceneNumber]}s
                            </span>
                            {scene.duration != null &&
                              audioDurations[scene.sceneNumber] > (scene.duration as number) && (
                              <span className="text-amber-600 font-medium">
                                Warning: voiceover ({audioDurations[scene.sceneNumber]}s) is longer than video clip ({scene.duration as number}s)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StepWrapper>
  );
}
