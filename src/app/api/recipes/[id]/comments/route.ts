import type { Comment } from '@/lib/types';
import type { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import adminConfig from '../../../../../../config/firebase-admin';

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
    avatarUrl: typeof input?.avatarUrl === 'string' ? input.avatarUrl : '',
    text: typeof input?.text === 'string' ? input.text : '',
    timestamp,
  };

  if (typeof input?.rating === 'number' && Number.isFinite(input.rating)) {
    comment.rating = input.rating;
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
  };

  if (typeof comment.rating === 'number' && Number.isFinite(comment.rating)) {
    payload.rating = comment.rating;
  }

  return payload;
};

export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const incoming = (body as { comment?: unknown }).comment;

    if (!incoming) {
      return NextResponse.json({ error: 'Comment payload is required.' }, { status: 400 });
    }

    const comment = formatComment(incoming);
    if (!comment.text || comment.text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

  const db = getDb();
  const admin = getAdmin();
  const recipeRef = db.collection('recipes').doc(id);
    const snapshot = await recipeRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
    }

    await recipeRef.update({
      comments: admin.firestore.FieldValue.arrayUnion(toFirestoreComment(comment)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error adding recipe comment:', error);
    return NextResponse.json({ error: 'Failed to add comment.' }, { status: 500 });
  }
}
