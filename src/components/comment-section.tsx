'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Comment } from '@/lib/types';

type CommentSectionProps = {
  recipeId: string;
  comments: Comment[];
};

export default function CommentSection({
  recipeId,
  comments: initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const newCommentObject: Comment = {
        id: `c${comments.length + 100}`,
        author: 'Guest User',
        avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`,
        text: newComment,
        timestamp: 'Just now',
      };
      setComments([newCommentObject, ...comments]);
      setNewComment('');
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Comments & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="mb-8 space-y-4">
            <Textarea
              placeholder="Share your thoughts, questions, or variations..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>

          <div className="space-y-8">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={comment.avatarUrl} alt={comment.author} />
                    <AvatarFallback>
                      {comment.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{comment.author}</p>
                      <p className="text-xs text-muted-foreground">
                        &middot; {comment.timestamp}
                      </p>
                    </div>
                    <p className="text-sm text-foreground">{comment.text}</p>
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
      </Card>
    </section>
  );
}
