import { describe, expect, it } from 'vitest';

import { isSocialEligible, scanPathFor, toTagSlug } from '../lib/book';
import { planRecipe } from '../../scripts/migrations/2026-10-recipes-source-status';

const BUCKET = 'https://storage.googleapis.com/studio-4664575455-de3d2.firebasestorage.app';

describe('2026-10 recipes migration (stream-d-contracts.md §1)', () => {
  it("marks Ammi's recipes as published book recipes with the book slug", () => {
    const row = planRecipe('a', {
      title: 'Roghan Josh',
      author: 'Shahar Bano',
      imageUrl: `${BUCKET}/generated/roghan-josh_1.png?GoogleAccessId=x&Signature=y`,
    });
    expect(row.action).toBe('ammi_book/published');
    expect(row.update).toMatchObject({
      source: 'ammi_book',
      status: 'published',
      sourceBook: 'monasal-bana',
      social: { eligible: false },
      dishPhoto: {
        url: `${BUCKET}/generated/roghan-josh_1.png?GoogleAccessId=x&Signature=y`,
        path: 'generated/roghan-josh_1.png',
        aiGenerated: true,
      },
    });
    expect(Object.keys(row.update?.social as object)).toEqual(['eligible']);
  });

  it('leaves aiGenerated unset for photos that did not come from the generator', () => {
    const row = planRecipe('a2', {
      title: 'Prawns',
      author: 'Shahar Bano',
      imageUrl: `${BUCKET}/recipes/123_abc.jpeg`,
    });
    expect(row.update?.dishPhoto).toEqual({ url: `${BUCKET}/recipes/123_abc.jpeg`, path: 'recipes/123_abc.jpeg' });
  });

  it('hides everything else as a sample, keeping the document', () => {
    const row = planRecipe('b', { title: 'Thai Green Curry', author: 'Niran Patel', rating: 4.8 });
    expect(row.update).toMatchObject({ source: 'sample', status: 'hidden', social: { eligible: false } });
    expect(row.update).not.toHaveProperty('rating');
    expect(row.update).not.toHaveProperty('sourceBook');
  });

  it('needs sourcePage, scanPath and scanUrl before a book recipe is social-eligible', () => {
    const scan = { scanPath: scanPathFor('monasal-bana', 12), scanUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/y?alt=media&token=t' };
    expect(planRecipe('c', { title: 'Prawns', author: 'Shahar Bano', ...scan }).socialEligible).toBe(false);
    expect(planRecipe('d', { title: 'Prawns', author: 'Shahar Bano', ...scan, sourcePage: 12 }).socialEligible).toBe(true);
    expect(planRecipe('e', { title: 'Cake', author: 'Dexter', ...scan, sourcePage: 3 }).socialEligible).toBe(false);
  });

  it('skips documents already on the contract (safe to re-run)', () => {
    const row = planRecipe('f', { title: 'X', author: 'Shahar Bano', source: 'ammi_book', status: 'draft' });
    expect(row.action).toBe('skip (already migrated)');
    expect(row.update).toBeNull();
  });

  it("normalises pre-contract 'user' / 'review' values", () => {
    const row = planRecipe('g', { title: 'Mine', author: 'Alice', source: 'user', status: 'review' });
    expect(row.action).toBe('normalise legacy values');
    expect(row.update).toMatchObject({ source: 'community', status: 'draft', social: { eligible: false } });
  });

  it('keeps contract social extras and slugifies tags', () => {
    const row = planRecipe('h', {
      title: 'Shahi Tukras',
      author: 'Shahar Bano',
      tags: ['Eid Special', '#Dessert', 'dessert', '12'],
      social: { excludePlatforms: ['pinterest'], hookNote: 'Ammi made this every Eid', timesPosted: 3 },
    });
    expect(row.update?.tags).toEqual(['eid-special', 'dessert']);
    expect(row.update?.social).toEqual({
      eligible: false,
      excludePlatforms: ['pinterest'],
      hookNote: 'Ammi made this every Eid',
    });
  });
});

describe('book helpers', () => {
  it('pads scan paths to three digits', () => {
    expect(scanPathFor('monasal-bana', 7)).toBe('book/monasal-bana/p007.jpg');
  });

  it('builds contract tag slugs', () => {
    expect(toTagSlug('Eid Special!')).toBe('eid-special');
    expect(toTagSlug('123')).toBeNull();
  });

  it('requires an https scanUrl', () => {
    expect(
      isSocialEligible({ source: 'ammi_book', status: 'published', sourcePage: 1, scanPath: 'p', scanUrl: 'http://x' })
    ).toBe(false);
  });
});
