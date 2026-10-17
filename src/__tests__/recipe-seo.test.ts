import { describe, expect, it } from 'vitest';

import { buildRecipeJsonLd, jsonLdScript, toIsoDuration } from '@/lib/recipe-jsonld';
import { metaDescription } from '@/lib/site';
import type { Recipe } from '@/lib/types';

const recipe: Recipe = {
  id: 'abc123',
  title: 'Roghan Josh',
  description: 'Slow-cooked mutton in a deep red gravy.',
  author: 'Shahar Bano',
  imageId: '',
  imageUrl: 'https://storage.googleapis.com/bucket/roghan.jpg',
  ingredients: ['1 kg mutton', '2 onions'],
  instructions: ['Brown the onions.', 'Add the mutton and cook slowly.'],
  prepTime: '20 mins',
  cookTime: '1 hr 30 mins',
  servings: 6,
  cuisine: 'Pakistani',
  comments: [],
  rating: 4.9,
  ratingCount: 120,
  source: 'ammi_book',
  status: 'published',
  sourceBook: 'monasal-bana',
  tags: ['mutton', 'curry'],
  createdAt: new Date('2026-10-01T00:00:00Z'),
};

describe('toIsoDuration', () => {
  it.each([
    ['20 mins', 'PT20M'],
    ['1 hr 30 mins', 'PT1H30M'],
    ['1½ hours', 'PT1H30M'],
    ['2 hours', 'PT2H'],
    ['45', 'PT45M'],
    ['', undefined],
    ['overnight', undefined],
  ])('%s → %s', (input, expected) => {
    expect(toIsoDuration(input)).toBe(expected);
  });
});

describe('buildRecipeJsonLd', () => {
  const ld = buildRecipeJsonLd(recipe);

  it('has the fields Google needs for a Recipe rich result', () => {
    expect(ld['@type']).toBe('Recipe');
    expect(ld.name).toBe('Roghan Josh');
    expect(ld.image).toEqual(
      expect.arrayContaining(['https://storage.googleapis.com/bucket/roghan.jpg'])
    );
    expect(ld.author).toEqual({ '@type': 'Person', name: 'Shahar Bano' });
    expect(ld.prepTime).toBe('PT20M');
    expect(ld.cookTime).toBe('PT1H30M');
    expect(ld.totalTime).toBe('PT1H50M');
    expect(ld.recipeYield).toBe('6 servings');
    expect(ld.recipeIngredient).toEqual(['1 kg mutton', '2 onions']);
    expect((ld.recipeInstructions as unknown[]).length).toBe(2);
  });

  it('never emits review stars from unverified ratings', () => {
    expect(ld).not.toHaveProperty('aggregateRating');
  });

  it('credits the book for Ammi recipes', () => {
    expect(ld.isBasedOn).toMatchObject({ '@type': 'Book', name: 'MonAsal (Bana)' });
  });
});

describe('jsonLdScript', () => {
  it('cannot close the script tag', () => {
    expect(jsonLdScript({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});

describe('metaDescription', () => {
  it('falls back and trims on a word boundary', () => {
    expect(metaDescription('', 'fallback')).toBe('fallback');
    const long = 'word '.repeat(60);
    const out = metaDescription(long, 'x');
    expect(out.length).toBeLessThanOrEqual(158);
    expect(out.endsWith('…')).toBe(true);
  });
});
