import { NextRequest, NextResponse } from 'next/server';

import { authFailure, requireAdmin } from '@/server/auth/require-admin';
import { removeDuplicateRecipes } from '@/server/recipes/remove-duplicates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/remove-duplicates   (admin only)
 * Body: { dryRun?: boolean }  — dry run unless dryRun is explicitly false.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  const body = (await request.json().catch(() => ({}))) as { dryRun?: unknown };
  const dryRun = body.dryRun !== false;

  const result = await removeDuplicateRecipes({ dryRun });
  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json({
    ...result,
    message: dryRun
      ? `Dry run: ${result.duplicates?.reduce((n, g) => n + g.count, 0) ?? 0} recipe(s) would be removed`
      : `Removed ${result.removed} duplicate recipe(s)`,
  });
}
