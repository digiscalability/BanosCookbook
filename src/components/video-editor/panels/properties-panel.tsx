/**
 * Properties Panel Component
 * Fine-tune clip properties: position, scale, rotation, opacity
 */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
    Eye,
    Move,
    RotateCw,
    Settings,
    ZoomIn
} from 'lucide-react';
import type { ClipProperties } from '../types';

interface PropertiesPanelProps {
  selectedClipId: string | null;
  clipProperties?: ClipProperties;
  onPropertyUpdate: (properties: Partial<ClipProperties>) => void;
}

export function PropertiesPanel({
  selectedClipId,
  clipProperties,
  onPropertyUpdate,
}: PropertiesPanelProps) {
  if (!selectedClipId) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a clip to edit properties</p>
          </div>
        </div>
      </div>
    );
  }

  const position = clipProperties?.position || { x: 0, y: 0 };
  const scale = clipProperties?.scale || { x: 1, y: 1 };
  const rotation = clipProperties?.rotation || 0;
  const opacity = clipProperties?.opacity !== undefined ? clipProperties.opacity : 1;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-medium">Clip Properties</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Position Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Move className="h-4 w-4 text-blue-500" />
              <h4 className="text-sm font-medium uppercase text-gray-400">Position</h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">X Position</label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[position.x]}
                    onValueChange={([value]) =>
                      onPropertyUpdate({ position: { ...position, x: value } })
                    }
                    min={-100}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={position.x}
                    onChange={(e) =>
                      onPropertyUpdate({
                        position: { ...position, x: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-20 bg-gray-800 border-gray-700 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Y Position</label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[position.y]}
                    onValueChange={([value]) =>
                      onPropertyUpdate({ position: { ...position, y: value } })
                    }
                    min={-100}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={position.y}
                    onChange={(e) =>
                      onPropertyUpdate({
                        position: { ...position, y: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-20 bg-gray-800 border-gray-700 text-sm"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPropertyUpdate({ position: { x: 0, y: 0 } })}
                className="w-full"
              >
                Reset Position
              </Button>
            </div>
          </div>

          {/* Scale Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ZoomIn className="h-4 w-4 text-purple-500" />
              <h4 className="text-sm font-medium uppercase text-gray-400">Scale</h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Scale X</label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[scale.x * 100]}
                    onValueChange={([value]) =>
                      onPropertyUpdate({ scale: { ...scale, x: value / 100 } })
                    }
                    min={10}
                    max={300}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={(scale.x * 100).toFixed(0)}
                    onChange={(e) =>
                      onPropertyUpdate({
                        scale: { ...scale, x: (parseFloat(e.target.value) || 100) / 100 },
                      })
                    }
                    className="w-20 bg-gray-800 border-gray-700 text-sm"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Scale Y</label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[scale.y * 100]}
                    onValueChange={([value]) =>
                      onPropertyUpdate({ scale: { ...scale, y: value / 100 } })
                    }
                    min={10}
                    max={300}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={(scale.y * 100).toFixed(0)}
                    onChange={(e) =>
                      onPropertyUpdate({
                        scale: { ...scale, y: (parseFloat(e.target.value) || 100) / 100 },
                      })
                    }
                    className="w-20 bg-gray-800 border-gray-700 text-sm"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={scale.x === scale.y}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onPropertyUpdate({ scale: { x: scale.x, y: scale.x } });
                    }
                  }}
                  className="w-4 h-4 rounded"
                />
                Lock Aspect Ratio
              </label>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPropertyUpdate({ scale: { x: 1, y: 1 } })}
                className="w-full"
              >
                Reset Scale
              </Button>
            </div>
          </div>

          {/* Rotation Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <RotateCw className="h-4 w-4 text-green-500" />
              <h4 className="text-sm font-medium uppercase text-gray-400">Rotation</h4>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <Slider
                  value={[rotation]}
                  onValueChange={([value]) => onPropertyUpdate({ rotation: value })}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={rotation}
                  onChange={(e) =>
                    onPropertyUpdate({ rotation: parseFloat(e.target.value) || 0 })
                  }
                  className="w-20 bg-gray-800 border-gray-700 text-sm"
                />
                <span className="text-xs text-gray-400">°</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPropertyUpdate({ rotation: -90 })}
                >
                  -90°
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPropertyUpdate({ rotation: 0 })}
                >
                  0°
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPropertyUpdate({ rotation: 90 })}
                >
                  90°
                </Button>
              </div>
            </div>
          </div>

          {/* Opacity Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-yellow-500" />
              <h4 className="text-sm font-medium uppercase text-gray-400">Opacity</h4>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <Slider
                  value={[opacity * 100]}
                  onValueChange={([value]) => onPropertyUpdate({ opacity: value / 100 })}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={(opacity * 100).toFixed(0)}
                  onChange={(e) =>
                    onPropertyUpdate({ opacity: (parseFloat(e.target.value) || 0) / 100 })
                  }
                  className="w-20 bg-gray-800 border-gray-700 text-sm"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPropertyUpdate({ opacity: 1 })}
                className="w-full"
              >
                Reset Opacity
              </Button>
            </div>
          </div>

          {/* Reset All */}
          <div className="pt-4 border-t border-gray-800">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onPropertyUpdate({
                  position: { x: 0, y: 0 },
                  scale: { x: 1, y: 1 },
                  rotation: 0,
                  opacity: 1,
                });
              }}
              className="w-full"
            >
              Reset All Properties
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
