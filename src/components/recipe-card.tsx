'use client';
import { MessageCircle, Play, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/lib/auth-context';
import type { Recipe } from '@/lib/types';

import { InstagramBadge } from './instagram-badge';
import { SaveButton } from './save-button';

interface RecipeCardProps {
  recipe: Recipe;
  priority?: boolean;
}

function RecipeCard({ recipe, priority = false }: RecipeCardProps) {
  const { user } = useAuth();
  const isSaved = user ? (recipe.savedBy ?? []).includes(user.uid) : false;
  const hasVideo = !!recipe.videoUrl;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoHovered, setVideoHovered] = useState(false);
  // Count comments (top-level only)
  const commentCount = Array.isArray(recipe.comments) ? recipe.comments.length : 0;
  // Check if any comment is from Instagram
  const hasInstagramComment =
    Array.isArray(recipe.comments) && recipe.comments.some(c => c.isFromInstagram);
  const placeholder = PlaceHolderImages.find(p => p.id === recipe.imageId);

  // Prefer recipe.imageUrl (generated/uploaded image) over imageId or placeholder
  const imageSrc =
    recipe.imageUrl ||
    (recipe.imageId.startsWith('http') ? recipe.imageId : placeholder?.imageUrl) ||
    '';
  const imageAlt = recipe.imageUrl
    ? `${recipe.title} - generated image`
    : placeholder?.description || recipe.title;
  const ratingCount = recipe.ratingCount ?? 0;
  const ratingLabel = ratingCount > 0 ? recipe.rating.toFixed(1) : 'New';

  // Determine if we should use native img tag
  // Use native img for data URIs, signed URLs, or Firebase Storage URLs to avoid proxy issues
  const isDataUri = imageSrc.startsWith('data:');
  const isStorageUrl =
    imageSrc.includes('storage.googleapis.com') ||
    imageSrc.includes('firebasestorage.googleapis.com');
  const isImageUrl = imageSrc.startsWith('http');
  const shouldUseImgTag =
    isDataUri || isStorageUrl || (process.env.NODE_ENV === 'development' && isImageUrl);

  // Animation for comment counter
  const [animate, setAnimate] = useState(false);
  const prevCountRef = useRef(commentCount);

  useEffect(() => {
    if (commentCount > prevCountRef.current) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 500);
    }
    prevCountRef.current = commentCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentCount]);

  return (
    <Link href={`/recipes/${recipe.id}`} className="group">
      <style>{`
        .comment-bounce {
          animation: comment-bounce 0.5s cubic-bezier(.36,1.7,.3,.9);
        }
        @keyframes comment-bounce {
          0% { transform: scale(1); }
          20% { transform: scale(1.25); }
          40% { transform: scale(0.95); }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
      <Card className="flex h-full flex-col transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <CardHeader className="p-0">
          <div
            className="relative aspect-video overflow-hidden rounded-t-lg"
            onMouseEnter={() => { if (hasVideo) { setVideoHovered(true); videoRef.current?.play().catch(() => {}); } }}
            onMouseLeave={() => { if (hasVideo) { setVideoHovered(false); if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } } }}
          >
            {/* Video preview (shown on hover when video exists) */}
            {hasVideo && (
              <video
                ref={videoRef}
                src={recipe.videoUrl}
                muted
                loop
                playsInline
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${videoHovered ? 'opacity-100' : 'opacity-0'}`}
              />
            )}
            {/* Static image */}
            {(isImageUrl || placeholder) &&
              (shouldUseImgTag ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  data-ai-hint={placeholder?.imageHint}
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${videoHovered ? 'opacity-0' : 'group-hover:scale-105'}`}
                />
              ) : (
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  data-ai-hint={placeholder?.imageHint}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className={`object-cover transition-all duration-300 ${videoHovered ? 'opacity-0' : 'group-hover:scale-105'}`}
                  priority={priority}
                  unoptimized={isImageUrl}
                />
              ))}
            {/* Video badge */}
            {hasVideo && !videoHovered && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-white">
                <Play className="h-3 w-3 fill-current" />
                <span className="text-xs font-medium">Video</span>
              </div>
            )}
            {/* Save button overlay — top-right corner */}
            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
              <SaveButton
                recipeId={recipe.id}
                initialSaved={isSaved}
                initialCount={recipe.savedCount ?? 0}
                size="icon"
                className="h-8 w-8 rounded-full shadow-md"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-3 sm:p-4">
          <Badge variant="secondary" className="mb-2 text-xs capitalize sm:text-sm">
            {recipe.cuisine}
          </Badge>
          <CardTitle className="line-clamp-2 font-headline text-base leading-snug sm:text-lg">
            {recipe.title}
          </CardTitle>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-3 text-xs text-muted-foreground sm:p-4 sm:text-sm">
          <span className="mr-2 flex-1 truncate">By {recipe.author}</span>
          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Comment icon and count */}
            {commentCount > 0 && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <MessageCircle className="h-4 w-4" aria-label="Comments" />
                <span className={animate ? 'comment-bounce' : undefined}>{commentCount}</span>
                {/* Instagram badge if any comment is from Instagram */}
                {hasInstagramComment && (
                  <span className="ml-1">
                    <InstagramBadge />
                  </span>
                )}
              </span>
            )}
            <Star className="h-3 w-3 fill-amber-500 text-amber-500 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">{ratingLabel}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default RecipeCard;
