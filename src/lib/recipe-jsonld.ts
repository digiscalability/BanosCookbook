/**
 * schema.org/Recipe JSON-LD for Google rich results.
 * https://developers.google.com/search/docs/appearance/structured-data/recipe
 *
 * No aggregateRating: ratings on this site can be submitted anonymously, so they
 * are not trustworthy enough to show as review stars in search.
 */
import { bookTitle } from '@/lib/book';
import type { Recipe } from '@/lib/types';
import { absoluteUrl, AMMI_NAME, SITE_NAME, SITE_URL } from '@/lib/site';

/** "1 hr 30 mins", "45 minutes", "1½ hours", "2h" → ISO 8601 duration (PT1H30M). */
export function toIsoDuration(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const s = text.toLowerCase().replace('½', '.5').replace('¼', '.25').replace('¾', '.75');
  const hours = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(s);
  const mins = /(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/.exec(s);
  let total = 0;
  if (hours) total += parseFloat(hours[1]) * 60;
  if (mins) total += parseFloat(mins[1]);
  if (!hours && !mins) {
    const bare = /^\s*(\d+)\s*$/.exec(s); // a bare number is minutes
    if (bare) total = parseInt(bare[1], 10);
  }
  total = Math.round(total);
  if (total <= 0) return undefined;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
}

function minutes(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : 0;
}

export function recipeImageUrls(recipe: Recipe): string[] {
  const urls = [recipe.dishPhoto?.url, recipe.imageUrl, recipe.imageId, recipe.scanUrl].filter(
    (u): u is string => typeof u === 'string' && /^https:\/\//.test(u)
  );
  return [...new Set(urls)];
}

export function buildRecipeJsonLd(recipe: Recipe): Record<string, unknown> {
  const url = absoluteUrl(`/recipes/${recipe.id}`);
  const isAmmi = recipe.source === 'ammi_book';
  const prep = toIsoDuration(recipe.prepTime);
  const cook = toIsoDuration(recipe.cookTime);
  const totalMinutes = minutes(prep) + minutes(cook);
  const total = totalMinutes > 0 ? toIsoDuration(`${totalMinutes} min`) : undefined;
  const images = [...recipeImageUrls(recipe), absoluteUrl(`/recipes/${recipe.id}/opengraph-image`)];

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${url}#recipe`,
    name: recipe.title,
    url,
    mainEntityOfPage: url,
    image: images,
    author: { '@type': 'Person', name: isAmmi ? AMMI_NAME : recipe.author || AMMI_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    description: recipe.description || undefined,
    datePublished: recipe.createdAt ? new Date(recipe.createdAt).toISOString() : undefined,
    dateModified: recipe.updatedAt ? new Date(recipe.updatedAt).toISOString() : undefined,
    recipeCuisine: recipe.cuisine || undefined,
    recipeYield: recipe.servings ? `${recipe.servings} servings` : undefined,
    prepTime: prep,
    cookTime: cook,
    totalTime: total,
    keywords: recipe.tags?.length ? recipe.tags.join(', ') : undefined,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
      url: `${url}#step-${i + 1}`,
    })),
  };
  if (isAmmi) {
    data.isBasedOn = {
      '@type': 'Book',
      name: bookTitle(recipe.sourceBook),
      author: { '@type': 'Person', name: AMMI_NAME },
    };
  }
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

/** Serialises for a <script type="application/ld+json"> without allowing </script> breakouts. */
// U+2028/U+2029 are valid in JSON but end lines in older JS parsers; built from char codes
// so the source file never contains them literally.
const LINE_SEPARATORS = new RegExp(
  `[${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`,
  'g'
);
const ESCAPED_LT = `${String.fromCharCode(92)}u003c`;

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, ESCAPED_LT).replace(LINE_SEPARATORS, '');
}
