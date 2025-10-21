
"use client";
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Recipe } from '@/lib/types';
import { MessageCircle, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { InstagramBadge } from './instagram-badge';

interface RecipeCardProps {
  recipe: Recipe;
  priority?: boolean;
}


function RecipeCard({ recipe, priority = false }: RecipeCardProps) {
  // Count comments (top-level only)
  const commentCount = Array.isArray(recipe.comments) ? recipe.comments.length : 0;
  // Check if any comment is from Instagram
  const hasInstagramComment = Array.isArray(recipe.comments) && recipe.comments.some(c => c.isFromInstagram);
  const placeholder = PlaceHolderImages.find((p) => p.id === recipe.imageId);

  // Prefer recipe.imageUrl (generated/uploaded image) over imageId or placeholder
  const imageSrc = recipe.imageUrl || (recipe.imageId.startsWith('http') ? recipe.imageId : placeholder?.imageUrl) || '';
  const imageAlt = recipe.imageUrl ? `${recipe.title} - generated image` : (placeholder?.description || recipe.title);
  const ratingCount = recipe.ratingCount ?? 0;
  const ratingLabel = ratingCount > 0 ? recipe.rating.toFixed(1) : 'New';

  // Determine if we should use native img tag
  // Use native img for data URIs, signed URLs, or Firebase Storage URLs to avoid proxy issues
  const isDataUri = imageSrc.startsWith('data:');
  const isStorageUrl = imageSrc.includes('storage.googleapis.com') || imageSrc.includes('firebasestorage.googleapis.com');
  const isImageUrl = imageSrc.startsWith('http');
  const shouldUseImgTag = isDataUri || isStorageUrl || (process.env.NODE_ENV === 'development' && isImageUrl);

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
      <Card className="h-full flex flex-col transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="aspect-video relative overflow-hidden rounded-t-lg">
            {(isImageUrl || placeholder) && (
              shouldUseImgTag ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  data-ai-hint={placeholder?.imageHint}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  data-ai-hint={placeholder?.imageHint}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority={priority}
                  unoptimized={isImageUrl}
                />
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-3 sm:p-4">
          <Badge variant="secondary" className="mb-2 capitalize text-xs sm:text-sm">
            {recipe.cuisine}
          </Badge>
          <CardTitle className="text-base sm:text-lg font-headline leading-snug line-clamp-2">
            {recipe.title}
          </CardTitle>
        </CardContent>
        <CardFooter className="p-3 sm:p-4 flex justify-between items-center text-xs sm:text-sm text-muted-foreground">
          <span className="truncate flex-1 mr-2">By {recipe.author}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Comment icon and count */}
            {commentCount > 0 && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <MessageCircle className="w-4 h-4" aria-label="Comments" />
                <span className={animate ? "comment-bounce" : undefined}>{commentCount}</span>
                {/* Instagram badge if any comment is from Instagram */}
                {hasInstagramComment && (
                  <span className="ml-1"><InstagramBadge /></span>
                )}
              </span>
            )}
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs sm:text-sm">{ratingLabel}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default RecipeCard;
