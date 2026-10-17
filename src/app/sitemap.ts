import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';
import { listPublishedRecipes } from '@/server/recipes/read-recipes';

export const revalidate = 3600;

/** Home, legal pages and exactly the published recipes. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const recipes = await listPublishedRecipes({ limit: 1000 }).catch(err => {
    console.error('[sitemap] could not list recipes', err);
    return [];
  });
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    ...recipes.map(r => ({
      url: `${SITE_URL}/recipes/${r.id}`,
      lastModified: r.updatedAt ?? r.createdAt,
      changeFrequency: 'monthly' as const,
      priority: r.source === 'ammi_book' ? 0.9 : 0.6,
    })),
    ...['privacy', 'terms', 'cookies'].map(p => ({
      url: `${SITE_URL}/legal/${p}`,
      changeFrequency: 'yearly' as const,
      priority: 0.1,
    })),
  ];
}
