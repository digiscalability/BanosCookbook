import type { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

import adminConfig from '../../../../../../config/firebase-admin';

const { getDb, getAdmin } = adminConfig as unknown as {
  getDb: () => firestore.Firestore;
  getAdmin: () => typeof import('firebase-admin');
};

const coerceNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const rating = (body as { rating?: unknown }).rating;

    if (!Number.isFinite(rating) || typeof rating !== 'number' || rating < 0 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 0 and 5.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const admin = getAdmin();
    const recipeRef = db.collection('recipes').doc(id);

    const result = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(recipeRef);
      if (!snapshot.exists) {
        throw new Error('Recipe not found');
      }

      const data = snapshot.data() as Record<string, unknown> | undefined;
      const currentRating = coerceNumber(data?.rating, 0);
      const currentCount = Math.max(coerceNumber(data?.ratingCount, 0), 0);
      const newCount = currentCount + 1;
      const newAverage =
        newCount === 0 ? rating : (currentRating * currentCount + rating) / newCount;

      transaction.update(recipeRef, {
        rating: newAverage,
        ratingCount: newCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { rating: newAverage, ratingCount: newCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating recipe rating:', error);
    if (error instanceof Error && error.message === 'Recipe not found') {
      return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to submit rating.' }, { status: 500 });
  }
}
