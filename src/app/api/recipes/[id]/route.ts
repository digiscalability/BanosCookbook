import type { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

import type { Comment, Recipe } from '@/lib/types';
import { authFailure, isAdminClaims, requireUser } from '@/server/auth/require-admin';
import { pickRecipeFields } from '@/server/recipes/recipe-fields';

import adminConfig from '../../../../../config/firebase-admin';

const { getDb, getAdmin } = adminConfig as unknown as {
  getDb: () => firestore.Firestore;
  getAdmin: () => typeof import('firebase-admin');
};

export const runtime = 'nodejs';
export const revalidate = 0;

const coerceNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const coerceComments = (raw: unknown): Comment[] => {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).map(item => {
    const comment = item as Record<string, unknown>;
    return {
      id: typeof comment.id === 'string' ? comment.id : '',
      author: typeof comment.author === 'string' ? comment.author : 'Anonymous',
      avatarUrl: typeof comment.avatarUrl === 'string' ? comment.avatarUrl : '',
      text: typeof comment.text === 'string' ? comment.text : '',
      timestamp:
        typeof comment.timestamp === 'string' ? comment.timestamp : new Date().toISOString(),
      rating: typeof comment.rating === 'number' ? comment.rating : undefined,
    } satisfies Comment;
  });
};

const toDateField = (field: unknown): Date | undefined => {
  if (!field) return undefined;
  if (field instanceof Date) return field;
  const maybe = field as { toDate?: () => Date };
  if (maybe && typeof maybe.toDate === 'function') {
    return maybe.toDate();
  }
  if (typeof field === 'string') {
    const parsed = new Date(field);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
};

const serializeRecipe = (snapshot: firestore.DocumentSnapshot<firestore.DocumentData>): Recipe => {
  const data = snapshot.data() as Record<string, unknown> | undefined;
  return {
    id: snapshot.id,
    title: (data?.title as string) ?? '',
    description: (data?.description as string) ?? '',
    author: (data?.author as string) ?? 'Unknown',
    authorEmail: data?.authorEmail as string | undefined,
    ingredients: Array.isArray(data?.ingredients)
      ? (data?.ingredients as unknown[]).filter((item): item is string => typeof item === 'string')
      : [],
    instructions: Array.isArray(data?.instructions)
      ? (data?.instructions as unknown[]).filter((item): item is string => typeof item === 'string')
      : [],
    prepTime: (data?.prepTime as string) ?? '',
    cookTime: (data?.cookTime as string) ?? '',
    servings: coerceNumber(data?.servings, 0),
    cuisine: (data?.cuisine as string) ?? '',
    imageId: (data?.imageId as string) ?? '',
    imageUrl: (data?.imageUrl as string) ?? undefined,
    rating: coerceNumber(data?.rating, 0),
    ratingCount: coerceNumber(data?.ratingCount, 0),
    comments: coerceComments(data?.comments),
    createdAt: toDateField(data?.createdAt),
    updatedAt: toDateField(data?.updatedAt),
  } satisfies Recipe;
};

// GET /api/recipes/[id] - Get a single recipe
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const doc = await db.collection('recipes').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }
    // Prepare recipe for response
    const recipe = serializeRecipe(doc);

    // If recipe has a storage-hosted image, attempt to create a signed URL so
    // the browser can fetch it even if the object ACL is restricted.
    try {
      const img = (doc.data() || {})['imageUrl'] as string | undefined;
      if (
        img &&
        (img.includes('storage.googleapis.com') || img.includes('firebasestorage.googleapis.com'))
      ) {
        const admin = getAdmin();

        // Try to parse common URL formats
        let bucketName: string | undefined;
        let filePath: string | undefined;
        try {
          const u = new URL(img);
          if (u.hostname === 'storage.googleapis.com') {
            const parts = u.pathname.split('/').filter(Boolean);
            bucketName = parts.shift();
            filePath = parts.join('/');
          } else if (u.hostname.endsWith('firebasestorage.googleapis.com')) {
            const parts = u.pathname.split('/').filter(Boolean);
            const bIndex = parts.indexOf('b');
            const oIndex = parts.indexOf('o');
            if (bIndex >= 0 && parts[bIndex + 1]) bucketName = parts[bIndex + 1];
            if (oIndex >= 0 && parts[oIndex + 1]) filePath = decodeURIComponent(parts[oIndex + 1]);
          }
        } catch {}

        if (bucketName && filePath) {
          try {
            const bucket = admin.storage().bucket(bucketName);
            const file = bucket.file(filePath);
            const getter = file as unknown as {
              getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
            };
            if (typeof getter.getSignedUrl === 'function') {
              const expires = Date.now() + 1000 * 60 * 60; // 1 hour
              const [signedUrl] = await getter.getSignedUrl({ action: 'read', expires });
              if (signedUrl) recipe.imageUrl = signedUrl;
            }
          } catch (signErr) {
            console.warn(
              'Failed to generate signed URL for recipe image (non-fatal):',
              signErr instanceof Error ? signErr.message : signErr
            );
          }
        }
      }
    } catch (err) {
      console.warn('Error preparing recipe image URL for response:', err);
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    const grpcCode = (error as Record<string, unknown>)?.code;
    if (grpcCode === 7 || grpcCode === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { error: 'Firebase project requires billing enabled for Admin SDK access.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

type Caller = Awaited<ReturnType<typeof requireUser>>;

/** Owner (the uid that created it) or admin; anyone else gets 403, unknown ids 404. */
async function loadForWrite(id: string, caller: Caller) {
  const ref = getDb().collection('recipes').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ref, error: NextResponse.json({ error: 'Recipe not found' }, { status: 404 }) };
  const isAdmin = isAdminClaims(caller);
  const isOwner = typeof snap.get('userId') === 'string' && snap.get('userId') === caller.uid;
  if (!isAdmin && !isOwner) {
    return { ref, error: NextResponse.json({ error: 'Owner or admin only' }, { status: 403 }) };
  }
  return { ref, isAdmin, error: null };
}

// PUT /api/recipes/[id] - Update a recipe (owner or admin; whitelisted fields only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let caller: Caller;
  try {
    caller = await requireUser(request);
  } catch (err) {
    return authFailure(err);
  }
  try {
    const { id } = await params;
    const { ref, isAdmin, error } = await loadForWrite(id, caller);
    if (error) return error;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'JSON body required' }, { status: 400 });
    }
    const picked = pickRecipeFields(body, { admin: Boolean(isAdmin) });
    if (!picked.ok) return NextResponse.json({ error: picked.error }, { status: 400 });
    if (Object.keys(picked.data).length === 0) {
      return NextResponse.json({ error: 'No editable fields in body' }, { status: 400 });
    }

    const admin = getAdmin();
    await ref.update({ ...picked.data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const updatedSnapshot = await ref.get();

    return NextResponse.json({ recipe: serializeRecipe(updatedSnapshot) });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

// DELETE /api/recipes/[id] - Delete a recipe (owner or admin; Ammi's recipes: admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let caller: Caller;
  try {
    caller = await requireUser(request);
  } catch (err) {
    return authFailure(err);
  }
  try {
    const { id } = await params;
    const { ref, isAdmin, error } = await loadForWrite(id, caller);
    if (error) return error;
    if (!isAdmin && (await ref.get()).get('source') === 'ammi_book') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
