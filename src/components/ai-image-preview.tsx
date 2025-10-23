'use client';

import { Check, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AIGeneratedImage {
  url: string;
  description: string;
  style: string;
}

interface AIImagePreviewProps {
  images: AIGeneratedImage[];
  onSelectImage: (image: AIGeneratedImage) => void;
  selectedImage?: AIGeneratedImage | null;
  isGenerating?: boolean;
  className?: string;
}

export function AIImagePreview({
  images,
  onSelectImage,
  selectedImage,
  isGenerating = false,
  className,
}: AIImagePreviewProps) {
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (imageUrl: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageUrl);
      return newSet;
    });
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageUrl);
      return newSet;
    });
  };

  const handleImageError = (imageUrl: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageUrl);
      return newSet;
    });
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imageUrl);
      return newSet;
    });
  };

  const handleImageClick = (image: AIGeneratedImage) => {
    if (failedImages.has(image.url)) return; // Don't select failed images
    onSelectImage(image);
  };

  // Create placeholder SVG
  const createPlaceholderSvg = (text: string) => {
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#999" text-anchor="middle" dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  if (isGenerating) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse text-primary" />
            Generating AI Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Creating custom images with AI...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!images || images.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Recipe Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No images generated yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Choose a Recipe Image
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select the image that best represents your recipe
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {images.map((image, index) => {
            const isSelected = selectedImage?.url === image.url;
            const isLoading = loadingImages.has(image.url);
            const hasFailed = failedImages.has(image.url);
            const isAIGenerated = image.url.startsWith('data:');

            return (
              <div
                key={image.url + index}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-border hover:border-primary/50',
                  hasFailed && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => handleImageClick(image)}
              >
                {/* AI Badge */}
                {isAIGenerated && (
                  <div className="absolute left-2 top-2 z-10">
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-primary/90 text-primary-foreground"
                    >
                      <Sparkles className="h-3 w-3" />
                      AI Generated
                    </Badge>
                  </div>
                )}

                {/* Selected Badge */}
                {isSelected && (
                  <div className="absolute right-2 top-2 z-10">
                    <div className="rounded-full bg-primary p-1 text-primary-foreground">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                )}

                {/* Image Container */}
                <div className="relative aspect-[4/3] bg-muted">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {hasFailed ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p className="text-sm">Failed to load</p>
                      </div>
                    </div>
                  ) : (
                    // Dynamic AI-generated images can't use Next.js Image optimization
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url || createPlaceholderSvg(image.description)}
                      alt={image.description}
                      className="h-full w-full object-cover"
                      loading="eager"
                      crossOrigin="anonymous"
                      onLoad={() => handleImageLoad(image.url)}
                      onError={() => handleImageError(image.url)}
                    />
                  )}
                </div>

                {/* Image Info */}
                <div className="bg-background p-3">
                  <p className="truncate text-sm font-medium">{image.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {image.style}
                    </Badge>
                  </div>
                </div>

                {/* Select Button Overlay */}
                {!isSelected && !hasFailed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                    <Button type="button" variant="secondary" size="sm" className="shadow-lg">
                      Select This Image
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
