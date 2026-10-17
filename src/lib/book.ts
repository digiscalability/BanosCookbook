/**
 * Ammi's book and recipe tags, as fixed in the shared contract with ventures-ops
 * (stream-d-contracts.md, section 1).
 */

export const AMMI_BOOK_SLUG = 'monasal-bana';

const BOOK_TITLES: Record<string, string> = { [AMMI_BOOK_SLUG]: 'MonAsal (Bana)' };

/** Display title for a `sourceBook` slug. */
export function bookTitle(slug: string | undefined | null): string {
  return (slug && BOOK_TITLES[slug]) || slug || BOOK_TITLES[AMMI_BOOK_SLUG];
}

/** Canonical Storage path of a book page: book/{slug}/p{nnn}.jpg (3-digit pad). */
export function scanPathFor(slug: string, page: number): string {
  return `book/${slug}/p${String(page).padStart(3, '0')}.jpg`;
}

export const TAG_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
export const MAX_TAGS = 12;

/** "Eid Special" → "eid-special"; returns null when nothing valid is left. */
export function toTagSlug(raw: string): string | null {
  const slug = raw
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+$/, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return TAG_PATTERN.test(slug) ? slug : null;
}

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * social.eligible per the contract: a published recipe from Ammi's book with its
 * page number, scan path and scan URL all set.
 */
export function isSocialEligible(d: {
  source?: unknown;
  status?: unknown;
  sourcePage?: unknown;
  scanPath?: unknown;
  scanUrl?: unknown;
}): boolean {
  return (
    d.source === 'ammi_book' &&
    d.status === 'published' &&
    typeof d.sourcePage === 'number' &&
    Number.isInteger(d.sourcePage) &&
    d.sourcePage >= 1 &&
    nonEmpty(d.scanPath) &&
    nonEmpty(d.scanUrl) &&
    d.scanUrl.startsWith('https://')
  );
}

/** Bucket-relative object path from a Storage URL, or undefined. */
export function storagePathFromUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname === 'storage.googleapis.com') {
      const [, ...rest] = u.pathname.split('/').filter(Boolean);
      return rest.length ? decodeURIComponent(rest.join('/')) : undefined;
    }
    if (u.hostname === 'firebasestorage.googleapis.com') {
      const m = /\/v0\/b\/[^/]+\/o\/([^/]+)/.exec(u.pathname);
      return m ? decodeURIComponent(m[1]) : undefined;
    }
  } catch {
    // not a URL
  }
  return undefined;
}
