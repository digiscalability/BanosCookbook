/**
 * Canvas Overlay Component
 * Renders effects, text overlays, and visual elements on top of video preview
 * Uses Fabric.js for canvas manipulation
 */

'use client';

import * as fabric from 'fabric';
import { useEffect, useRef, useState } from 'react';

import type { Clip, ClipProperties, Effect } from '../types';

interface CanvasOverlayProps {
  width: number;
  height: number;
  currentTime: number;
  activeClip: Clip | null;
  isPlaying: boolean;
}

export function CanvasOverlay({
  width,
  height,
  currentTime,
  activeClip,
  isPlaying,
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'transparent',
      selection: !isPlaying, // Disable selection during playback
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    setIsInitialized(true);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      setIsInitialized(false);
    };
  }, [width, height, isInitialized, isPlaying]);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setDimensions({ width, height });
  }, [width, height]);

  // Toggle selection based on playback state
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.selection = !isPlaying;
  }, [isPlaying]);

  // Render effects and text overlays
  useEffect(() => {
    if (!fabricCanvasRef.current || !activeClip) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Apply clip properties (opacity, filters)
    if (activeClip.properties) {
      applyClipProperties(canvas, activeClip.properties, currentTime, activeClip);
    }

    // Render effects
    if (activeClip.effects && activeClip.effects.length > 0) {
      renderEffects(canvas, activeClip.effects, currentTime, activeClip);
    }

    // Render text overlays
    if (activeClip.properties?.text) {
      renderTextOverlay(canvas, activeClip.properties);
    }

    canvas.renderAll();
  }, [activeClip, currentTime]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10" />;
}

// ============================================================================
// Effect Rendering Functions
// ============================================================================

function applyClipProperties(
  canvas: fabric.Canvas,
  properties: ClipProperties,
  _currentTime: number,
  _clip: Clip
) {
  // Apply opacity
  if (properties.opacity !== undefined) {
    canvas.backgroundColor = `rgba(0, 0, 0, ${(100 - properties.opacity) / 100})`;
    canvas.renderAll();
  }

  // Apply filters
  if (properties.filters) {
    const overlay = new fabric.Rect({
      left: 0,
      top: 0,
      width: canvas.width || 0,
      height: canvas.height || 0,
      fill: 'rgba(0, 0, 0, 0)',
      selectable: false,
      evented: false,
    });

    const filters: unknown[] = [];

    if (properties.filters.brightness !== undefined && properties.filters.brightness !== 100) {
      filters.push(
        new fabric.filters.Brightness({
          brightness: (properties.filters.brightness - 100) / 100,
        })
      );
    }

    if (properties.filters.contrast !== undefined && properties.filters.contrast !== 100) {
      filters.push(
        new fabric.filters.Contrast({
          contrast: (properties.filters.contrast - 100) / 100,
        })
      );
    }

    if (properties.filters.saturation !== undefined && properties.filters.saturation !== 100) {
      filters.push(
        new fabric.filters.Saturation({
          saturation: (properties.filters.saturation - 100) / 100,
        })
      );
    }

    if (properties.filters.blur && properties.filters.blur > 0) {
      filters.push(
        new fabric.filters.Blur({
          blur: properties.filters.blur / 10,
        })
      );
    }

    if (properties.filters.sepia && properties.filters.sepia > 0) {
      filters.push(new fabric.filters.Sepia());
    }

    if (properties.filters.grayscale && properties.filters.grayscale > 0) {
      filters.push(new fabric.filters.Grayscale());
    }

    if (filters.length > 0) {
      // TODO: Apply filters in v6 when full filter API is stable
      canvas.add(overlay);
    }
  }
}

function renderEffects(canvas: fabric.Canvas, effects: Effect[], currentTime: number, clip: Clip) {
  const relativeTime = currentTime - clip.startTime;

  effects.forEach(effect => {
    const effectStart = effect.startTime;
    const effectEnd = effect.startTime + effect.duration;

    // Check if effect is active at current time
    if (relativeTime < effectStart || relativeTime > effectEnd) return;

    // Calculate effect progress (0-1)
    const progress = (relativeTime - effectStart) / effect.duration;

    switch (effect.type) {
      case 'fade-in':
        renderFadeEffect(canvas, progress, 'in');
        break;
      case 'fade-out':
        renderFadeEffect(canvas, progress, 'out');
        break;
      case 'zoom-in':
        renderZoomEffect(canvas, progress, 'in');
        break;
      case 'zoom-out':
        renderZoomEffect(canvas, progress, 'out');
        break;
      default:
        console.warn(`🎬 Unknown effect type: ${effect.type}`);
    }
  });
}

function renderFadeEffect(canvas: fabric.Canvas, progress: number, direction: 'in' | 'out') {
  const opacity = direction === 'in' ? progress : 1 - progress;
  const overlay = new fabric.Rect({
    left: 0,
    top: 0,
    width: canvas.width || 0,
    height: canvas.height || 0,
    fill: `rgba(0, 0, 0, ${1 - opacity})`,
    selectable: false,
    evented: false,
  });
  canvas.add(overlay);
}

function renderZoomEffect(canvas: fabric.Canvas, progress: number, direction: 'in' | 'out') {
  const scale = direction === 'in' ? 1 + progress * 0.2 : 1.2 - progress * 0.2;
  const scaleIndicator = new fabric.Circle({
    left: (canvas.width || 0) / 2,
    top: (canvas.height || 0) / 2,
    radius: 50 * scale,
    fill: 'transparent',
    stroke: 'rgba(255, 255, 255, 0.3)',
    strokeWidth: 2,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center',
  });
  canvas.add(scaleIndicator);
}

function renderTextOverlay(canvas: fabric.Canvas, properties: ClipProperties) {
  if (!properties.text || properties.text.length === 0) return;

  properties.text.forEach(textData => {
    const {
      content,
      fontSize,
      fontFamily,
      color,
      x,
      y,
      shadow,
      shadowColor,
      shadowBlur,
      shadowOffsetX,
      shadowOffsetY,
    } = textData;

    const canvasWidth = canvas.width || 1920;
    const canvasHeight = canvas.height || 1080;

    const text = new fabric.Text(content, {
      left: ((x || 50) * canvasWidth) / 100,
      top: ((y || 50) * canvasHeight) / 100,
      fontSize: fontSize || 48,
      fontFamily: fontFamily || 'Arial',
      fill: color || '#ffffff',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      shadow: shadow
        ? new fabric.Shadow({
            color: shadowColor || 'rgba(0, 0, 0, 0.8)',
            blur: shadowBlur || 4,
            offsetX: shadowOffsetX || 2,
            offsetY: shadowOffsetY || 2,
          })
        : undefined,
    });

    canvas.add(text);
  });
}
