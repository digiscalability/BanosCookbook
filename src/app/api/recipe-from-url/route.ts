import { NextRequest, NextResponse } from 'next/server';

import { recipeFromUrl } from '@/ai/flows/recipe-from-url';
import { authFailure, requireAdmin } from '@/server/auth/require-admin';
import { assertPublicHttpsUrl, UnsafeUrlError } from '@/server/net/ssrf-guard';

export const runtime = 'nodejs';

/** POST /api/recipe-from-url (admin only: model spend). Public https URLs only. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return authFailure(err);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { url?: unknown };
    const { url } = body;

    if (!url || typeof url !== 'string' || url.length > 2048) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    let safeUrl: URL;
    try {
      safeUrl = await assertPublicHttpsUrl(url);
    } catch (err) {
      const message = err instanceof UnsafeUrlError ? err.message : 'Invalid URL';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await recipeFromUrl({ url: safeUrl.toString() });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[recipe-from-url]', error);
    return NextResponse.json({ error: 'Failed to extract recipe from URL' }, { status: 500 });
  }
}
