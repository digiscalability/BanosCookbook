'use client';

import { Check, Copy, ExternalLink, Instagram } from 'lucide-react';
import { useEffect, useState } from 'react';

import { shareRecipeToInstagram } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useVideoHub } from '../../context/VideoHubProvider';

// Server-side env vars that must be set for Instagram posting to work
const REQUIRED_INSTAGRAM_VARS = [
  { key: 'INSTAGRAM_ACCESS_TOKEN', label: 'Instagram Access Token' },
  { key: 'INSTAGRAM_BUSINESS_ACCOUNT_ID', label: 'Instagram Business Account ID' },
  { key: 'FACEBOOK_APP_ID', label: 'Facebook App ID' },
  { key: 'FACEBOOK_APP_SECRET', label: 'Facebook App Secret' },
];

export function SocialSharingStep() {
  const { state, completeWorkflow } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [igConfigured, setIgConfigured] = useState<boolean | null>(null); // null = unknown
  const [caption, setCaption] = useState(
    `Check out this delicious ${state.selectedRecipe?.title ?? 'recipe'} 🍽️\n\n` +
    `Follow along step-by-step to create this amazing dish!\n\n` +
    `Link in bio for full recipe details.`
  );
  const [hashtags, setHashtags] = useState('#RecipeVideo #CookingAtHome #FoodTok');
  const [copySuccess, setCopySuccess] = useState(false);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const videoUrl = state.combinedVideo?.url ?? Object.values(state.sceneVideos)[0] ?? '';

  // Check Instagram configuration by calling a lightweight preflight API
  useEffect(() => {
    fetch('/api/instagram/preflight')
      .then(r => r.json())
      .then(data => setIgConfigured(data.configured === true))
      .catch(() => setIgConfigured(false));
  }, []);

  const handleShareToInstagram = async () => {
    if (!state.selectedRecipe) return;
    setShareError(null);
    setIsLoading(true);
    try {
      const result = await shareRecipeToInstagram(state.selectedRecipe.id);
      if (result.permalink) {
        setPostUrl(result.permalink);
      } else {
        setShareError(result.error ?? 'Instagram returned no post URL. Check your API credentials.');
      }
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(`${caption}\n\n${hashtags}`);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (postUrl) {
    return (
      <StepWrapper
        stepNumber={8}
        title="🎉 Video Published!"
        description="Your recipe video is now live on Instagram"
        showBack={false}
        showNext={false}
      >
        <div className="space-y-6 text-center">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-lg font-semibold text-green-900">Posted to Instagram!</p>
            <p className="text-sm text-green-700 mt-1">Your recipe video is live</p>
          </div>

          <div className="flex gap-2">
            <Input value={postUrl} readOnly className="text-sm bg-gray-50" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(postUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={postUrl} target="_blank" rel="noopener noreferrer" title="Open Instagram post">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <Button onClick={completeWorkflow} className="w-full" size="lg">
            Create Another Video
          </Button>
        </div>
      </StepWrapper>
    );
  }

  // ── Main sharing screen ─────────────────────────────────────────────────────
  return (
    <StepWrapper
      stepNumber={8}
      title="Share to Instagram"
      description="Review your video, customise the caption, and post to Instagram"
      showBack
      showNext={false}
    >
      <div className="space-y-6">
        {/* Video preview */}
        {videoUrl ? (
          <video controls src={videoUrl} className="w-full rounded-lg bg-black max-h-64" />
        ) : (
          <div className="rounded-lg bg-gray-100 p-6 text-center text-sm text-gray-500">
            No combined video found — go back to combine your scenes first.
          </div>
        )}

        {/* Instagram configuration pre-flight */}
        {igConfigured === false && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold mb-2">⚠ Instagram is not configured</p>
            <p className="mb-3 text-xs">
              The following environment variables must be set on your server before posting to Instagram:
            </p>
            <ul className="mb-3 space-y-1 text-xs">
              {REQUIRED_INSTAGRAM_VARS.map(v => (
                <li key={v.key} className="font-mono">• {v.key} — <span className="font-sans font-normal">{v.label}</span></li>
              ))}
            </ul>
            <p className="text-xs">
              See <strong>INSTAGRAM_INTEGRATION.md</strong> in the project root for setup instructions.
              You can still copy the caption below and post manually.
            </p>
          </div>
        )}

        {/* Caption editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption…"
            className="min-h-[96px]"
          />
          <p className="text-xs text-gray-400 mt-1">{caption.length}/2200</p>
        </div>

        {/* Hashtags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
          <Input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#RecipeVideo #Cooking…"
          />
          <p className="text-xs text-gray-400 mt-1">Separate with spaces</p>
        </div>

        {/* Caption preview */}
        <Card className="p-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {caption}
            {hashtags && `\n\n${hashtags}`}
          </p>
        </Card>

        {/* Share error */}
        {shareError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold mb-1">⚠ Failed to post</p>
            <p className="text-xs">{shareError}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleCopyCaption} className="flex-1">
            {copySuccess ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copySuccess ? 'Copied!' : 'Copy Caption'}
          </Button>
          <Button
            onClick={handleShareToInstagram}
            disabled={isLoading || igConfigured === false || !videoUrl}
            className="flex-1"
            size="lg"
          >
            <Instagram className="h-4 w-4 mr-2" />
            {isLoading ? 'Posting…' : 'Post to Instagram'}
          </Button>
        </div>

        {igConfigured === false && (
          <p className="text-center text-xs text-gray-400">
            Instagram is not configured — copy the caption above and post manually.
          </p>
        )}

        {/* Skip / finish without posting */}
        <div className="text-center">
          <button
            type="button"
            className="text-sm text-gray-400 hover:text-gray-600 underline"
            onClick={completeWorkflow}
          >
            Skip — I&apos;ll post manually
          </button>
        </div>
      </div>
    </StepWrapper>
  );
}
