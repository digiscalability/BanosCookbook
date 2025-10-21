import type { Comment } from '@/lib/types';
import type { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import adminConfig from '../../../../../../../../config/firebase-admin';

const { getDb, getAdmin } = adminConfig as unknown as {
  getDb: () => firestore.Firestore;
  getAdmin: () => typeof import('firebase-admin');
};

const formatComment = (raw: unknown): Comment => {
  const input = raw as Record<string, unknown> | undefined;
  const timestamp = typeof input?.timestamp === 'string' && input.timestamp.trim().length > 0
    ? input.timestamp
    : new Date().toISOString();

  const comment: Comment = {
    id: typeof input?.id === 'string' && input.id.trim().length > 0 ? input.id : `c-${Date.now()}`,
    author: typeof input?.author === 'string' && input.author.trim().length > 0 ? input.author : 'Guest User',
    authorEmail: typeof input?.authorEmail === 'string' ? input.authorEmail : undefined,
    avatarUrl: typeof input?.avatarUrl === 'string' ? input.avatarUrl : '',
    text: typeof input?.text === 'string' ? input.text : '',
    timestamp,
    likes: 0,
    likedBy: [],
    replies: [],
  };

  if (typeof input?.parentId === 'string') {
    comment.parentId = input.parentId;
  }

  return comment;
};

const toFirestoreComment = (comment: Comment) => {
  const payload: Record<string, unknown> = {
    id: comment.id,
    author: comment.author,
    avatarUrl: comment.avatarUrl,
    text: comment.text,
    timestamp: comment.timestamp,
    likes: comment.likes || 0,
    likedBy: comment.likedBy || [],
    replies: comment.replies || [],
  };

  if (comment.authorEmail) {
    payload.authorEmail = comment.authorEmail;
  }

  if (comment.parentId) {
    payload.parentId = comment.parentId;
  }

  return payload;
};

export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Reply to a comment
 * POST /api/recipes/[id]/comments/[commentId]/reply
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { id, commentId } = await params;
    const body = await request.json().catch(() => ({}));
    const incoming = (body as { reply?: unknown }).reply;

    if (!incoming) {
      return NextResponse.json({ error: 'Reply payload is required.' }, { status: 400 });
    }

    const reply = formatComment(incoming);
    reply.parentId = commentId; // Set parent reference

    if (!reply.text || reply.text.trim().length === 0) {
      return NextResponse.json({ error: 'Reply text is required.' }, { status: 400 });
    }

    const db = getDb();
    const admin = getAdmin();
    const recipeRef = db.collection('recipes').doc(id);

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(recipeRef);
      if (!snapshot.exists) {
        throw new Error('Recipe not found');
      }

      const data = snapshot.data() as Record<string, unknown>;
      const comments = (data?.comments as Array<{ id: string; replies?: unknown[]; [key: string]: unknown }>) || [];

      // Find parent comment and add reply
      let parentFound = false;
      const updatedComments = comments.map((comment) => {
        if (comment.id === commentId) {
          parentFound = true;
          const replies = comment.replies || [];
          return {
            ...comment,
            replies: [...replies, toFirestoreComment(reply)],
          };
        }
        return comment;
      });

      if (!parentFound) {
        throw new Error('Parent comment not found');
      }

      transaction.update(recipeRef, {
        comments: updatedComments,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, reply };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding reply:', error);
    if (error instanceof Error && error.message === 'Recipe not found') {
      return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Parent comment not found') {
      return NextResponse.json({ error: 'Parent comment not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to add reply.' }, { status: 500 });
  }
}
