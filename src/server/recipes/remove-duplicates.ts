/**
 * Duplicate-recipe cleanup (admin only; callers must check).
 *
 * Groups recipes by normalised title and keeps one per group. Dry run by default.
 * Ammi's recipes are never deleted: a protected recipe is always the one kept, and
 * a group containing two protected recipes is reported but left alone.
 */
import adminConfig from '../../../config/firebase-admin';

export interface DuplicateGroup {
  title: string;
  count: number;
  keptId: string;
  removeIds: string[];
}

export interface RemoveDuplicatesResult {
  success: boolean;
  dryRun: boolean;
  removed?: number;
  duplicates?: DuplicateGroup[];
  skippedProtectedGroups?: string[];
  error?: string;
}

interface Row {
  id: string;
  title: string;
  createdAt: number;
  protected: boolean;
}

const isProtected = (data: FirebaseFirestore.DocumentData) =>
  data.source === 'ammi_book' || data.author === 'Shahar Bano';

export async function removeDuplicateRecipes({
  dryRun = true,
}: { dryRun?: boolean } = {}): Promise<RemoveDuplicatesResult> {
  try {
    const db = adminConfig.getDb();
    const snapshot = await db.collection('recipes').get();

    const groups = new Map<string, Row[]>();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const key = String(data.title ?? '').trim().toLowerCase();
      if (!key) continue;
      const row: Row = {
        id: doc.id,
        title: String(data.title),
        createdAt: data.createdAt?.toDate?.()?.getTime?.() ?? Number.MAX_SAFE_INTEGER,
        protected: isProtected(data),
      };
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    const duplicates: DuplicateGroup[] = [];
    const skippedProtectedGroups: string[] = [];
    for (const rows of groups.values()) {
      if (rows.length < 2) continue;
      if (rows.filter(r => r.protected).length > 1) {
        skippedProtectedGroups.push(rows[0].title);
        continue;
      }
      rows.sort((a, b) => Number(b.protected) - Number(a.protected) || a.createdAt - b.createdAt);
      const [keep, ...rest] = rows;
      duplicates.push({
        title: keep.title,
        count: rest.length,
        keptId: keep.id,
        removeIds: rest.map(r => r.id),
      });
    }

    let removed = 0;
    if (!dryRun) {
      for (const group of duplicates) {
        for (const id of group.removeIds) {
          await db.collection('recipes').doc(id).delete();
          removed++;
        }
      }
    }

    return { success: true, dryRun, removed, duplicates, skippedProtectedGroups };
  } catch (error) {
    console.error('[remove-duplicates]', error);
    return {
      success: false,
      dryRun,
      error: error instanceof Error ? error.message : 'Failed to remove duplicates',
    };
  }
}
