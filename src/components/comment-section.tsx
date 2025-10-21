'use client';

import { InstagramBadge } from '@/components/instagram-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addRecipeComment, submitRecipeRating, type NewCommentPayload } from '@/lib/firestore-recipes';
import type { Comment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MessageCircle, Send, Star, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';

type CommentSectionProps = {
  recipeId: string;
  comments: Comment[];
  initialRating: number;
  initialRatingCount: number;
};

export default function CommentSection({
  recipeId,
  comments: initialComments,
  initialRating,
  initialRatingCount,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(initialRating || 0);
  const [ratingCount, setRatingCount] = useState<number>(initialRatingCount || 0);
  const [formError, setFormError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const { toast } = useToast();

  // Generate/retrieve user ID for like tracking (guest session)
  useEffect(() => {
    let guestId = localStorage.getItem('guestUserId');
    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guestUserId', guestId);
    }
    setUserId(guestId);
  }, []);

  const handleSelectRating = (value: number) => {
    setSelectedRating(value);
    if (formError) {
      setFormError(null);
    }
  };

  const renderStars = (value: number, size: 'sm' | 'md' = 'md') => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
            star <= value ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
          )}
        />
      ))}
    </div>
  );

  const handleLikeComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error('Failed to like comment');

      // Response result not used - operation is handled server-side
      await response.json();

      // Update local state optimistically
      setComments((prev) => prev.map((comment) => {
        if (comment.id === commentId) {
          const likedBy = comment.likedBy || [];
          const isLiked = likedBy.includes(userId);

          return {
            ...comment,
            likes: isLiked ? Math.max(0, (comment.likes || 0) - 1) : (comment.likes || 0) + 1,
            likedBy: isLiked ? likedBy.filter(id => id !== userId) : [...likedBy, userId],
          };
        }

        // Also check nested replies
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: comment.replies.map((reply) => {
              if (reply.id === commentId) {
                const likedBy = reply.likedBy || [];
                const isLiked = likedBy.includes(userId);

                return {
                  ...reply,
                  likes: isLiked ? Math.max(0, (reply.likes || 0) - 1) : (reply.likes || 0) + 1,
                  likedBy: isLiked ? likedBy.filter(id => id !== userId) : [...likedBy, userId],
                };
              }
              return reply;
            }),
          };
        }

        return comment;
      }));
    } catch (error) {
      console.error('Error liking comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to like comment. Please try again.',
      });
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!replyText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please write a reply before submitting.',
      });
      return;
    }

    setIsSubmittingReply(true);

    try {
      const replyId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `r-${Date.now()}`;

      const replyPayload: Comment = {
        id: replyId,
        author: 'Guest User',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(replyId)}`,
        text: replyText.trim(),
        timestamp: new Date().toISOString(),
        parentId,
        likes: 0,
        likedBy: [],
      };

      const response = await fetch(`/api/recipes/${recipeId}/comments/${parentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyPayload }),
      });

      if (!response.ok) throw new Error('Failed to add reply');

      const result = await response.json();

      // Update local state
      setComments((prev) => prev.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), result.reply],
          };
        }
        return comment;
      }));

      setReplyText('');
      setReplyingTo(null);
      toast({
        title: 'Reply posted!',
        description: 'Your reply has been added.',
      });
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to post reply. Please try again.',
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setFormError('Please write a comment before submitting.');
      return;
    }
    if (selectedRating === 0) {
      setFormError('Please select a rating for this recipe.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const commentId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `c-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const commentPayload: NewCommentPayload = {
      id: commentId,
      author: 'Guest User',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(commentId)}`,
      text: newComment.trim(),
      timestamp,
      rating: selectedRating,
    };

    try {
  const ratingResult = await submitRecipeRating(recipeId, selectedRating);
  const savedComment = await addRecipeComment(recipeId, commentPayload);

      setAverageRating(ratingResult.rating);
      setRatingCount(ratingResult.ratingCount);
  setComments((prev) => [savedComment, ...prev]);
      setNewComment('');
      setSelectedRating(0);
      toast({
        title: 'Thanks for the feedback!',
        description: 'Your review has been posted to the recipe.',
      });
    } catch (error) {
      console.error('Failed to submit comment:', error);
      setFormError('We could not save your feedback. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: 'Please try again in a moment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section data-recipe-id={recipeId}>
      <Card>
        <CardHeader className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            {/* favicon is a local asset; render a native img to avoid Next/Image fill+sizes warning in dev */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.ico" alt="Comments" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="font-headline text-3xl">Comments & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {ratingCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {renderStars(Math.round(averageRating))}
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No ratings yet. Be the first to review this recipe.</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="mb-8 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Your Rating</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      value <= selectedRating ? 'text-amber-500' : 'text-muted-foreground hover:text-primary'
                    )}
                    aria-label={`Rate ${value} ${value === 1 ? 'star' : 'stars'}`}
                    onClick={() => handleSelectRating(value)}
                  >
                    <Star
                      className={cn(
                        'w-6 h-6',
                        value <= selectedRating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              placeholder="Share your thoughts, questions, or variations..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
            />
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>

          <div className="space-y-6">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="space-y-4">
                  <div className="flex gap-4">
                    <Avatar>
                      <AvatarImage src={comment.avatarUrl} alt={comment.author} />
                      <AvatarFallback>
                        {comment.author.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold">{comment.author}</p>
                        <p className="text-xs text-muted-foreground">
                          &middot; {new Date(comment.timestamp).toLocaleDateString()}
                        </p>
                        {typeof comment.rating === 'number' && comment.rating > 0 && (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <Star className="w-3 h-3 fill-amber-500" />
                            {comment.rating.toFixed(1)}
                          </span>
                        )}
                        {comment.isFromInstagram && (
                          <InstagramBadge username={comment.instagramUsername} />
                        )}
                      </div>
                      <p className="text-sm text-foreground mb-2">{comment.text}</p>

                      {/* Action buttons */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={cn(
                            "flex items-center gap-1 hover:text-primary transition-colors",
                            comment.likedBy?.includes(userId) && "text-blue-600 font-semibold"
                          )}
                        >
                          <ThumbsUp className={cn(
                            "w-3.5 h-3.5",
                            comment.likedBy?.includes(userId) && "fill-blue-600"
                          )} />
                          <span>{comment.likes || 0} {(comment.likes || 0) === 1 ? 'Like' : 'Likes'}</span>
                        </button>
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                        {comment.replies && comment.replies.length > 0 && (
                          <span className="text-muted-foreground">
                            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>

                      {/* Reply form */}
                      {replyingTo === comment.id && (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReplySubmit(comment.id)}
                              disabled={isSubmittingReply}
                            >
                              {isSubmittingReply ? (
                                'Posting...'
                              ) : (
                                <>
                                  <Send className="w-3 h-3 mr-1" />
                                  Post Reply
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Display replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 space-y-4 pl-4 border-l-2 border-muted">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <Avatar className="w-7 h-7">
                                <AvatarImage src={reply.avatarUrl} alt={reply.author} />
                                <AvatarFallback className="text-xs">
                                  {reply.author.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-sm">{reply.author}</p>
                                  <p className="text-xs text-muted-foreground">
                                    &middot; {new Date(reply.timestamp).toLocaleDateString()}
                                  </p>
                                </div>
                                <p className="text-sm text-foreground mb-2">{reply.text}</p>
                                <button
                                  onClick={() => handleLikeComment(reply.id)}
                                  className={cn(
                                    "flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors",
                                    reply.likedBy?.includes(userId) && "text-blue-600 font-semibold"
                                  )}
                                >
                                  <ThumbsUp className={cn(
                                    "w-3 h-3",
                                    reply.likedBy?.includes(userId) && "fill-blue-600"
                                  )} />
                                  <span>{reply.likes || 0}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Be the first to leave a comment!
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
          <span>Reviews are moderated for kindness and helpfulness.</span>
          <span>Average rating updates immediately after you submit.</span>
        </CardFooter>
      </Card>
    </section>
  );
}
