/**
 * Book ingestion for Ammi's recipes (admin only; callers must check).
 *
 * Contract (stream-d-contracts.md §1): a recipe's scanPath is always the canonical
 * book/monasal-bana/p{nnn}.jpg with a download-token scanUrl, and needs a sourcePage.
 * Phone photos land in book/monasal-bana/uploads/ first (the page number is often only
 * known after reading the draft) and are copied to the canonical path when saved or
 * attached. An existing canonical page image is never overwritten.
 */
import { randomUUID } from 'node:crypto';

import type { firestore } from 'firebase-admin';
import sharp from 'sharp';

import { AMMI_BOOK_SLUG, isSocialEligible, scanPathFor } from '@/lib/book';
import type { RecipeStatus } from '@/lib/types';

import adminConfig from '../../../config/firebase-admin';

import { DEFAULT_SOCIAL, pickRecipeFields } from './recipe-fields';

export const BOOK_ID = AMMI_BOOK_SLUG;
export const AMMI_AUTHOR = 'Shahar Bano';
const MAX_EDGE = 2400;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export interface ScanRef {
  scanPath: string;
  scanUrl: string;
  sourcePage?: number;
  bookPageId?: string;
}

export interface IngestListItem {
  id: string;
  title: string;
  status: string | null;
  source: string | null;
  sourcePage: number | null;
  scanUrl: string | null;
  socialEligible: boolean;
}

export interface BookPageItem {
  id: string;
  page: number;
  scanUrl: string;
  recipeIds: string[];
}

const db = () => adminConfig.getDb();
const bucket = () => adminConfig.getStorage().bucket();
const serverTimestamp = () => adminConfig.getAdmin().firestore.FieldValue.serverTimestamp();
const pageDocId = (page: number) => `${BOOK_ID}_p${String(page).padStart(3, '0')}`;

function downloadUrl(bucketName: string, path: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function validPage(page: unknown): number | undefined {
  const n = Number(page);
  return Number.isInteger(n) && n >= 1 && n < 10000 ? n : undefined;
}

/** Normalises a phone photo (rotation, size) and stores it as a book upload. */
export async function storePagePhoto(input: Buffer): Promise<ScanRef & { jpeg: Buffer }> {
  const jpeg = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  const path = `book/${BOOK_ID}/uploads/${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const token = randomUUID();
  const b = bucket();
  await b.file(path).save(jpeg, {
    resumable: false,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token, bookId: BOOK_ID },
    },
  });
  return { scanPath: path, scanUrl: downloadUrl(b.name, path, token), jpeg };
}

export async function loadBookPage(bookPageId: string): Promise<ScanRef & { jpeg: Buffer }> {
  if (!ID_RE.test(bookPageId)) throw new Error('Unknown book page');
  const snap = await db().collection('book_pages').doc(bookPageId).get();
  const d = snap.data();
  if (!snap.exists || !d || typeof d.storagePath !== 'string') throw new Error('Unknown book page');
  const [buffer] = await bucket().file(d.storagePath).download();
  const jpeg = await sharp(buffer)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return {
    scanPath: d.storagePath,
    scanUrl: String(d.scanUrl ?? ''),
    sourcePage: validPage(d.page),
    bookPageId,
    jpeg,
  };
}

/** Runs the existing handwritten-recipe flow on a page image. */
export async function draftFromImage(jpeg: Buffer) {
  const { extractRecipeFromImage } = await import('@/ai/flows/recipe-from-image');
  return extractRecipeFromImage({
    photoDataUri: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
  });
}

/**
 * Returns the canonical page scan for `page`, creating it from `scan` (an upload) when
 * the page has no image yet. Also upserts the book_pages index entry.
 */
export async function canonicalScan(scan: ScanRef, page: number): Promise<ScanRef> {
  const b = bucket();
  const canonical = scanPathFor(BOOK_ID, page);
  const target = b.file(canonical);
  const [exists] = await target.exists();

  let token: string;
  if (exists) {
    const [meta] = await target.getMetadata();
    const tokens = String(meta.metadata?.firebaseStorageDownloadTokens ?? '');
    token = tokens.split(',')[0] || randomUUID();
    if (!tokens) await target.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  } else {
    if (!scan.scanPath.startsWith(`book/${BOOK_ID}/`)) throw new Error('Unexpected scan path');
    token = randomUUID();
    await b.file(scan.scanPath).copy(target);
    await target.setMetadata({
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token, bookId: BOOK_ID, page: String(page) },
    });
  }

  const scanUrl = downloadUrl(b.name, canonical, token);
  await db()
    .collection('book_pages')
    .doc(pageDocId(page))
    .set(
      {
        bookId: BOOK_ID,
        page,
        storagePath: canonical,
        scanUrl,
        ...(exists ? {} : { status: 'new', recipeIds: [], uploadedAt: serverTimestamp(), origin: 'photo' }),
      },
      { merge: true }
    );
  return { scanPath: canonical, scanUrl, sourcePage: page, bookPageId: pageDocId(page) };
}

async function linkBookPage(bookPageId: string | undefined, recipeId: string) {
  if (!bookPageId) return;
  await db()
    .collection('book_pages')
    .doc(bookPageId)
    .set(
      {
        recipeIds: adminConfig.getAdmin().firestore.FieldValue.arrayUnion(recipeId),
        status: 'linked',
      },
      { merge: true }
    );
}

export async function createAmmiRecipe(
  input: Record<string, unknown>,
  opts: { status: Extract<RecipeStatus, 'draft' | 'published'>; scan?: ScanRef; adminUid: string }
): Promise<string> {
  const picked = pickRecipeFields(input, { admin: false });
  if (!picked.ok) throw new Error(picked.error);
  const data = picked.data as Record<string, unknown>;
  if (typeof data.title !== 'string' || data.title.trim().length < 3) {
    throw new Error('A title of at least 3 characters is required');
  }
  const page = validPage(input.sourcePage ?? opts.scan?.sourcePage);
  if (opts.scan && !page) throw new Error('Add the book page number for this scan');

  const doc: Record<string, unknown> = {
    ...data,
    author: AMMI_AUTHOR,
    source: 'ammi_book',
    status: opts.status,
    sourceBook: BOOK_ID,
    tags: data.tags ?? [],
    imageId: data.imageId ?? '',
    dishPhoto: null,
    rating: 0,
    ratingCount: 0,
    comments: [],
    userId: opts.adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  let scan: ScanRef | undefined;
  if (opts.scan && page) {
    scan = await canonicalScan(opts.scan, page);
    doc.scanPath = scan.scanPath;
    doc.scanUrl = scan.scanUrl;
  }
  if (page) doc.sourcePage = page;
  doc.social = { ...DEFAULT_SOCIAL, eligible: isSocialEligible(doc) };

  const ref = await db().collection('recipes').add(doc);
  await linkBookPage(scan?.bookPageId, ref.id);
  return ref.id;
}

/** Attaches a page scan to one of Ammi's recipes and refreshes social.eligible. */
export async function attachScan(recipeId: string, upload: ScanRef, sourcePage?: number) {
  if (!ID_RE.test(recipeId)) throw new Error('Unknown recipe');
  const page = validPage(sourcePage ?? upload.sourcePage);
  if (!page) throw new Error('Add the book page number for this scan');
  const scan = await canonicalScan(upload, page);

  const ref = db().collection('recipes').doc(recipeId);
  await db().runTransaction(async (tx: firestore.Transaction) => {
    const snap = await tx.get(ref);
    const d = snap.data();
    if (!snap.exists || !d) throw new Error('Unknown recipe');
    if (d.source !== 'ammi_book' && d.author !== AMMI_AUTHOR) {
      throw new Error("Scans can only be attached to Ammi's recipes");
    }
    const next = { ...d, scanPath: scan.scanPath, scanUrl: scan.scanUrl, sourcePage: page };
    tx.update(ref, {
      scanPath: scan.scanPath,
      scanUrl: scan.scanUrl,
      sourcePage: page,
      ...(d.sourceBook ? {} : { sourceBook: BOOK_ID }),
      'social.eligible': isSocialEligible(next),
      updatedAt: serverTimestamp(),
    });
  });
  await linkBookPage(scan.bookPageId, recipeId);
}

export async function setAmmiRecipeStatus(recipeId: string, status: RecipeStatus) {
  if (!ID_RE.test(recipeId)) throw new Error('Unknown recipe');
  const ref = db().collection('recipes').doc(recipeId);
  await db().runTransaction(async (tx: firestore.Transaction) => {
    const snap = await tx.get(ref);
    const d = snap.data();
    if (!snap.exists || !d) throw new Error('Unknown recipe');
    tx.update(ref, {
      status,
      'social.eligible': isSocialEligible({ ...d, status }),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function listIngestData(): Promise<{
  recipes: IngestListItem[];
  pages: BookPageItem[];
}> {
  const [byAuthor, bySource, pages] = await Promise.all([
    db().collection('recipes').where('author', '==', AMMI_AUTHOR).get(),
    db().collection('recipes').where('source', '==', 'ammi_book').get(),
    db().collection('book_pages').where('bookId', '==', BOOK_ID).limit(500).get(),
  ]);
  const seen = new Map<string, IngestListItem>();
  for (const doc of [...byAuthor.docs, ...bySource.docs]) {
    const d = doc.data();
    seen.set(doc.id, {
      id: doc.id,
      title: String(d.title ?? ''),
      status: typeof d.status === 'string' ? d.status : null,
      source: typeof d.source === 'string' ? d.source : null,
      sourcePage: typeof d.sourcePage === 'number' ? d.sourcePage : null,
      scanUrl: typeof d.scanUrl === 'string' ? d.scanUrl : null,
      socialEligible: d.social?.eligible === true,
    });
  }
  return {
    recipes: [...seen.values()].sort((a, b) => a.title.localeCompare(b.title)),
    pages: pages.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          page: Number(d.page ?? 0),
          scanUrl: String(d.scanUrl ?? ''),
          recipeIds: Array.isArray(d.recipeIds) ? d.recipeIds.map(String) : [],
        };
      })
      .sort((a, b) => a.page - b.page),
  };
}
