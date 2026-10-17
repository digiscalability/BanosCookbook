/**
 * Restore `recipes` documents from a JSON backup written by a migration.
 *
 *   npx tsx scripts/migrations/restore-recipes-backup.ts backups/firestore/recipes-<stamp>.json
 *   npx tsx scripts/migrations/restore-recipes-backup.ts <file> --apply
 *
 * Dry run by default. --apply overwrites each backed-up document with its saved
 * contents (set, not merge). Documents created after the backup are not touched.
 */
import { readFileSync } from 'node:fs';

import { getFirestore, Timestamp } from 'firebase-admin/firestore';

import { initAdmin, parseArgs, targetLabel } from '../lib/admin-cli';

function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__timestamp === 'string' && Object.keys(obj).length === 1) {
      return Timestamp.fromDate(new Date(obj.__timestamp));
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, revive(v)]));
  }
  return value;
}

async function main() {
  const { flags, positional } = parseArgs();
  const file = positional[0];
  if (!file) {
    console.error('Usage: restore-recipes-backup.ts <backup.json> [--apply] [--project <id>]');
    process.exit(2);
  }
  const backup = JSON.parse(readFileSync(file, 'utf8')) as {
    projectId: string;
    docs: { id: string; data: Record<string, unknown> }[];
  };
  const app = initAdmin({
    projectId: typeof flags.project === 'string' ? flags.project : backup.projectId,
  });
  const db = getFirestore(app);
  console.log(`Target: ${targetLabel()} · ${backup.docs.length} docs in ${file}`);

  if (flags.apply !== true) {
    console.log('Dry run: re-run with --apply to overwrite these documents.');
    return;
  }
  for (let i = 0; i < backup.docs.length; i += 400) {
    const batch = db.batch();
    for (const { id, data } of backup.docs.slice(i, i + 400)) {
      batch.set(db.collection('recipes').doc(id), revive(data) as Record<string, unknown>);
    }
    await batch.commit();
  }
  console.log(`Restored ${backup.docs.length} document(s).`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
