'use server';

/**
 * Server actions for /admin/ingest. Every export checks for an admin session first:
 * server actions are public POST endpoints.
 */
import type { RecipeStatus } from '@/lib/types';
import { requireAdminAction } from '@/server/auth/require-admin';
import {
  attachScan,
  createAmmiRecipe,
  draftFromImage,
  listIngestData,
  loadBookPage,
  setAmmiRecipeStatus,
  storePagePhoto,
  type ScanRef,
} from '@/server/recipes/ingest';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (err: unknown): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof Error ? err.message : String(err),
});

async function scanFromForm(form: FormData): Promise<(ScanRef & { jpeg: Buffer }) | null> {
  const bookPageId = form.get('bookPageId');
  if (typeof bookPageId === 'string' && bookPageId) return loadBookPage(bookPageId);
  const photo = form.get('photo');
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith('image/')) throw new Error('Please choose an image');
    if (photo.size > MAX_PHOTO_BYTES) throw new Error('Photo is larger than 8 MB');
    return storePagePhoto(Buffer.from(await photo.arrayBuffer()));
  }
  return null;
}

export async function listIngestDataAction(): Promise<
  Result<Awaited<ReturnType<typeof listIngestData>>>
> {
  await requireAdminAction();
  try {
    return { ok: true, data: await listIngestData() };
  } catch (err) {
    return fail(err);
  }
}

/** Stores the page image and returns a model draft for Abbas to review. */
export async function draftFromPageAction(
  form: FormData
): Promise<Result<{ scan: ScanRef; draft: Awaited<ReturnType<typeof draftFromImage>> }>> {
  await requireAdminAction();
  try {
    const scan = await scanFromForm(form);
    if (!scan) return { ok: false, error: 'Take or choose a page photo first' };
    const { jpeg, ...ref } = scan;
    const draft = await draftFromImage(jpeg);
    return { ok: true, data: { scan: ref, draft } };
  } catch (err) {
    return fail(err);
  }
}

export async function saveIngestedRecipeAction(input: {
  recipe: Record<string, unknown>;
  scan?: ScanRef;
  status: 'draft' | 'published';
}): Promise<Result<{ id: string }>> {
  const adminUser = await requireAdminAction();
  try {
    if (input.status !== 'draft' && input.status !== 'published') throw new Error('Bad status');
    const scan =
      input.scan &&
      typeof input.scan.scanPath === 'string' &&
      input.scan.scanPath.startsWith('book/')
        ? input.scan
        : undefined;
    const id = await createAmmiRecipe(input.recipe, {
      status: input.status,
      scan,
      adminUid: adminUser.uid,
    });
    return { ok: true, data: { id } };
  } catch (err) {
    return fail(err);
  }
}

/** form: recipeId, sourcePage?, and bookPageId or photo. */
export async function attachScanAction(form: FormData): Promise<Result<{ scanUrl: string }>> {
  await requireAdminAction();
  try {
    const recipeId = String(form.get('recipeId') ?? '');
    const page = Number(form.get('sourcePage') ?? NaN);
    const scan = await scanFromForm(form);
    if (!scan) return { ok: false, error: 'Take or choose a page photo first' };
    const { jpeg: _jpeg, ...ref } = scan;
    await attachScan(recipeId, ref, Number.isInteger(page) && page > 0 ? page : undefined);
    return { ok: true, data: { scanUrl: ref.scanUrl } };
  } catch (err) {
    return fail(err);
  }
}

export async function setRecipeStatusAction(
  recipeId: string,
  status: RecipeStatus
): Promise<Result<null>> {
  await requireAdminAction();
  try {
    if (!['draft', 'published', 'hidden'].includes(status)) throw new Error('Bad status');
    await setAmmiRecipeStatus(recipeId, status);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err);
  }
}
