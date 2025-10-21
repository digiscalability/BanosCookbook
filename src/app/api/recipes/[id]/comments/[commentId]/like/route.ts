import type { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import adminConfig from '../../../../../../../../config/firebase-admin';

const { getDb, getAdmin } = adminConfig as unknown as {
  getDb: () => firestore.Firestore;
  getAdmin: () => typeof import('firebase-admin');
};

export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Like/Unlike a comment
 * POST /api/recipes/[id]/comments/[commentId]/like
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { id, commentId } = await params;
    const body = await request.json().catch(() => ({}));
    const userId = (body as { userId?: string }).userId || `guest-${Date.now()}`;

    const db = getDb();
    const admin = getAdmin();
    const recipeRef = db.collection('recipes').doc(id);

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(recipeRef);
      if (!snapshot.exists) {
        throw new Error('Recipe not found');
      }

      const data = snapshot.data() as Record<string, unknown>;
      const comments = (data?.comments as Array<{ id: string; likes?: number; likedBy?: string[]; replies?: Array<{ id: string; likes?: number; likedBy?: string[]; [key: string]: unknown }>; [key: string]: unknown }>) || [];

      // Find the comment (including nested replies)
      let commentFound = false;
      const updatedComments = comments.map((comment) => {
        if (comment.id === commentId) {
          commentFound = true;
          const likes = comment.likes || 0;
          const likedBy = (comment.likedBy as string[]) || [];

          // Toggle like
          if (likedBy.includes(userId)) {
            // Unlike
            return {
              ...comment,
              likes: Math.max(0, likes - 1),
              likedBy: likedBy.filter((id: string) => id !== userId),
            };
          } else {
            // Like
            return {
              ...comment,
              likes: likes + 1,
              likedBy: [...likedBy, userId],
            };
          }
        }

        // Check nested replies
        if (comment.replies && Array.isArray(comment.replies)) {
          const updatedReplies = comment.replies.map((reply: { id: string; likes?: number; likedBy?: string[]; [key: string]: unknown }) => {
            if (reply.id === commentId) {
              commentFound = true;
              const likes = reply.likes || 0;
              const likedBy = (reply.likedBy as string[]) || [];

              if (likedBy.includes(userId)) {
                return {
                  ...reply,
                  likes: Math.max(0, likes - 1),
                  likedBy: likedBy.filter((id: string) => id !== userId),
                };
              } else {
                return {
                  ...reply,
                  likes: likes + 1,
                  likedBy: [...likedBy, userId],
                };
              }
            }
            return reply;
          });

          return { ...comment, replies: updatedReplies };
        }

        return comment;
      });

      if (!commentFound) {
        throw new Error('Comment not found');
      }

      transaction.update(recipeRef, {
        comments: updatedComments,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Find the updated comment to return
      const updatedComment = updatedComments.find(c => c.id === commentId) ||
        updatedComments.flatMap(c => c.replies || []).find((r: { id: string; likes?: number; likedBy?: string[]; [key: string]: unknown }) => r.id === commentId);

      return {
        success: true,
        comment: updatedComment,
        likes: updatedComment?.likes || 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error liking comment:', error);
    if (error instanceof Error && error.message === 'Recipe not found') {
      return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Comment not found') {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to like comment.' }, { status: 500 });
  }
}
