/**
 * Upload rendered book pages to Storage and index them in Firestore.
 *
 *   npx tsx scripts/book/upload-pages.ts                    # dry run: lists what would be uploaded
 *   npx tsx scripts/book/upload-pages.ts --apply            # upload + write book_pages docs
 *   npx tsx scripts/book/upload-pages.ts --dir book-pages/monasal-bana --book monasal-bana --apply
 *
 * For each pNNN.jpg in --dir:
 *   Storage   book/<book>/pNNN.jpg   (private bucket; readable through a download-token URL)
 *   Firestore book_pages/<book>_pNNN {bookId, page, storagePath, scanUrl, width, height,
 *             bytes, status: 'new', recipeIds: [], uploadedAt}
 * Pages already indexed are skipped unless --force. Run split-pdf.ts first.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';

import { initAdmin, parseArgs, targetLabel } from '../lib/admin-cli';

export const BOOK_ID = 'monasal-bana';

export function pagePath(bookId: string, page: number): string {
  return `book/${bookId}/p${String(page).padStart(3, '0')}.jpg`;
}

export function pageDocId(bookId: string, page: number): string {
  return `${bookId}_p${String(page).padStart(3, '0')}`;
}

export function downloadUrl(bucket: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function main() {
  const { flags } = parseArgs();
  const apply = flags.apply === true;
  const force = flags.force === true;
  const bookId = typeof flags.book === 'string' ? flags.book : BOOK_ID;
  const dir = resolve(typeof flags.dir === 'string' ? flags.dir : `book-pages/${bookId}`);
  if (!existsSync(dir)) throw new Error(`No pages in ${dir}. Run scripts/book/split-pdf.ts first.`);

  const app = initAdmin({
    projectId: typeof flags.project === 'string' ? flags.project : undefined,
    storageBucket: typeof flags.bucket === 'string' ? flags.bucket : undefined,
  });
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket();

  const files = readdirSync(dir)
    .filter(f => /^p\d{3,}\.jpg$/.test(f))
    .sort();
  console.log(
    `Target: ${targetLabel()} · bucket ${bucket.name} · ${files.length} pages · ${apply ? 'APPLY' : 'dry run'}`
  );

  let uploaded = 0;
  let skipped = 0;
  for (const file of files) {
    const page = Number(file.slice(1, -4));
    const storagePath = pagePath(bookId, page);
    const ref = db.collection('book_pages').doc(pageDocId(bookId, page));
    const existing = await ref.get();
    if (existing.exists && !force) {
      skipped++;
      continue;
    }
    if (!apply) {
      console.log(`would upload ${file} → ${storagePath}`);
      continue;
    }

    // Cap the long edge at 3000 px: plenty for reading and link cards, far smaller to serve.
    const buffer = await sharp(readFileSync(join(dir, file)))
      .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    const meta = await sharp(buffer).metadata();
    const token = randomUUID();
    await bucket.file(storagePath).save(buffer, {
      resumable: false,
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: token, bookId, page: String(page) },
      },
    });
    await ref.set(
      {
        bookId,
        page,
        storagePath,
        scanUrl: downloadUrl(bucket.name, storagePath, token),
        width: meta.width ?? null,
        height: meta.height ?? null,
        bytes: buffer.length,
        status: 'new',
        recipeIds: existing.exists ? (existing.get('recipeIds') ?? []) : [],
        uploadedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    uploaded++;
    console.log(`uploaded ${storagePath}`);
  }
  console.log(
    `${apply ? 'Uploaded' : 'Would upload'} ${apply ? uploaded : files.length - skipped}, skipped ${skipped} already indexed.`
  );
}

if (process.argv[1] && /upload-pages\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
