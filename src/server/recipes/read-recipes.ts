/**
 * Server-side recipe reads (Admin SDK). Public surfaces must use the *Published*
 * helpers: only status == 'published' recipes exist as far as visitors, the
 * sitemap and link previews are concerned.
 */
import type { firestore } from 'firebase-admin';
import { cache } from 'react';

import type { Comment, Recipe, RecipeSource, RecipeStatus } from '@/lib/types';

import adminConfig from '../../../config/firebase-admin';

type Snap = firestore.DocumentSnapshot<firestore.DocumentData>;

const toDate = (field: unknown): Date | undefined => {
  if (!field) return undefined;
  if (field instanceof Date) return field;
  const maybe = field as { toDate?: () => Date };
  if (typeof maybe?.toDate === 'function') return maybe.toDate();
  if (typeof field === 'string') {
    const parsed = new Date(field);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const coerceComments = (raw: unknown): Comment[] =>
  Array.isArray(raw)
    ? raw.map(item => {
        const c = (item ?? {}) as Record<string, unknown>;
        return {
          id: typeof c.id === 'string' ? c.id : '',
          author: typeof c.author === 'string' ? c.author : 'Anonymous',
          avatarUrl: typeof c.avatarUrl === 'string' ? c.avatarUrl : '',
          text: typeof c.text === 'string' ? c.text : '',
          timestamp: typeof c.timestamp === 'string' ? c.timestamp : new Date().toISOString(),
          rating: typeof c.rating === 'number' ? c.rating : undefined,
        };
      })
    : [];

/** Public shape: no engine bookkeeping (social) and no lists of user ids. */
export function serializeRecipeDoc(doc: Snap): Recipe {
  const d = (doc.data() ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return {
    id: doc.id,
    userId: typeof d.userId === 'string' ? d.userId : undefined,
    title: typeof d.title === 'string' ? d.title : '',
    description: typeof d.description === 'string' ? d.description : '',
    author: typeof d.author === 'string' ? d.author : 'Unknown',
    imageId: typeof d.imageId === 'string' ? d.imageId : '',
    imageUrl: typeof d.imageUrl === 'string' ? d.imageUrl : undefined,
    videoUrl: typeof d.videoUrl === 'string' ? d.videoUrl : undefined,
    ingredients: strings(d.ingredients),
    instructions: strings(d.instructions),
    prepTime: typeof d.prepTime === 'string' ? d.prepTime : '',
    cookTime: typeof d.cookTime === 'string' ? d.cookTime : '',
    servings: num(d.servings),
    cuisine: typeof d.cuisine === 'string' ? d.cuisine : '',
    comments: coerceComments(d.comments),
    rating: num(d.rating),
    ratingCount: num(d.ratingCount),
    savedCount: num(d.savedCount),
    madeItCount: num(d.madeItCount),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    source: typeof d.source === 'string' ? (d.source as RecipeSource) : undefined,
    status: typeof d.status === 'string' ? (d.status as RecipeStatus) : undefined,
    sourceBook: typeof d.sourceBook === 'string' ? d.sourceBook : undefined,
    sourcePage: typeof d.sourcePage === 'number' ? d.sourcePage : undefined,
    scanPath: typeof d.scanPath === 'string' ? d.scanPath : undefined,
    scanUrl: typeof d.scanUrl === 'string' ? d.scanUrl : undefined,
    tags: strings(d.tags),
    dishPhoto:
      d.dishPhoto && typeof d.dishPhoto === 'object'
        ? (d.dishPhoto as Recipe['dishPhoto'])
        : undefined,
  };
}

export const isPublishedData = (data: Record<string, unknown> | undefined | null): boolean =>
  data?.status === 'published';

const newestFirst = (a: Recipe, b: Recipe) =>
  (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);

/** A published recipe, or null for unknown, hidden, draft and review recipes. */
export async function getPublishedRecipe(id: string): Promise<Recipe | null> {
  if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  const snap = await adminConfig.getDb().collection('recipes').doc(id).get();
  if (!snap.exists || !isPublishedData(snap.data())) return null;
  return serializeRecipeDoc(snap);
}

/**
 * Published recipes, newest first. Equality filters only, so no composite index is
 * needed; ordering happens in memory (also keeps docs that lack createdAt).
 */
export async function listPublishedRecipes(
  opts: { limit?: number; cuisine?: string; userId?: string; source?: RecipeSource } = {}
): Promise<Recipe[]> {
  let q: firestore.Query = adminConfig
    .getDb()
    .collection('recipes')
    .where('status', '==', 'published');
  if (opts.cuisine) q = q.where('cuisine', '==', opts.cuisine);
  if (opts.userId) q = q.where('userId', '==', opts.userId);
  if (opts.source) q = q.where('source', '==', opts.source);
  const snap = await q.limit(Math.min(opts.limit ?? 500, 1000)).get();
  return snap.docs.map(serializeRecipeDoc).sort(newestFirst);
}

/** Request-deduplicated getPublishedRecipe (metadata, page and image share one read). */
export const getPublishedRecipeCached = cache(getPublishedRecipe);
