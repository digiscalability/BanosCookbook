'use client';

import { Check, Copy, Instagram } from 'lucide-react';
import { useState } from 'react';

import { shareRecipeToInstagram } from '@/app/actions';
import { StepWrapper } from '../shared/StepWrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useVideoHub } from '../../context/VideoHubProvider';


export function SocialSharingStep() {
  const { state, completeWorkflow } = useVideoHub();
  const [isLoading, setIsLoading] = useState(false);
  const [caption, setCaption] = useState(
    `Check out this delicious ${state.selectedRecipe?.title || 'recipe'} 🍽️\n\n` +
    `Follow along step-by-step to create this amazing dish!\n\n` +
    `Link in bio for full recipe details.`
  );
  const [hashtags, setHashtags] = useState('#RecipeVideo #CookingAtHome #FoodTok');
  const [copySuccess, setCopySuccess] = useState(false);
  const [postUrl, setPostUrl] = useState<string | null>(null);

  const handleShareToInstagram = async () => {
    if (!state.selectedRecipe || !state.combinedVideo) return;

    try {
      setIsLoading(true);
      const result = await shareRecipeToInstagram(
        state.selectedRecipe.id,
        caption + '\n\n' + hashtags
      );

      setPostUrl(result.postUrl);
    } catch (error) {
      console.error('Failed to share to Instagram:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCaption = () => {
    const fullCaption = caption + '\n\n' + hashtags;
    navigator.clipboard.writeText(fullCaption);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleFinish = () => {
    completeWorkflow();
  };

  if (postUrl) {
    return (
      <StepWrapper
        stepNumber={8}
        title="🎉 Video Published!"
        description="Your video has been successfully shared"
        showBack={false}
        showNext={false}
      >
        <div className="space-y-6 text-center">
          <div className="rounded-lg bg-green-50 p-6">
            <div className="text-4xl mb-2">✓</div>
            <p className="text-lg font-semibold text-green-900">Video Posted to Instagram!</p>
            <p className="text-sm text-green-700 mt-2">Your recipe video is now live</p>
          </div>

          <Card className="p-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Post URL:</p>
              <div className="flex gap-2">
                <Input
                  value={postUrl}
                  readOnly
                  className="text-sm bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(postUrl);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">Next Steps:</p>
            <ul className="space-y-1 text-gray-600">
              <li>✓ Engage with comments on your post</li>
              <li>✓ Track likes and shares</li>
              <li>✓ Create more videos for your audience</li>
            </ul>
          </div>

          <Button
            onClick={handleFinish}
            className="w-full"
            size="lg"
          >
            Create Another Video
          </Button>
        </div>
      </StepWrapper>
    );
  }

  return (
    <StepWrapper
      stepNumber={8}
      title="Share to Instagram"
      description="Post your video to Instagram with custom caption"
      showBack
      showNext={false}
    >
      <div className="space-y-6">
        {/* Preview */}
        <div className="rounded-lg bg-gray-100 p-4 aspect-video flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-2">📹</div>
            <p className="text-gray-600">Your combined video</p>
            <p className="text-xs text-gray-500 mt-1">Ready to share</p>
          </div>
        </div>

        {/* Caption Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption..."
            className="h-24"
          />
          <p className="text-xs text-gray-500 mt-1">{caption.length}/2200 characters</p>
        </div>

        {/* Hashtags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
          <Input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#RecipeVideo #Cooking..."
          />
          <p className="text-xs text-gray-500 mt-1">Separate with spaces</p>
        </div>

        {/* Preview */}
        <Card className="p-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
          <div className="text-sm text-gray-900 whitespace-pre-wrap">
            {caption}
            {hashtags && `\n\n${hashtags}`}
          </div>
        </Card>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopyCaption}
            className="flex-1"
          >
            {copySuccess ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copySuccess ? 'Copied!' : 'Copy Caption'}
          </Button>
          <Button
            onClick={handleShareToInstagram}
            disabled={isLoading}
            isLoading={isLoading}
            className="flex-1"
            size="lg"
          >
            <Instagram className="h-4 w-4 mr-2" />
            {isLoading ? 'Posting...' : 'Post to Instagram'}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-500">
          Requires Instagram Business Account linked to this app
        </p>
      </div>
    </StepWrapper>
  );
}
