/**
 * Firestore helpers for the Creator Digital Storefront.
 * Collection: creator_products/{productId}
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from './firebase';

export type ProductType = 'ebook' | 'meal-plan' | 'other';

export interface CreatorProduct {
  id: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  /** Price in cents (e.g. 999 = $9.99) */
  price: number;
  fileUrl?: string;
  coverImageUrl?: string;
  type: ProductType;
  isPublished: boolean;
  createdAt: Date;
}

const PRODUCTS_COLLECTION = 'creator_products';

function validateProduct(data: Omit<CreatorProduct, 'id' | 'createdAt'>): void {
  if (!data.title || data.title.trim().length === 0) {
    throw new Error('Product title is required');
  }
  if (typeof data.price !== 'number' || data.price < 0) {
    throw new Error('Product price must be a non-negative number (in cents)');
  }
  if (!['ebook', 'meal-plan', 'other'].includes(data.type)) {
    throw new Error('Product type must be one of: ebook, meal-plan, other');
  }
}

/** Create a new product and return its Firestore ID. */
export async function createProduct(
  data: Omit<CreatorProduct, 'id' | 'createdAt'>
): Promise<string> {
  validateProduct(data);
  const ref = await addDoc(collection(db, PRODUCTS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Get all products (published or not) for a given user. */
export async function getProductsByUserId(userId: string): Promise<CreatorProduct[]> {
  const q = query(collection(db, PRODUCTS_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId as string,
      username: data.username as string,
      title: data.title as string,
      description: data.description as string,
      price: data.price as number,
      fileUrl: data.fileUrl as string | undefined,
      coverImageUrl: data.coverImageUrl as string | undefined,
      type: data.type as ProductType,
      isPublished: data.isPublished as boolean,
      createdAt:
        typeof (data.createdAt as { toDate?: () => Date })?.toDate === 'function'
          ? (data.createdAt as { toDate: () => Date }).toDate()
          : new Date(),
    };
  });
}

/** Get only published products for a given user. */
export async function getPublishedProductsByUserId(userId: string): Promise<CreatorProduct[]> {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where('userId', '==', userId),
    where('isPublished', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId as string,
      username: data.username as string,
      title: data.title as string,
      description: data.description as string,
      price: data.price as number,
      fileUrl: data.fileUrl as string | undefined,
      coverImageUrl: data.coverImageUrl as string | undefined,
      type: data.type as ProductType,
      isPublished: data.isPublished as boolean,
      createdAt:
        typeof (data.createdAt as { toDate?: () => Date })?.toDate === 'function'
          ? (data.createdAt as { toDate: () => Date }).toDate()
          : new Date(),
    };
  });
}

/** Update specific fields of an existing product. */
export async function updateProduct(
  productId: string,
  updates: Partial<Omit<CreatorProduct, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  if (updates.price !== undefined && (typeof updates.price !== 'number' || updates.price < 0)) {
    throw new Error('Product price must be a non-negative number (in cents)');
  }
  const ref = doc(db, PRODUCTS_COLLECTION, productId);
  await updateDoc(ref, { ...updates });
}

/** Delete a product by ID. */
export async function deleteProduct(productId: string): Promise<void> {
  const ref = doc(db, PRODUCTS_COLLECTION, productId);
  await deleteDoc(ref);
}
