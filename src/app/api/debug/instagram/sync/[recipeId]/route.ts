import { syncInstagramComments, syncInstagramLikes } from '@/app/actions';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin-only debug endpoint to force-sync Instagram comments & likes for a recipe
 * GET /api/debug/instagram/sync/:recipeId
 * Header required: x-admin-secret === process.env.DEBUG_ADMIN_SECRET
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  const expected = process.env.DEBUG_ADMIN_SECRET;

  if (!expected) {
    return NextResponse.json({ error: 'DEBUG_ADMIN_SECRET not configured on server' }, { status: 500 });
  }

  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Dynamic route param extraction: get the recipeId from the pathname.
  // Path: /api/debug/instagram/sync/:recipeId
  const pathname = request.nextUrl?.pathname || request.url || '';
  const parts = pathname.split('/').filter(Boolean);
  const recipeId = parts.length ? parts[parts.length - 1] : undefined;
  if (!recipeId) {
    return NextResponse.json({ error: 'Missing recipeId param' }, { status: 400 });
  }

  try {
    const commentsResult = await syncInstagramComments(recipeId);
    const likesResult = await syncInstagramLikes(recipeId);

    return NextResponse.json({ success: true, commentsResult, likesResult }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
