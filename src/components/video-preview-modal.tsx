"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showNotification } from '@/lib/notify';
import { useState } from "react";

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
  recipeTitle
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
        showNotification('Video downloaded! Open CapCut app and import this file to start editing your recipe video.', 'info');
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
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">🎬 Recipe Video Preview</DialogTitle>
          {recipeTitle ? <div className="text-sm text-muted-foreground">{recipeTitle}</div> : null}
        </DialogHeader>

        <div className="flex flex-col gap-6 p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              <p className="text-muted-foreground font-semibold">Generating video with Runway ML Gen-4 Turbo...</p>
              <p className="text-sm text-muted-foreground">This may take 1-2 minutes</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                <p className="text-xs text-blue-600">
                  💡 The AI is creating a cinematic video from your recipe image and script.
                  Please wait while the magic happens!
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-600 font-semibold mb-2">❌ Error</div>
              <p className="text-red-700 text-sm">{error}</p>
              {error.includes('RUNWAY_API_KEY') && (
                <div className="mt-4 text-xs text-red-600">
                  <p className="font-semibold mb-1">Setup Required:</p>
                  <p>1. Sign up at <a href="https://dev.runwayml.com" target="_blank" rel="noopener noreferrer" className="underline">dev.runwayml.com</a></p>
                  <p>2. Get your API key from the dashboard</p>
                  <p>3. Add RUNWAY_API_KEY to your .env file</p>
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && videoUrl && (
            <>
              <div className="rounded-xl border-2 border-primary/30 overflow-hidden bg-black">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-auto max-h-[70vh]"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  className="btn btn-secondary"
                  onClick={() => window.open(videoUrl, '_blank')}
                >
                  🔗 Open in New Tab
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDownload}
                  disabled={downloading}
                >
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

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 text-sm">
                <div className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <span>✨</span>
                  <span>Powered by Runway ML Gen-4 Turbo</span>
                </div>
                <p className="text-purple-600 text-xs mb-2">
                  This video was generated using AI from your recipe image and video script.
                  The system transforms your static recipe image into a dynamic 5-second cinematic video
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

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                <div className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <span>🎬</span>
                  <span>Edit in CapCut for Professional Results</span>
                </div>
                <p className="text-green-600 text-xs mb-2">
                  Take your recipe video to the next level with CapCut&apos;s professional editing tools:
                </p>
                <ul className="text-xs text-green-600 space-y-1 ml-4">
                  <li>• Add text overlays for ingredients and instructions</li>
                  <li>• Adjust speed for cooking techniques and transitions</li>
                  <li>• Add background music and sound effects</li>
                  <li>• Apply professional color grading and effects</li>
                </ul>
                <p className="text-green-600 text-xs mt-2">
                  <a href="/CAPCUT_VIDEO_EDITING_GUIDE.md" target="_blank" className="underline hover:text-green-800">
                    📖 View CapCut editing guide
                  </a>
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                <div className="font-semibold text-yellow-700 mb-1">⚠️ Attribution Required</div>
                <p className="text-yellow-600">
                  Videos generated with Runway ML must display &ldquo;Powered by Runway&rdquo; when used publicly.
                  Please ensure proper attribution if sharing this video.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
