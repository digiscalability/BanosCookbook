import type { Metadata } from 'next';

import { NewsletterSignup } from '@/components/newsletter-signup';
import type { RecipeCardData } from '@/components/recipe-card';
import { jsonLdScript } from '@/lib/recipe-jsonld';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { listPublishedRecipes } from '@/server/recipes/read-recipes';

import HomeClient from './home-client';

// The recipe cards are rendered into the HTML so the first image is discoverable in the
// document (and preloaded) instead of waiting for client JS and a Firestore round trip.
export const revalidate = 300;

async function loadInitialRecipes(): Promise<RecipeCardData[] | undefined> {
  try {
    const recipes = await listPublishedRecipes({ limit: 50 });
    return recipes.map(r => ({
      id: r.id,
      title: r.title,
      author: r.author,
      cuisine: r.cuisine,
      imageId: r.imageId,
      imageUrl: r.imageUrl,
      videoUrl: r.videoUrl,
      rating: r.rating,
      ratingCount: r.ratingCount,
      savedCount: r.savedCount,
      comments: r.comments.map(c => ({ id: c.id })),
    }));
  } catch (err) {
    // The client fetches the list itself, so a failed read only costs the early render.
    console.error('[home] could not list recipes for the first render', err);
    return undefined;
  }
}

const title = `${SITE_NAME}: Ammi's recipes from her 1981 notebooks`;

export const metadata: Metadata = {
  title: { absolute: title },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
  },
  twitter: { card: 'summary_large_image', title, description: SITE_DESCRIPTION },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default async function HomePage() {
  const initialRecipes = await loadInitialRecipes();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
      />
      <HomeClient initialRecipes={initialRecipes} />
      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <NewsletterSignup />
      </div>
    </>
  );
}
