/**
 * Text Panel Component
 * Add and edit text overlays on clips
 */

'use client';

import { Layers, Plus, Type } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

import type { ClipProperties } from '../types';

interface TextPanelProps {
  selectedClipId: string | null;
  clipProperties?: ClipProperties;
  onPropertyUpdate: (properties: Partial<ClipProperties>) => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Impact',
  'Comic Sans MS',
];

const PRESET_COLORS = [
  '#FFFFFF', // White
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
];

export function TextPanel({ selectedClipId, clipProperties, onPropertyUpdate }: TextPanelProps) {
  const [activeTextIndex, setActiveTextIndex] = useState<number>(0);

  const textOverlays = clipProperties?.text || [];
  const currentText = textOverlays[activeTextIndex];

  if (!selectedClipId) {
    return (
      <div className="flex h-full flex-col bg-gray-900">
        <div className="border-b border-gray-800 p-4">
          <h3 className="text-sm font-medium">Text Overlays</h3>
        </div>
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <div className="text-center">
            <Type className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p className="text-sm">Select a clip to add text</p>
          </div>
        </div>
      </div>
    );
  }

  const handleAddText = () => {
    const newText = {
      content: 'New Text',
      fontFamily: 'Arial',
      fontSize: 48,
      color: '#FFFFFF',
      x: 50, // Center X
      y: 50, // Center Y
      shadow: true,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
    };

    onPropertyUpdate({
      text: [...textOverlays, newText],
    });

    setActiveTextIndex(textOverlays.length);
  };

  const handleUpdateText = (updates: Partial<typeof currentText>) => {
    const updatedTexts = [...textOverlays];
    updatedTexts[activeTextIndex] = { ...currentText, ...updates };
    onPropertyUpdate({ text: updatedTexts });
  };

  const handleRemoveText = (index: number) => {
    const updatedTexts = textOverlays.filter((_, i) => i !== index);
    onPropertyUpdate({ text: updatedTexts });
    if (activeTextIndex >= updatedTexts.length) {
      setActiveTextIndex(Math.max(0, updatedTexts.length - 1));
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Text Overlays</h3>
          <Button size="sm" onClick={handleAddText}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Text
          </Button>
        </div>

        {/* Text Layer Tabs */}
        {textOverlays.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {textOverlays.map((text, index) => (
              <button
                key={index}
                onClick={() => setActiveTextIndex(index)}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  activeTextIndex === index
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-750 bg-gray-800 text-gray-300'
                }`}
              >
                Text {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {textOverlays.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <div className="text-center">
            <Type className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p className="mb-3 text-sm">No text overlays yet</p>
            <Button size="sm" onClick={handleAddText}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Text
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {/* Text Content */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase text-gray-400">
                Content
              </label>
              <Input
                value={currentText?.content || ''}
                onChange={e => handleUpdateText({ content: e.target.value })}
                placeholder="Enter text..."
                className="border-gray-700 bg-gray-800"
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase text-gray-400">
                Font Family
              </label>
              <select
                value={currentText?.fontFamily || 'Arial'}
                onChange={e => handleUpdateText({ fontFamily: e.target.value })}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                aria-label="Select font family"
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium uppercase text-gray-400">Font Size</label>
                <span className="text-xs text-gray-400">{currentText?.fontSize || 48}px</span>
              </div>
              <Slider
                value={[currentText?.fontSize || 48]}
                onValueChange={([value]) => handleUpdateText({ fontSize: value })}
                min={12}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Color */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase text-gray-400">
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={currentText?.color || '#FFFFFF'}
                  onChange={e => handleUpdateText({ color: e.target.value })}
                  className="h-10 w-12 border-gray-700 bg-gray-800 p-1"
                />
                <div className="flex flex-1 flex-wrap gap-1">
                  {/* eslint-disable-next-line react/forbid-dom-props */}
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => handleUpdateText({ color })}
                      className="h-6 w-6 rounded border border-gray-600 transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase text-gray-400">
                Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">X Position</label>
                  <Slider
                    value={[currentText?.x || 50]}
                    onValueChange={([value]) => handleUpdateText({ x: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{currentText?.x || 50}%</span>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Y Position</label>
                  <Slider
                    value={[currentText?.y || 50]}
                    onValueChange={([value]) => handleUpdateText({ y: value })}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{currentText?.y || 50}%</span>
                </div>
              </div>
            </div>

            {/* Shadow Toggle */}
            <div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentText?.shadow || false}
                  onChange={e => handleUpdateText({ shadow: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <Layers className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Text Shadow</span>
              </label>
            </div>

            {/* Shadow Settings */}
            {currentText?.shadow && (
              <div className="space-y-3 border-l-2 border-gray-800 pl-6">
                <div>
                  <label className="mb-2 block text-xs text-gray-400">Shadow Color</label>
                  <Input
                    type="color"
                    value={currentText?.shadowColor || '#000000'}
                    onChange={e => handleUpdateText({ shadowColor: e.target.value })}
                    className="h-10 w-12 border-gray-700 bg-gray-800 p-1"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Shadow Blur</label>
                  <Slider
                    value={[currentText?.shadowBlur || 4]}
                    onValueChange={([value]) => handleUpdateText({ shadowBlur: value })}
                    min={0}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{currentText?.shadowBlur || 4}px</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Offset X</label>
                    <Slider
                      value={[currentText?.shadowOffsetX || 2]}
                      onValueChange={([value]) => handleUpdateText({ shadowOffsetX: value })}
                      min={-20}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">
                      {currentText?.shadowOffsetX || 2}px
                    </span>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Offset Y</label>
                    <Slider
                      value={[currentText?.shadowOffsetY || 2]}
                      onValueChange={([value]) => handleUpdateText({ shadowOffsetY: value })}
                      min={-20}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">
                      {currentText?.shadowOffsetY || 2}px
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Remove Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleRemoveText(activeTextIndex)}
              className="w-full"
            >
              Remove This Text
            </Button>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
