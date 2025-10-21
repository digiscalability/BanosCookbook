/**
 * Text Panel Component
 * Add and edit text overlays on clips
 */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
    Layers,
    Plus,
    Type
} from 'lucide-react';
import { useState } from 'react';
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

export function TextPanel({
  selectedClipId,
  clipProperties,
  onPropertyUpdate,
}: TextPanelProps) {
  const [activeTextIndex, setActiveTextIndex] = useState<number>(0);

  const textOverlays = clipProperties?.text || [];
  const currentText = textOverlays[activeTextIndex];

  if (!selectedClipId) {
    return (
      <div className="h-full flex flex-col bg-gray-900">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium">Text Overlays</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Text Overlays</h3>
          <Button size="sm" onClick={handleAddText}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Text
          </Button>
        </div>

        {/* Text Layer Tabs */}
        {textOverlays.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {textOverlays.map((text, index) => (
              <button
                key={index}
                onClick={() => setActiveTextIndex(index)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeTextIndex === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                }`}
              >
                Text {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {textOverlays.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-3">No text overlays yet</p>
            <Button size="sm" onClick={handleAddText}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Text
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Text Content */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block uppercase font-medium">
                Content
              </label>
              <Input
                value={currentText?.content || ''}
                onChange={(e) => handleUpdateText({ content: e.target.value })}
                placeholder="Enter text..."
                className="bg-gray-800 border-gray-700"
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block uppercase font-medium">
                Font Family
              </label>
              <select
                value={currentText?.fontFamily || 'Arial'}
                onChange={(e) => handleUpdateText({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm"
                aria-label="Select font family"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 uppercase font-medium">Font Size</label>
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
              <label className="text-xs text-gray-400 mb-2 block uppercase font-medium">
                Text Color
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={currentText?.color || '#FFFFFF'}
                  onChange={(e) => handleUpdateText({ color: e.target.value })}
                  className="w-12 h-10 p-1 bg-gray-800 border-gray-700"
                />
                <div className="flex gap-1 flex-wrap flex-1">
                  {/* eslint-disable-next-line react/forbid-dom-props */}
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleUpdateText({ color })}
                      className="w-6 h-6 rounded border border-gray-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block uppercase font-medium">
                Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">X Position</label>
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
                  <label className="text-xs text-gray-500 mb-1 block">Y Position</label>
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentText?.shadow || false}
                  onChange={(e) => handleUpdateText({ shadow: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <Layers className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Text Shadow</span>
              </label>
            </div>

            {/* Shadow Settings */}
            {currentText?.shadow && (
              <div className="pl-6 space-y-3 border-l-2 border-gray-800">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Shadow Color</label>
                  <Input
                    type="color"
                    value={currentText?.shadowColor || '#000000'}
                    onChange={(e) => handleUpdateText({ shadowColor: e.target.value })}
                    className="w-12 h-10 p-1 bg-gray-800 border-gray-700"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Shadow Blur</label>
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
                    <label className="text-xs text-gray-400 mb-1 block">Offset X</label>
                    <Slider
                      value={[currentText?.shadowOffsetX || 2]}
                      onValueChange={([value]) => handleUpdateText({ shadowOffsetX: value })}
                      min={-20}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">{currentText?.shadowOffsetX || 2}px</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Offset Y</label>
                    <Slider
                      value={[currentText?.shadowOffsetY || 2]}
                      onValueChange={([value]) => handleUpdateText({ shadowOffsetY: value })}
                      min={-20}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">{currentText?.shadowOffsetY || 2}px</span>
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
