'use client';

import { useState } from 'react';

import { generateVoiceOverAction } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const [voiceOptions, setVoiceOptions] = useState<VoiceoverOption>({
    voice: 'alloy',
    language: 'en-US',
    speed: 1.0,
  });

  const availableVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

  const handleGenerateVoiceovers = async () => {
    if (!state.selectedRecipe || state.scenes.length === 0) return;

    try {
      setIsLoading(true);
      const voiceovers = await generateVoiceOverAction(
        state.selectedRecipe.id,
        state.scenes,
        voiceOptions
      );

      setVoiceovers(voiceovers);
    } catch (error) {
      console.error('Failed to generate voiceovers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StepWrapper
      stepNumber={4}
      title="Generate Voiceovers"
      description="AI will create natural-sounding voiceovers for each scene"
      showBack
      showNext={Object.keys(state.voiceovers).length > 0}
      nextLabel="Continue to Editor"
      showSkip={Object.keys(state.voiceovers).length === 0}
      onSkip={() => setVoiceovers({})}
      isLoading={isLoading}
    >
      <div className="space-y-6">
        {/* Voice Options */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Voice</label>
            <Select value={voiceOptions.voice} onValueChange={(v) => setVoiceOptions({ ...voiceOptions, voice: v })}>
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
            <Select value={voiceOptions.language} onValueChange={(l) => setVoiceOptions({ ...voiceOptions, language: l })}>
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
            <Select value={voiceOptions.speed.toString()} onValueChange={(s) => setVoiceOptions({ ...voiceOptions, speed: parseFloat(s) })}>
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
          isLoading={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? `Generating Voiceovers... (${Object.keys(state.voiceovers).length}/${state.scenes.length})` : `Generate Voiceovers for ${state.scenes.length} Scenes`}
        </Button>

        {/* Generated Voiceovers List */}
        {Object.keys(state.voiceovers).length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Generated Voiceovers:</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {state.scenes.map((scene) => {
                const voiceoverUrl = state.voiceovers[scene.sceneNumber];
                return (
                  <Card key={scene.sceneNumber} className="p-3 flex items-center gap-3">
                    <Badge>{scene.sceneNumber}</Badge>
                    <span className="flex-grow text-sm text-gray-600 truncate">{scene.content.substring(0, 50)}</span>
                    {voiceoverUrl ? (
                      <div className="text-xs text-green-600 font-medium">✓ Generated</div>
                    ) : (
                      <div className="text-xs text-gray-400">Pending...</div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          Voiceovers help bring your recipe video to life with professional narration.
        </p>
      </div>
    </StepWrapper>
  );
}
