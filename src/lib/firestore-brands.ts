/**
 * Firestore helpers for Brand Marketplace integrations.
 * Collection: brand_integrations/{integrationId}
 */

import {
  addDoc,
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from './firebase';
import type { CreditTier } from './firestore-credits';

export type BrandStatus = 'pending' | 'active' | 'completed';

export interface BrandIntegration {
  id: string;
  brandName: string;
  brandWebsite: string;
  productCategory: string;
  contactEmail: string;
  targetCreatorTiers: CreditTier[];
  status: BrandStatus;
  notes: string;
  createdAt: Date;
}

const BRANDS_COLLECTION = 'brand_integrations';

/** Create a new brand integration lead. */
export async function createBrandIntegration(
  data: Omit<BrandIntegration, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, BRANDS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Get all brand integrations. */
export async function getBrandIntegrations(): Promise<BrandIntegration[]> {
  const snap = await getDocs(collection(db, BRANDS_COLLECTION));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      brandName: data.brandName as string,
      brandWebsite: data.brandWebsite as string,
      productCategory: data.productCategory as string,
      contactEmail: data.contactEmail as string,
      targetCreatorTiers: (data.targetCreatorTiers as CreditTier[]) ?? [],
      status: (data.status as BrandStatus) ?? 'pending',
      notes: (data.notes as string) ?? '',
      createdAt:
        typeof (data.createdAt as { toDate?: () => Date })?.toDate === 'function'
          ? (data.createdAt as { toDate: () => Date }).toDate()
          : new Date(),
    };
  });
}

/** Update specific fields of an existing brand integration. */
export async function updateBrandIntegration(
  integrationId: string,
  updates: Partial<Omit<BrandIntegration, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, BRANDS_COLLECTION, integrationId);
  await updateDoc(ref, { ...updates });
}
