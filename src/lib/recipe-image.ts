/**
 * Hosts next.config.ts lets next/image fetch and resize. A src on any other host has to be
 * rendered `unoptimized`, because the optimizer would answer 400 for it in production.
 */
const OPTIMIZABLE_HOSTS = new Set([
  'placehold.co',
  'images.unsplash.com',
  'source.unsplash.com',
  'picsum.photos',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
]);

export function canOptimizeImage(src: string): boolean {
  if (src.startsWith('/')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && OPTIMIZABLE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
