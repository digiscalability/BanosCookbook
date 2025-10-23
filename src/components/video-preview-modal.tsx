'use client';
import { useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showNotification } from '@/lib/notify';

interface VideoPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl?: string;
  imageUrl?: string;
  isLoading?: boolean;
  error?: string;
  recipeId?: string;
  recipeTitle?: string;
}

export default function VideoPreviewModal({
  open,
  onOpenChange,
  videoUrl,
  imageUrl,
  isLoading,
  error,
  recipeId,
  recipeTitle,
}: VideoPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [instagramPosting, setInstagramPosting] = useState(false);

  const handleDownload = async () => {
    if (!videoUrl) return;

    setDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipe-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCapCutExport = async () => {
    if (!videoUrl) return;

    setDownloading(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipe-video-capcut-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show CapCut instructions
      setTimeout(() => {
        showNotification(
          'Video downloaded! Open CapCut app and import this file to start editing your recipe video.',
          'info'
        );
      }, 1000);
    } catch (err) {
      console.error('CapCut export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleInstagramPost = async () => {
    if (!recipeId) return;

    setInstagramPosting(true);
    try {
      const { shareVideoToInstagram } = await import('@/app/actions');
      const result = await shareVideoToInstagram(recipeId);
      if (!result.success) {
        showNotification(result.error || 'Failed to post to Instagram', 'error');
      } else {
        showNotification(`Video posted to Instagram successfully! ${result.permalink}`, 'success');
      }
    } catch (err) {
      showNotification((err as Error).message || 'Unknown error', 'error');
    } finally {
      setInstagramPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">🎬 Recipe Video Preview</DialogTitle>
          {recipeTitle ? <div className="text-sm text-muted-foreground">{recipeTitle}</div> : null}
        </DialogHeader>

        <div className="flex flex-col gap-6 p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-primary" />
              <p className="font-semibold text-muted-foreground">
                Generating video with Runway ML Gen-4 Turbo...
              </p>
              <p className="text-sm text-muted-foreground">This may take 1-2 minutes</p>
              <div className="max-w-md rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs text-blue-600">
                  💡 The AI is creating a cinematic video from your recipe image and script. Please
                  wait while the magic happens!
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <div className="mb-2 font-semibold text-red-600">❌ Error</div>
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('RUNWAY_API_KEY') && (
                <div className="mt-4 text-xs text-red-600">
                  <p className="mb-1 font-semibold">Setup Required:</p>
                  <p>
                    1. Sign up at{' '}
                    <a
                      href="https://dev.runwayml.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      dev.runwayml.com
                    </a>
                  </p>
                  <p>2. Get your API key from the dashboard</p>
                  <p>3. Add RUNWAY_API_KEY to your .env file</p>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && videoUrl && (
            <>
              <div className="overflow-hidden rounded-xl border-2 border-primary/30 bg-black">
                <video src={videoUrl} controls autoPlay loop className="h-auto max-h-[70vh] w-full">
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="btn btn-secondary"
                  onClick={() => window.open(videoUrl, '_blank')}
                >
                  🔗 Open in New Tab
                </button>
                <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
                  {downloading ? '⏳ Downloading...' : '⬇️ Download Video'}
                </button>
                <button
                  className="btn btn-accent"
                  onClick={handleCapCutExport}
                  disabled={downloading}
                  title="Download and edit in CapCut for professional video editing"
                >
                  🎬 Edit in CapCut
                </button>
                {recipeId && (
                  <button
                    className="btn btn-instagram"
                    onClick={handleInstagramPost}
                    disabled={instagramPosting}
                    title="Post this video to Instagram as a Reel"
                  >
                    {instagramPosting ? '📤 Posting...' : '📸 Post to Instagram'}
                  </button>
                )}
              </div>

              <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-semibold text-purple-700">
                  <span>✨</span>
                  <span>Powered by Runway ML Gen-4 Turbo</span>
                </div>
                <p className="mb-2 text-xs text-purple-600">
                  This video was generated using AI from your recipe image and video script. The
                  system transforms your static recipe image into a dynamic 5-second cinematic video
                  with smooth camera movements and professional food cinematography.
                </p>
                {imageUrl && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
                    <span>📸 Source image:</span>
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-purple-800"
                    >
                      View original recipe image
                    </a>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-semibold text-green-700">
                  <span>🎬</span>
                  <span>Edit in CapCut for Professional Results</span>
                </div>
                <p className="mb-2 text-xs text-green-600">
                  Take your recipe video to the next level with CapCut&apos;s professional editing
                  tools:
                </p>
                <ul className="ml-4 space-y-1 text-xs text-green-600">
                  <li>• Add text overlays for ingredients and instructions</li>
                  <li>• Adjust speed for cooking techniques and transitions</li>
                  <li>• Add background music and sound effects</li>
                  <li>• Apply professional color grading and effects</li>
                </ul>
                <p className="mt-2 text-xs text-green-600">
                  <a
                    href="/CAPCUT_VIDEO_EDITING_GUIDE.md"
                    target="_blank"
                    className="underline hover:text-green-800"
                  >
                    📖 View CapCut editing guide
                  </a>
                </p>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs">
                <div className="mb-1 font-semibold text-yellow-700">⚠️ Attribution Required</div>
                <p className="text-yellow-600">
                  Videos generated with Runway ML must display &ldquo;Powered by Runway&rdquo; when
                  used publicly. Please ensure proper attribution if sharing this video.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
