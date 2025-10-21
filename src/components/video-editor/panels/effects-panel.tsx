/**
 * Effects Panel Component
 * Browse and apply visual effects to selected clips
 */

'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
    CircleDashed,
    Contrast,
    Droplets,
    Eye,
    Palette,
    Sparkles,
    Sun,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { ClipProperties, Effect, EffectType } from '../types';

interface EffectsPanelProps {
  selectedClipId: string | null;
  clipProperties?: ClipProperties;
  clipEffects?: Effect[];
  onEffectAdd: (effect: Omit<Effect, 'id'>) => void;
  onEffectRemove: (effectId: string) => void;
  onPropertyUpdate: (properties: Partial<ClipProperties>) => void;
}

interface EffectTemplate {
  type: EffectType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultDuration: number;
  color: string;
}

const EFFECT_TEMPLATES: EffectTemplate[] = [
  {
    type: 'fade-in',
    name: 'Fade In',
    description: 'Gradually appear from black',
    icon: Eye,
    defaultDuration: 1,
    color: 'text-blue-500',
  },
  {
    type: 'fade-out',
    name: 'Fade Out',
    description: 'Gradually disappear to black',
    icon: Eye,
    defaultDuration: 1,
    color: 'text-blue-500',
  },
  {
    type: 'zoom-in',
    name: 'Zoom In',
    description: 'Smooth zoom into frame',
    icon: Zap,
    defaultDuration: 2,
    color: 'text-purple-500',
  },
  {
    type: 'zoom-out',
    name: 'Zoom Out',
    description: 'Smooth zoom out of frame',
    icon: Zap,
    defaultDuration: 2,
    color: 'text-purple-500',
  },
];

export function EffectsPanel({
  selectedClipId,
  clipProperties,
  clipEffects = [],
  onEffectAdd,
  onEffectRemove,
  onPropertyUpdate,
}: EffectsPanelProps) {
  const [activeTab, setActiveTab] = useState<'effects' | 'filters'>('effects');

  const filters = clipProperties?.filters || {};

  if (!selectedClipId) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium">Effects & Filters</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a clip to add effects</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-medium mb-3">Effects & Filters</h3>

        {/* Tabs */}
        <div className="flex gap-1">
          <Button
            variant={activeTab === 'effects' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('effects')}
            className="flex-1"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Effects
          </Button>
          <Button
            variant={activeTab === 'filters' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('filters')}
            className="flex-1"
          >
            <Palette className="h-4 w-4 mr-1.5" />
            Filters
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {activeTab === 'effects' ? (
          <div className="p-4 space-y-4">
            {/* Effect Library */}
            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase font-medium">Add Effect</p>
              <div className="grid grid-cols-2 gap-2">
                {EFFECT_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.type}
                      onClick={() => {
                        onEffectAdd({
                          type: template.type,
                          startTime: 0,
                          duration: template.defaultDuration,
                          parameters: {},
                        });
                      }}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors text-center"
                    >
                      <Icon className={`h-6 w-6 ${template.color}`} />
                      <span className="text-xs font-medium">{template.name}</span>
                      <span className="text-[10px] text-gray-400">{template.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Effects */}
            {clipEffects.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase font-medium">Active Effects ({clipEffects.length})</p>
                <div className="space-y-2">
                  {clipEffects.map((effect) => {
                    const template = EFFECT_TEMPLATES.find((t) => t.type === effect.type);
                    if (!template) return null;

                    const Icon = template.icon;
                    return (
                      <div key={effect.id} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                        <Icon className={`h-4 w-4 ${template.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{template.name}</p>
                          <p className="text-xs text-gray-400">
                            {effect.startTime.toFixed(1)}s • {effect.duration.toFixed(1)}s
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEffectRemove(effect.id)}
                          className="h-8 w-8 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Brightness */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-500" />
                  <label className="text-sm font-medium">Brightness</label>
                </div>
                <span className="text-xs text-gray-400">{filters.brightness || 100}%</span>
              </div>
              <Slider
                value={[filters.brightness || 100]}
                onValueChange={([value]) => {
                  onPropertyUpdate({
                    filters: { ...filters, brightness: value },
                  });
                }}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Contrast className="h-4 w-4 text-gray-400" />
                  <label className="text-sm font-medium">Contrast</label>
                </div>
                <span className="text-xs text-gray-400">{filters.contrast || 100}%</span>
              </div>
              <Slider
                value={[filters.contrast || 100]}
                onValueChange={([value]) => {
                  onPropertyUpdate({
                    filters: { ...filters, contrast: value },
                  });
                }}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <label className="text-sm font-medium">Saturation</label>
                </div>
                <span className="text-xs text-gray-400">{filters.saturation || 100}%</span>
              </div>
              <Slider
                value={[filters.saturation || 100]}
                onValueChange={([value]) => {
                  onPropertyUpdate({
                    filters: { ...filters, saturation: value },
                  });
                }}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Blur */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CircleDashed className="h-4 w-4 text-purple-500" />
                  <label className="text-sm font-medium">Blur</label>
                </div>
                <span className="text-xs text-gray-400">{filters.blur || 0}px</span>
              </div>
              <Slider
                value={[filters.blur || 0]}
                onValueChange={([value]) => {
                  onPropertyUpdate({
                    filters: { ...filters, blur: value },
                  });
                }}
                min={0}
                max={10}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onPropertyUpdate({
                  filters: {
                    brightness: 100,
                    contrast: 100,
                    saturation: 100,
                    blur: 0,
                  },
                });
              }}
              className="w-full"
            >
              Reset All Filters
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
