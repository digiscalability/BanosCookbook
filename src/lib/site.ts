/** Canonical site identity for metadata, sitemap, robots and structured data. */

const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.banoscookbook.com';

export const SITE_URL = (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).replace(
  /\/$/,
  ''
);
export const SITE_NAME = "Bano's Cookbook";
export const SITE_DESCRIPTION =
  "Ammi's recipes, transcribed from Shahar Bano's handwritten notebooks from 1981: Pakistani home cooking, cakes and party food, kept the way she wrote them.";
export const AMMI_NAME = 'Shahar Bano';

export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Trims text to a meta-description length on a word boundary. */
export function metaDescription(text: string | undefined, fallback: string, max = 158): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim() || fallback;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`;
}
