/**
 * Tests for firestore-products.ts — validates product type constraints.
 * Firestore is mocked so no actual database calls are made.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Firebase client SDK
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-product-id' }),
  collection: vi.fn().mockReturnValue({}),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn().mockReturnValue({}),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn().mockReturnValue({}),
  serverTimestamp: vi.fn().mockReturnValue({ _type: 'serverTimestamp' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  where: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
}));

import { createProduct, updateProduct } from '../lib/firestore-products';
import type { CreatorProduct } from '../lib/firestore-products';

const VALID_PRODUCT: Omit<CreatorProduct, 'id' | 'createdAt'> = {
  userId: 'user-123',
  username: 'chef_maria',
  title: '30-Day Mediterranean Meal Plan',
  description: 'A comprehensive guide to Mediterranean cooking.',
  price: 999, // $9.99 in cents
  type: 'meal-plan',
  isPublished: false,
};

describe('createProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a product with valid data', async () => {
    const id = await createProduct(VALID_PRODUCT);
    expect(id).toBe('mock-product-id');
  });

  it('rejects product with empty title', async () => {
    await expect(
      createProduct({ ...VALID_PRODUCT, title: '' })
    ).rejects.toThrow('Product title is required');
  });

  it('rejects product with whitespace-only title', async () => {
    await expect(
      createProduct({ ...VALID_PRODUCT, title: '   ' })
    ).rejects.toThrow('Product title is required');
  });

  it('rejects product with negative price', async () => {
    await expect(
      createProduct({ ...VALID_PRODUCT, price: -100 })
    ).rejects.toThrow('Product price must be a non-negative number');
  });

  it('accepts product with price of 0 (free product)', async () => {
    const id = await createProduct({ ...VALID_PRODUCT, price: 0 });
    expect(id).toBe('mock-product-id');
  });

  it('rejects product with invalid type', async () => {
    await expect(
      // @ts-expect-error Testing invalid type
      createProduct({ ...VALID_PRODUCT, type: 'invalid-type' })
    ).rejects.toThrow('Product type must be one of');
  });

  it('accepts all valid product types', async () => {
    const types = ['ebook', 'meal-plan', 'other'] as const;
    for (const type of types) {
      const id = await createProduct({ ...VALID_PRODUCT, type });
      expect(id).toBe('mock-product-id');
    }
  });

  it('accepts product with optional fields', async () => {
    const id = await createProduct({
      ...VALID_PRODUCT,
      coverImageUrl: 'https://example.com/cover.jpg',
      fileUrl: 'https://example.com/file.pdf',
    });
    expect(id).toBe('mock-product-id');
  });
});

describe('updateProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects update with negative price', async () => {
    await expect(
      updateProduct('product-123', { price: -50 })
    ).rejects.toThrow('Product price must be a non-negative number');
  });

  it('accepts update with valid price', async () => {
    await expect(
      updateProduct('product-123', { price: 1999 })
    ).resolves.toBeUndefined();
  });

  it('accepts update with price of 0', async () => {
    await expect(
      updateProduct('product-123', { price: 0 })
    ).resolves.toBeUndefined();
  });

  it('accepts partial updates (title only)', async () => {
    await expect(
      updateProduct('product-123', { title: 'Updated Title' })
    ).resolves.toBeUndefined();
  });

  it('accepts toggling isPublished', async () => {
    await expect(
      updateProduct('product-123', { isPublished: true })
    ).resolves.toBeUndefined();
  });
});
