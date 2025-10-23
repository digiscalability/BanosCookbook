/**
 * Export Modal Component
 * Allows users to configure export settings and monitor rendering progress
 */

'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExportSettings } from '@/lib/types/video-editor';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (settings: ExportSettings) => void;
  isExporting: boolean;
  progress: number;
  progressMessage: string;
}

export function ExportModal({
  open,
  onOpenChange,
  onExport,
  isExporting,
  progress,
  progressMessage,
}: ExportModalProps) {
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    frameRate: 30,
  });

  const handleExport = () => {
    onExport(exportSettings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Configure your export settings and render the final video.
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{progressMessage}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              This may take a few minutes...
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Resolution */}
            <div className="grid gap-2">
              <Label htmlFor="resolution">Resolution</Label>
              <Select
                value={exportSettings.resolution}
                onValueChange={(value: '720p' | '1080p' | '4k') =>
                  setExportSettings({ ...exportSettings, resolution: value })
                }
              >
                <SelectTrigger id="resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p (1280x720)</SelectItem>
                  <SelectItem value="1080p">1080p (1920x1080) - Recommended</SelectItem>
                  <SelectItem value="4k">4K (3840x2160)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quality */}
            <div className="grid gap-2">
              <Label htmlFor="quality">Quality</Label>
              <Select
                value={exportSettings.quality}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'ultra') =>
                  setExportSettings({ ...exportSettings, quality: value })
                }
              >
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Faster, Smaller File)</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High (Recommended)</SelectItem>
                  <SelectItem value="ultra">Ultra (Slower, Best Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div className="grid gap-2">
              <Label htmlFor="format">Format</Label>
              <Select
                value={exportSettings.format}
                onValueChange={(value: 'mp4' | 'webm' | 'mov') =>
                  setExportSettings({ ...exportSettings, format: value })
                }
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4 (Universal, Recommended)</SelectItem>
                  <SelectItem value="webm">WebM (Web Optimized)</SelectItem>
                  <SelectItem value="mov">MOV (Apple Devices)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frame Rate */}
            <div className="grid gap-2">
              <Label htmlFor="framerate">Frame Rate</Label>
              <Select
                value={exportSettings.frameRate.toString()}
                onValueChange={value =>
                  setExportSettings({
                    ...exportSettings,
                    frameRate: parseInt(value) as 24 | 30 | 60,
                  })
                }
              >
                <SelectTrigger id="framerate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 fps (Cinematic)</SelectItem>
                  <SelectItem value="30">30 fps (Standard)</SelectItem>
                  <SelectItem value="60">60 fps (Smooth)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Presets */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Quick Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExportSettings({
                      format: 'mp4',
                      quality: 'high',
                      resolution: '1080p',
                      frameRate: 30,
                    })
                  }
                >
                  YouTube
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExportSettings({
                      format: 'mp4',
                      quality: 'high',
                      resolution: '1080p',
                      frameRate: 30,
                    })
                  }
                >
                  Instagram
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExportSettings({
                      format: 'mp4',
                      quality: 'medium',
                      resolution: '720p',
                      frameRate: 30,
                    })
                  }
                >
                  TikTok
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Video
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
