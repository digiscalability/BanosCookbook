import { NextRequest, NextResponse } from 'next/server';

import adminConfig from '../../../../../config/firebase-admin';

export const runtime = 'nodejs';
export const revalidate = 0;
export const maxDuration = 60;

const { getDb } = adminConfig as unknown as {
  getDb: () => import('firebase-admin').firestore.Firestore;
};

/**
 * GET /api/cron/daily-social
 *
 * Called by Vercel Cron (see vercel.json) once per day.
 * Picks the highest-rated recipe that has not been posted to Instagram
 * in the last 30 days and posts it.
 *
 * Also accepts a manual trigger with header Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  // Vercel Cron sends the CRON_SECRET automatically; manual callers must supply it.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();

    // Find a recipe to post: not posted to Instagram in the last 30 days,
    // ordered by rating descending so we promote best content.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Candidates: recipes with imageUrl set (required for Instagram).
    // We use two queries because Firestore can't combine != with orderBy on different fields
    // without a composite index.
    const recentlyPosted = await db
      .collection('instagram_posts')
      .where('postedAt', '>=', thirtyDaysAgo)
      .get();

    const recentlyPostedRecipeIds = new Set(
      recentlyPosted.docs.map(d => d.data().recipeId as string).filter(Boolean)
    );

    const recipesSnap = await db
      .collection('recipes')
      .orderBy('rating', 'desc')
      .limit(20)
      .get();

    const candidate = recipesSnap.docs.find(d => {
      const data = d.data();
      return (
        typeof data.imageUrl === 'string' &&
        data.imageUrl.length > 0 &&
        !data.imageUrl.startsWith('data:') &&
        !recentlyPostedRecipeIds.has(d.id)
      );
    });

    if (!candidate) {
      console.warn('[daily-social] No eligible recipe found to post today');
      return NextResponse.json({ success: false, reason: 'no_eligible_recipe' });
    }

    const recipeId = candidate.id;
    const recipeTitle = (candidate.data().title as string) ?? recipeId;

    console.warn(`[daily-social] Posting recipe "${recipeTitle}" (${recipeId}) to Instagram`);

    // Dynamically import to avoid pulling the heavy actions module into every edge invocation.
    const { shareRecipeToInstagram } = await import('@/app/actions');
    const result = await shareRecipeToInstagram(recipeId);

    if (result.success) {
      console.warn(`[daily-social] Posted successfully: ${result.instagramPostId}`);
      return NextResponse.json({
        success: true,
        recipeId,
        recipeTitle,
        instagramPostId: result.instagramPostId,
        permalink: result.permalink,
      });
    } else {
      console.error(`[daily-social] Instagram post failed: ${result.error}`);
      return NextResponse.json(
        { success: false, recipeId, recipeTitle, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[daily-social] Cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
