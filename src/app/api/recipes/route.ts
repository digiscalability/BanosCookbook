import type { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

import { shareRecipeToInstagram } from '@/app/actions';
import type { Comment, Recipe } from '@/lib/types';

import adminConfig from '../../../../config/firebase-admin';

const { getDb, getAdmin } = adminConfig as unknown as {
  getDb: () => firestore.Firestore;
  getAdmin: () => typeof import('firebase-admin');
};

type StorageFileLike = {
  makePublic?: () => Promise<void>;
  getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
  name?: string;
};

export const runtime = 'nodejs';
export const revalidate = 0;

const IMAGE_FETCH_TIMEOUT_MS = 3000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const slugifyForImage = (value: string | undefined | null) =>
  (value ?? 'recipe')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const escapeHtml = (str: string) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const coerceComments = (raw: unknown): Comment[] => {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as unknown[]).map(item => {
    const comment = item as Record<string, unknown>;
    return {
      id: (comment.id as string) || '',
      author: (comment.author as string) || 'Anonymous',
      avatarUrl: (comment.avatarUrl as string) || '',
      text: (comment.text as string) || '',
      timestamp: (comment.timestamp as string) || new Date().toISOString(),
      rating: typeof comment.rating === 'number' ? comment.rating : undefined,
    };
  });
};

const toDate = (field: unknown): Date | undefined => {
  if (!field) return undefined;
  if (field instanceof Date) return field;
  const maybe = field as { toDate?: () => Date };
  if (maybe && typeof maybe.toDate === 'function') {
    return maybe.toDate();
  }
  return undefined;
};

const serializeRecipe = (doc: firestore.DocumentSnapshot<firestore.DocumentData>): Recipe => {
  const data = doc.data() as Record<string, unknown> | undefined;
  return {
    id: doc.id,
    title: (data?.['title'] as string) || '',
    description: (data?.['description'] as string) || '',
    author: (data?.['author'] as string) || 'Unknown',
    authorEmail: data?.['authorEmail'] as string | undefined,
    imageUrl: data?.['imageUrl'] as string | undefined,
    ingredients: Array.isArray(data?.['ingredients']) ? (data?.['ingredients'] as string[]) : [],
    instructions: Array.isArray(data?.['instructions']) ? (data?.['instructions'] as string[]) : [],
    prepTime: (data?.['prepTime'] as string) || '',
    cookTime: (data?.['cookTime'] as string) || '',
    servings: Number(data?.['servings'] ?? 0),
    cuisine: (data?.['cuisine'] as string) || '',
    imageId: (data?.['imageId'] as string) || '',
    rating: Number(data?.['rating'] ?? 0),
    ratingCount: Number(data?.['ratingCount'] ?? 0),
    comments: coerceComments(data?.['comments']),
    createdAt: toDate(data?.['createdAt']),
    updatedAt: toDate(data?.['updatedAt']),
  };
};

const filterRecipeFields = (recipe: Recipe, fields: string[]) => {
  const filtered: Record<string, unknown> = {};
  fields.forEach(field => {
    if (field in recipe) {
      filtered[field] = recipe[field as keyof Recipe];
    }
    if (field === 'url') {
      filtered.url = `/recipes/${recipe.id}`;
    }
    if (field === 'summary') {
      filtered.summary = `${recipe.title} · ${recipe.cuisine}`;
    }
  });
  return filtered;
};

// GET /api/recipes - Get all recipes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') ?? 20);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;
    const cuisineFilter = searchParams.get('cuisine');
    const fieldsParam = searchParams.get('fields');
    const fields = fieldsParam
      ? fieldsParam
          .split(',')
          .map(f => f.trim())
          .filter(Boolean)
      : null;

    const userIdFilter = searchParams.get('userId');

    const db = getDb();
    let queryRef: firestore.Query<firestore.DocumentData> = db.collection('recipes');

    if (cuisineFilter) {
      queryRef = queryRef.where('cuisine', '==', cuisineFilter);
    }
    if (userIdFilter) {
      queryRef = queryRef.where('userId', '==', userIdFilter);
    }

    queryRef = queryRef.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await queryRef.get();
    const recipes = snapshot.docs.map(doc => serializeRecipe(doc));
    const payload = fields ? recipes.map(recipe => filterRecipeFields(recipe, fields)) : recipes;

    return NextResponse.json({
      count: recipes.length,
      recipes: payload,
      source: 'firestore',
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const recipeData = await request.json();

    // Validate required fields
    if (!recipeData.title || !recipeData.author) {
      return NextResponse.json({ error: 'Title and author are required' }, { status: 400 });
    }

    const admin = getAdmin();

    // Extract verified userId from Bearer token if present
    let verifiedUserId: string | undefined;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.slice(7);
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        verifiedUserId = decoded.uid;
      } catch {
        // Token invalid — treat as anonymous (recipe still created, just unowned)
      }
    }

    // If an image URL or data URI was provided by the client (selectedImageUrl),
    // attempt to upload it to Firebase Storage and replace imageId with a stable
    // public storage URL. This avoids storing fragile third-party redirect URLs.
    let imageIdValue = recipeData.imageId as string | undefined;
    // Prefer an explicit selectedImageUrl or imageUrl from the client payload over the legacy imageId.
    const selectedImageUrl =
      (recipeData.selectedImageUrl as string) ||
      (recipeData.imageUrl as string) ||
      (recipeData.imageId as string) ||
      '';
    console.warn('Recipe image inputs:', {
      providedImageId: recipeData.imageId,
      providedSelectedImageUrl: recipeData.selectedImageUrl,
      providedImageUrl: recipeData.imageUrl,
      resolvedSelectedImageUrl: selectedImageUrl,
    });

    async function uploadImageToStorage(rawUrl: string) {
      if (!rawUrl) return undefined;
      // Resolve a bucket similar to the upload route so we don't attempt to write to a non-existent bucket
      async function resolveBucket() {
        const candidates: string[] = [];
        if (process.env.FIREBASE_STORAGE_BUCKET)
          candidates.push(process.env.FIREBASE_STORAGE_BUCKET);
        try {
          const apps = admin.apps as unknown as Array<{ options?: Record<string, unknown> }>;
          if (apps && apps.length > 0 && apps[0].options) {
            const opts = apps[0].options as Record<string, unknown>;
            if (typeof opts.storageBucket === 'string' && opts.storageBucket)
              candidates.push(opts.storageBucket as string);
            if (typeof opts.projectId === 'string' && opts.projectId) {
              const pid = opts.projectId as string;
              candidates.push(`${pid}.appspot.com`);
              candidates.push(`${pid}.firebasestorage.app`);
            }
          }
        } catch (err) {
          console.warn('Failed to inspect admin.apps options for bucket resolution', err);
        }
        if (process.env.FIREBASE_PROJECT_ID) {
          candidates.push(`${process.env.FIREBASE_PROJECT_ID}.appspot.com`);
          candidates.push(`${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`);
        }
        const seen = new Set<string>();
        const uniq = candidates.filter(c => {
          if (!c) return false;
          if (seen.has(c)) return false;
          seen.add(c);
          return true;
        });
        for (const name of uniq) {
          try {
            const b = admin.storage().bucket(name);
            const existsResUnknown = await (
              b as unknown as { exists?: () => Promise<unknown> }
            ).exists?.();
            const exists = Array.isArray(existsResUnknown)
              ? (existsResUnknown as unknown[])[0] === true
              : Boolean(existsResUnknown);
            if (exists) {
              console.warn('Resolved storage bucket for recipes route:', name);
              return b;
            }
          } catch (err) {
            console.warn('Bucket check failed for', name, err instanceof Error ? err.message : err);
          }
        }
        try {
          return admin.storage().bucket();
        } catch (err) {
          console.error('No valid storage bucket found');
          throw err;
        }
      }
      try {
        const bucket = await resolveBucket();

        let buffer: Buffer | null = null;
        let contentType = 'image/jpeg';

        if (rawUrl.startsWith('data:')) {
          // data:<mime>;base64,<data>
          const match = rawUrl.match(/^data:(.+);base64,(.*)$/);
          if (!match) return undefined;
          contentType = match[1];
          buffer = Buffer.from(match[2], 'base64');
        } else {
          // Fetch external image with retries + exponential backoff
          let fetchErr: unknown = null;
          const backoffs = [0, 500, 1000];
          for (let attempt = 1; attempt <= 3; attempt++) {
            if (attempt > 1) await sleep(backoffs[attempt - 1]);
            const controller =
              typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timer = controller
              ? setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS * 2)
              : undefined;
            try {
              const resp = await fetch(rawUrl, { method: 'GET', signal: controller?.signal });
              if (!resp.ok) {
                fetchErr = new Error(`Image fetch failed with status ${resp.status}`);
                continue;
              }
              const arrayBuffer = await resp.arrayBuffer();
              buffer = Buffer.from(arrayBuffer);
              const ct = resp.headers.get('content-type');
              if (ct) contentType = ct.split(';')[0];
              fetchErr = null;
              break;
            } catch (err) {
              fetchErr = err;
            } finally {
              if (timer) clearTimeout(timer);
            }
          }

          if (!buffer) {
            const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            console.warn('Failed to fetch external image for upload after retries', {
              url: rawUrl,
              error: errMsg,
            });
            // Generate a simple SVG placeholder (so we don't persist fragile redirects)
            try {
              const safeText = slugifyForImage(rawUrl).replace(/[^a-z0-9\-]/gi, ' ');
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#cccccc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#333" font-family="Arial, Helvetica, sans-serif" font-size="36">${escapeHtml(safeText)}</text></svg>`;
              buffer = Buffer.from(svg, 'utf8');
              contentType = 'image/svg+xml';
            } catch (svgErr) {
              console.warn('Failed to generate SVG placeholder', svgErr);
              return undefined;
            }
          }
        }

        const ext = (contentType.split('/')[1] || 'jpg').split('+')[0];
        const filename = `recipes/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const file = bucket.file(filename);

        try {
          await file.save(buffer, { metadata: { contentType } });
        } catch (err) {
          console.error('Failed to save file to storage', {
            url: rawUrl,
            filename,
            bucket: bucket.name,
            error: err instanceof Error ? err.message : String(err),
          });
          return undefined;
        }

        let madePublic = false;
        try {
          const candidate = file as unknown as StorageFileLike;
          if (typeof candidate.makePublic === 'function') {
            await candidate.makePublic();
            madePublic = true;
          } else {
            madePublic = false;
          }
        } catch (err) {
          console.warn('makePublic failed', {
            filename,
            bucket: bucket.name,
            error: err instanceof Error ? err.message : String(err),
          });
          madePublic = false;
        }

        if (madePublic) {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
          console.warn('Persisted image (public):', { url: publicUrl, source: rawUrl });
          return publicUrl;
        }

        try {
          const expires = Date.now() + 1000 * 60 * 60 * 24 * 365; // 1 year
          const signedUrlGetter = (file as unknown as StorageFileLike).getSignedUrl;
          if (typeof signedUrlGetter === 'function') {
            const [signedUrl] = await signedUrlGetter.call(file, { action: 'read', expires });
            if (signedUrl) {
              console.warn('Persisted image (signed):', { url: signedUrl, source: rawUrl });
              return signedUrl;
            }
          }
        } catch (err) {
          console.warn('getSignedUrl failed', {
            filename,
            bucket: bucket.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        const fallbackUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        console.warn('Persisted image (fallback):', { url: fallbackUrl, source: rawUrl });
        return fallbackUrl;
      } catch (error) {
        console.warn(
          'Failed to upload image to storage:',
          error instanceof Error ? error.message : error
        );
        return undefined;
      }
    }

    // If the client provided a selectedImageUrl or imageId that looks like an external URL or data URI,
    // upload and replace it.
    if (
      selectedImageUrl &&
      (selectedImageUrl.startsWith('http') || selectedImageUrl.startsWith('data:'))
    ) {
      const uploaded = await uploadImageToStorage(selectedImageUrl);
      if (uploaded) {
        imageIdValue = uploaded;
      } else {
        // If upload failed, avoid storing fragile third-party redirect URLs directly.
        // Instead return a small inline SVG data URI so the UI always has a displayable image.
        if (selectedImageUrl.startsWith('data:')) {
          imageIdValue = selectedImageUrl;
        } else {
          try {
            const safeText = slugifyForImage(selectedImageUrl || 'recipe');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#eeeeee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#444" font-family="Arial, Helvetica, sans-serif" font-size="36">${escapeHtml(safeText)}</text></svg>`;
            imageIdValue = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
          } catch (err) {
            console.warn('Failed to create inline SVG fallback for selectedImageUrl', err);
            imageIdValue = selectedImageUrl;
          }
        }
      }
    }

    // Additionally, the client may send an `imageUrl` field (for generated images). Avoid storing
    // very large data URIs or raw image data in Firestore (which has a ~1MB field limit). If we
    // detect a large data URI, attempt to upload it to Storage and replace it with a stable URL.
    let finalImageUrl: string | undefined = undefined;
    const clientImageUrl = (recipeData as Record<string, unknown>)['imageUrl'] as
      | string
      | undefined;
    try {
      if (clientImageUrl) {
        const looksLikeData = clientImageUrl.startsWith('data:');
        const looksLikeHttp = clientImageUrl.startsWith('http');
        const tooLarge = clientImageUrl.length > 1000000; // ~1MB

        if (looksLikeData || tooLarge) {
          const uploaded = await uploadImageToStorage(clientImageUrl);
          if (uploaded) {
            finalImageUrl = uploaded;
          } else {
            // If upload failed and the data URI is small enough, keep it; otherwise omit.
            if (looksLikeData && !tooLarge) {
              finalImageUrl = clientImageUrl;
            } else {
              finalImageUrl = undefined;
            }
          }
        } else if (looksLikeHttp) {
          // External HTTP URLs are OK to keep (they are usually short). Optionally we could
          // attempt to upload them too but we'll keep them as-is to avoid delays.
          finalImageUrl = clientImageUrl;
        }
      }
    } catch (err) {
      console.warn('Failed to process client imageUrl:', err instanceof Error ? err.message : err);
      finalImageUrl = undefined;
    }

    // If we uploaded the selected image earlier and stored the uploaded URL in imageIdValue,
    // prefer that as the canonical imageUrl (so UI and Instagram posting use it).
    if (
      !finalImageUrl &&
      typeof imageIdValue === 'string' &&
      (imageIdValue.startsWith('http') || imageIdValue.startsWith('data:'))
    ) {
      finalImageUrl = imageIdValue;
      console.warn(
        'Using uploaded image URL as finalImageUrl for recipe:',
        finalImageUrl?.slice?.(0, 100)
      );
    }

    const newRecipe = {
      ...recipeData,
      imageId: imageIdValue ?? (recipeData.imageId as string) ?? '',
      // Prefer processed/stored imageUrl when available
      imageUrl: finalImageUrl ?? (recipeData.imageUrl as string) ?? undefined,
      rating: recipeData.rating ?? 0,
      ratingCount: recipeData.ratingCount ?? 0,
      comments: recipeData.comments ?? [],
      // Attach verified userId (overrides any client-supplied value for security)
      ...(verifiedUserId ? { userId: verifiedUserId } : {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const db = getDb();
    const docRef = await db.collection('recipes').add(newRecipe);
    const createdDoc = await docRef.get();
    console.warn('Created recipe document data:', createdDoc.data());

    // If the client requested posting to Instagram and we have a public image URL, attempt to post asynchronously.
    try {
      const wantsInstagram = Boolean((recipeData as Record<string, unknown>).postToInstagram);
      const publicImageUrl = (newRecipe.imageUrl as string) || (newRecipe.imageId as string) || '';
      if (wantsInstagram) {
        if (publicImageUrl && !publicImageUrl.startsWith('data:')) {
          // fire-and-forget; log result when it completes
          void shareRecipeToInstagram(docRef.id)
            .then(res => {
              if (!res.success)
                console.warn('Instagram posting failed for recipe', docRef.id, res.error);
              else console.warn('Instagram posted for recipe', docRef.id, res.permalink);
            })
            .catch(err => console.error('Error during Instagram post attempt:', err));
        } else {
          console.warn(
            'Skipping Instagram post: no public image URL available for recipe',
            docRef.id
          );
        }
      }
    } catch (igErr) {
      console.error('Error scheduling Instagram post (non-fatal):', igErr);
    }

    // Ensure the image URL stored in the recipe is accessible from the browser.
    try {
      const candidate = (newRecipe.imageUrl as string) || (newRecipe.imageId as string) || '';
      if (
        candidate &&
        (candidate.includes('storage.googleapis.com') ||
          candidate.includes('firebasestorage.googleapis.com'))
      ) {
        try {
          const admin = getAdmin();
          // Try to derive bucket/name from common URL formats
          let bucketName: string | undefined;
          let filePath: string | undefined;

          try {
            const u = new URL(candidate);
            if (u.hostname === 'storage.googleapis.com') {
              // path: /{bucket}/{path}
              const parts = u.pathname.split('/').filter(Boolean);
              bucketName = parts.shift();
              filePath = parts.join('/');
            } else if (u.hostname.endsWith('firebasestorage.googleapis.com')) {
              // path: /v0/b/{bucket}/o/{encodedPath}
              const parts = u.pathname.split('/').filter(Boolean);
              const bIndex = parts.indexOf('b');
              const oIndex = parts.indexOf('o');
              if (bIndex >= 0 && parts[bIndex + 1]) bucketName = parts[bIndex + 1];
              if (oIndex >= 0 && parts[oIndex + 1])
                filePath = decodeURIComponent(parts[oIndex + 1]);
            }
          } catch {
            // ignore
          }

          if (bucketName && filePath) {
            const bucket = admin.storage().bucket(bucketName);
            const file = bucket.file(filePath);
            // Try to create a signed URL so browsers can fetch it even when ACLs are restricted
            if (
              typeof (file as unknown as { getSignedUrl?: unknown }).getSignedUrl === 'function'
            ) {
              try {
                const expires = Date.now() + 1000 * 60 * 60 * 24 * 365;
                const getter = file as unknown as {
                  getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
                };
                if (typeof getter.getSignedUrl === 'function') {
                  const [signedUrl] = await getter.getSignedUrl({ action: 'read', expires });
                  if (signedUrl) {
                    await docRef.update({
                      imageUrl: signedUrl,
                      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    console.warn('Updated recipe imageUrl to signed URL for public access');
                  }
                }
              } catch (signErr) {
                console.warn(
                  'Failed to generate signed URL for recipe image (non-fatal):',
                  signErr instanceof Error ? signErr.message : signErr
                );
              }
            }
          }
        } catch {
          console.warn('Error while attempting to ensure recipe image accessibility (non-fatal)');
        }
      }
    } catch {
      console.warn('Accessibility check for recipe image failed (non-fatal)');
    }

    return NextResponse.json({
      id: docRef.id,
      recipe: serializeRecipe(createdDoc),
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
