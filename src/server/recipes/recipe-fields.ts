/**
 * Field whitelist for recipe writes that come from HTTP callers.
 *
 * Shared contract with the ventures-ops content engine (stream D):
 *   source       'ammi_book' | 'sample' | 'user'
 *   status       'draft' | 'review' | 'published' | 'hidden'   (only 'published' is public)
 *   sourceBook, sourcePage, scanPath, scanUrl, tags[], dishPhoto {url, source, credit}
 *   social       {eligible, lastPostedAt, timesPosted, lastCycle}  (server/engine only)
 *
 * Ratings, comments, saves, social and Instagram bookkeeping are never client-settable.
 */

export const RECIPE_SOURCES = ['ammi_book', 'sample', 'user'] as const;
export const RECIPE_STATUSES = ['draft', 'review', 'published', 'hidden'] as const;
export type RecipeSource = (typeof RECIPE_SOURCES)[number];
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

/** Fields a recipe owner may set. */
export const OWNER_FIELDS = [
  'title',
  'description',
  'author',
  'ingredients',
  'instructions',
  'prepTime',
  'cookTime',
  'servings',
  'cuisine',
  'imageId',
  'imageUrl',
  'tags',
] as const;

/** Additional fields only an admin may set. */
export const ADMIN_ONLY_FIELDS = [
  'source',
  'status',
  'sourceBook',
  'sourcePage',
  'scanPath',
  'scanUrl',
  'dishPhoto',
] as const;

export const DEFAULT_SOCIAL = {
  eligible: false,
  lastPostedAt: null,
  timesPosted: 0,
  lastCycle: null,
} as const;

type Picked = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

const MAX_TEXT = 5000;
const MAX_LIST = 200;

function str(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.length <= max ? value : undefined;
}

function strList(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    // The add-recipe form sends newline-separated text.
    value = value.split('\n').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(value) || value.length > MAX_LIST) return undefined;
  if (!value.every(v => typeof v === 'string' && v.length <= 2000)) return undefined;
  return value as string[];
}

/**
 * Returns only whitelisted, type-checked fields. Unknown fields are dropped silently;
 * a whitelisted field with a bad type or value is an error.
 */
export function pickRecipeFields(
  body: Record<string, unknown>,
  { admin }: { admin: boolean }
): Picked {
  const allowed: readonly string[] = admin ? [...OWNER_FIELDS, ...ADMIN_ONLY_FIELDS] : OWNER_FIELDS;
  const data: Record<string, unknown> = {};

  for (const key of allowed) {
    if (!(key in body) || body[key] === undefined) continue;
    const value = body[key];
    let parsed: unknown;
    switch (key) {
      case 'title':
        parsed = str(value, 200);
        break;
      case 'author':
      case 'cuisine':
      case 'prepTime':
      case 'cookTime':
      case 'sourceBook':
        parsed = str(value, 100);
        break;
      case 'description':
        parsed = str(value, MAX_TEXT);
        break;
      case 'imageId':
      case 'imageUrl':
      case 'scanPath':
      case 'scanUrl':
        // data: URIs are handled (uploaded) by the caller before storing.
        parsed = str(value, 2_000_000);
        break;
      case 'ingredients':
      case 'instructions':
        parsed = strList(value);
        break;
      case 'tags':
        parsed = strList(value)?.map(t => t.toLowerCase().slice(0, 40));
        break;
      case 'servings': {
        const n = Number(value);
        parsed = Number.isFinite(n) && n >= 0 && n <= 1000 ? n : undefined;
        break;
      }
      case 'sourcePage': {
        const n = Number(value);
        parsed = Number.isInteger(n) && n > 0 && n < 10000 ? n : undefined;
        break;
      }
      case 'source':
        parsed = (RECIPE_SOURCES as readonly unknown[]).includes(value) ? value : undefined;
        break;
      case 'status':
        parsed = (RECIPE_STATUSES as readonly unknown[]).includes(value) ? value : undefined;
        break;
      case 'dishPhoto': {
        const v = value as Record<string, unknown> | null;
        parsed =
          v && typeof v === 'object' && str(v.url, 2000)
            ? {
                url: v.url,
                source: str(v.source, 50) ?? null,
                credit: str(v.credit, 200) ?? null,
              }
            : value === null
              ? null
              : undefined;
        break;
      }
    }
    if (parsed === undefined) return { ok: false, error: `Invalid value for ${key}` };
    data[key] = parsed;
  }

  return { ok: true, data };
}
