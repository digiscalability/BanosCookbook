'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface GeneratedImage {
  url: string;
  description: string;
  style: string;
}

interface RecipeImageSelectorProps {
  images: GeneratedImage[];
  onSelectImageAction: (image: GeneratedImage) => void;
  selectedImage?: GeneratedImage | null;
  isGenerating?: boolean;
  className?: string;
}

export function RecipeImageSelector({
  images,
  onSelectImageAction,
  selectedImage,
  isGenerating = false,
  className,
}: RecipeImageSelectorProps) {
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [resolvedMap, setResolvedMap] = useState<Record<string, string | null>>({});
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Mark all images as loading initially
    setLoadingImages(new Set(images.map(img => img.url)));
    setIsResolving(true);

    async function resolveAll() {
      const newMap: Record<string, string | null> = {};
      for (const img of images) {
        try {
          // For source.unsplash.com URLs, just use them directly
          // They work fine in browser img tags (the issue is with programmatic HEAD/fetch)
          if (img.url.includes('source.unsplash.com')) {
            newMap[img.url] = img.url; // Use original URL directly
          } else if (img.url.startsWith('data:')) {
            newMap[img.url] = img.url; // Data URIs work as-is
          } else {
            // For other URLs, use as-is
            newMap[img.url] = img.url;
          }
        } catch {
          newMap[img.url] = img.url;
        }
      }
      if (!cancelled) {
        setResolvedMap((prev) => ({ ...prev, ...newMap }));
        setIsResolving(false);
      }
    }
    resolveAll();
    return () => {
      cancelled = true;
    };
  }, [images]);

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

  if (isGenerating) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating Recipe Images...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Creating and persisting images for your recipe (this may take a moment)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5" />
            Recipe Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No images generated yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="h-5 w-5" />
          Choose a Recipe Image
        </CardTitle>
        <p className="text-sm text-muted-foreground">Select the image that best represents your recipe</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((image, index) => {
            const isLoading = loadingImages.has(image.url) || isResolving;
            const hasFailed = failedImages.has(image.url);
            const isSelected = selectedImage?.url === image.url;
            const resolvedUrl = resolvedMap[image.url] || image.url;

            // Use native <img> for all images to avoid Next.js image optimization issues
            // with external URLs that may not be in the whitelist

            return (
              <div
                key={index}
                className={cn(
                  'relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200',
                  isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                )}
                  onClick={(e) => {
                  e.preventDefault();
                  if (hasFailed) return;
                  // Toggle selection: if this image is already selected, deselect it
                  if (isSelected) {
                    onSelectImageAction((null as unknown) as GeneratedImage);
                  } else {
                    onSelectImageAction(image);
                  }
                }}
              >
                <div className="aspect-video relative bg-muted">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : hasFailed ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">Image failed to load</p>
                      </div>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedUrl}
                      alt={image.description || 'Recipe image'}
                      className="w-full h-full object-cover"
                      onLoad={() => handleImageLoad(image.url)}
                      onError={() => handleImageError(image.url)}
                      loading="eager"
                      crossOrigin="anonymous"
                    />
                  )}

                  {isSelected && !hasFailed && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm line-clamp-2">{image.description}</h4>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {image.style}
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    disabled={hasFailed}
                      onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                          if (hasFailed) return;
                          if (isSelected) {
                            onSelectImageAction((null as unknown) as GeneratedImage);
                          } else {
                            onSelectImageAction(image);
                          }
                    }}
                  >
                    {hasFailed ? 'Image Unavailable' : isSelected ? 'Selected' : 'Select This Image'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
