/**
 * Migration 2026-10: give every recipe the content-model fields of the shared contract
 * with ventures-ops (stream-d-contracts.md §1).
 *
 *   Ammi's recipes (author "Shahar Bano") → source 'ammi_book', status 'published',
 *                                           sourceBook 'monasal-bana', dishPhoto from imageUrl
 *   everything else                       → source 'sample', status 'hidden'
 *   social = { eligible } (+ any existing excludePlatforms / hookNote); eligible only for a
 *   published ammi_book recipe with sourcePage, scanPath and scanUrl (none have scans yet)
 *
 * Documents that already have a contract `source` are left alone, so re-running is safe;
 * legacy values ('user', 'review') are normalised to 'community' / 'draft'.
 * Nothing is deleted; samples stay in the database, just hidden.
 *
 * Usage (dry run is the default; prints the plan and writes nothing):
 *   npx tsx scripts/migrations/2026-10-recipes-source-status.ts
 *   npx tsx scripts/migrations/2026-10-recipes-source-status.ts --apply
 *   npx tsx scripts/migrations/2026-10-recipes-source-status.ts --apply --export-bucket gs://<bucket>/firestore-backups
 *
 * --apply first writes a JSON backup of the whole `recipes` collection to
 * backups/firestore/ (gitignored) and refuses to continue if that fails. With
 * --export-bucket it also runs a managed Firestore export of `recipes` and waits
 * for it. Restore from JSON: scripts/migrations/restore-recipes-backup.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

import {
  AMMI_BOOK_SLUG,
  isSocialEligible,
  MAX_TAGS,
  storagePathFromUrl,
  toTagSlug,
} from '../../src/lib/book';
import { initAdmin, parseArgs, targetLabel } from '../lib/admin-cli';

export const MIGRATION_ID = '2026-10-recipes-source-status';
export const AMMI_AUTHOR = 'Shahar Bano';
const CONTRACT_SOURCES = ['ammi_book', 'sample', 'community'];

export type PlanAction =
  | 'ammi_book/published'
  | 'sample/hidden'
  | 'normalise legacy values'
  | 'skip (already migrated)';

export interface PlanRow {
  id: string;
  title: string;
  author: string;
  hasUserId: boolean;
  before: { source: unknown; status: unknown };
  action: PlanAction;
  socialEligible: boolean | null;
  dishPhoto: string;
  update: Record<string, unknown> | null;
}

export const isAmmi = (author: unknown) =>
  typeof author === 'string' && author.trim().toLowerCase() === AMMI_AUTHOR.toLowerCase();

function contractSocial(prev: unknown, eligible: boolean): Record<string, unknown> {
  const p = (prev && typeof prev === 'object' ? prev : {}) as Record<string, unknown>;
  return {
    eligible,
    ...(Array.isArray(p.excludePlatforms) ? { excludePlatforms: p.excludePlatforms } : {}),
    ...(typeof p.hookNote === 'string' ? { hookNote: p.hookNote.slice(0, 200) } : {}),
  };
}

function tagSlugs(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
  return [...new Set(list.map(toTagSlug).filter((t): t is string => !!t))].slice(0, MAX_TAGS);
}

function dishPhotoFrom(d: Record<string, unknown>): Record<string, unknown> | null {
  const url = typeof d.imageUrl === 'string' ? d.imageUrl : '';
  if (!url.startsWith('https://')) return null;
  const path = storagePathFromUrl(url);
  return {
    url,
    ...(path ? { path } : {}),
    // Images under generated/ came from the AI image pipeline. Anything else is left
    // without the flag, which the engine treats as AI (adds the disclosure) until a
    // person confirms otherwise.
    ...(path?.startsWith('generated/') ? { aiGenerated: true } : {}),
  };
}

/** Pure planning step (unit-tested): what would change for one document. */
export function planRecipe(id: string, d: Record<string, unknown>): PlanRow {
  const base = {
    id,
    title: String(d.title ?? ''),
    author: String(d.author ?? ''),
    hasUserId: typeof d.userId === 'string' && d.userId.length > 0,
    before: { source: d.source ?? null, status: d.status ?? null },
  };

  // Values written before the contract was fixed.
  if (d.source === 'user' || d.status === 'review') {
    const update: Record<string, unknown> = {};
    if (d.source === 'user') update.source = 'community';
    if (d.status === 'review') update.status = 'draft';
    update.social = contractSocial(d.social, isSocialEligible({ ...d, ...update }));
    return {
      ...base,
      action: 'normalise legacy values',
      socialEligible: false,
      dishPhoto: '-',
      update,
    };
  }
  if (typeof d.source === 'string' && CONTRACT_SOURCES.includes(d.source)) {
    return {
      ...base,
      action: 'skip (already migrated)',
      socialEligible: null,
      dishPhoto: '-',
      update: null,
    };
  }

  const ammi = isAmmi(d.author);
  const update: Record<string, unknown> = {
    source: ammi ? 'ammi_book' : 'sample',
    status: ammi ? 'published' : 'hidden',
    tags: tagSlugs(d.tags),
  };
  let dishPhoto = '-';
  if (ammi) {
    update.sourceBook = AMMI_BOOK_SLUG;
    if (d.dishPhoto) {
      dishPhoto = 'kept';
    } else {
      const photo = dishPhotoFrom(d);
      if (photo) update.dishPhoto = photo;
      dishPhoto = photo ? (photo.aiGenerated ? 'from imageUrl (AI)' : 'from imageUrl') : 'none';
    }
  }
  const eligible = isSocialEligible({ ...d, ...update });
  update.social = contractSocial(d.social, eligible);

  return {
    ...base,
    action: ammi ? 'ammi_book/published' : 'sample/hidden',
    socialEligible: eligible,
    dishPhoto,
    update,
  };
}

function toJsonSafe(value: unknown): unknown {
  if (value instanceof Timestamp) return { __timestamp: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJsonSafe(v)]));
  }
  return value;
}

async function managedExport(projectId: string, outputUriPrefix: string) {
  const { v1 } = await import('@google-cloud/firestore');
  const client = new v1.FirestoreAdminClient();
  const [operation] = await client.exportDocuments({
    name: client.databasePath(projectId, '(default)'),
    outputUriPrefix,
    collectionIds: ['recipes'],
  });
  console.log(`Managed export started: ${operation.name}`);
  const [response] = await operation.promise();
  console.log(`Managed export done: ${JSON.stringify(response)}`);
}

async function main() {
  const { flags } = parseArgs();
  const apply = flags.apply === true;
  const app = initAdmin({
    projectId: typeof flags.project === 'string' ? flags.project : undefined,
  });
  const db = getFirestore(app);
  const projectId = app.options.projectId as string;

  console.log(`# ${MIGRATION_ID}`);
  console.log(`Target: ${targetLabel()} · mode: ${apply ? 'APPLY' : 'dry run (no writes)'}\n`);

  const snap = await db.collection('recipes').get();
  const rows = snap.docs.map(doc => planRecipe(doc.id, doc.data()));
  rows.sort((a, b) => a.action.localeCompare(b.action) || a.title.localeCompare(b.title));

  console.log(
    '| # | id | title | author | userId? | before (source/status) | after | dishPhoto | social.eligible |'
  );
  console.log('|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    console.log(
      `| ${i + 1} | ${r.id} | ${r.title} | ${r.author} | ${r.hasUserId ? 'yes' : 'no'} | ` +
        `${r.before.source ?? '-'} / ${r.before.status ?? '-'} | ${r.action} | ${r.dishPhoto} | ${r.socialEligible ?? '-'} |`
    );
  });

  const count = (a: PlanRow['action']) => rows.filter(r => r.action === a).length;
  const ammi = count('ammi_book/published');
  console.log(
    `\nTotal ${rows.length}: ${ammi} → ammi_book/published, ${count('sample/hidden')} → sample/hidden, ` +
      `${count('normalise legacy values')} normalised, ${count('skip (already migrated)')} skipped.`
  );
  console.log(
    `social.eligible true: ${rows.filter(r => r.socialEligible).length} (needs sourcePage + scanPath + scanUrl).`
  );
  const ammiTotal = rows.filter(r => isAmmi(r.author)).length;
  if (ammiTotal !== 13) {
    console.warn(
      `WARNING: expected 13 recipes by "${AMMI_AUTHOR}", found ${ammiTotal}. Check before applying.`
    );
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to write (a backup is taken first).');
    return;
  }

  // Backup before any write.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(process.cwd(), 'backups', 'firestore');
  mkdirSync(dir, { recursive: true });
  const backupFile = join(dir, `recipes-${stamp}.json`);
  writeFileSync(
    backupFile,
    JSON.stringify(
      {
        projectId,
        takenAt: new Date().toISOString(),
        docs: snap.docs.map(d => ({ id: d.id, data: toJsonSafe(d.data()) })),
      },
      null,
      2
    )
  );
  console.log(`\nBackup written: ${backupFile} (${snap.size} docs)`);
  if (typeof flags['export-bucket'] === 'string') {
    await managedExport(projectId, `${flags['export-bucket'].replace(/\/$/, '')}/${stamp}`);
  }

  const writes = rows.filter(r => r.update);
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const r of writes.slice(i, i + 400)) {
      batch.update(db.collection('recipes').doc(r.id), {
        ...r.update,
        migration: MIGRATION_ID,
        migratedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
  console.log(`Applied ${writes.length} update(s).`);
}

if (
  process.argv[1] &&
  /2026-10-recipes-source-status\.ts$/.test(process.argv[1].replace(/\\/g, '/'))
) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
