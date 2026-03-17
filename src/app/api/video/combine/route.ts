/**
 * POST /api/video/combine
 *
 * Runs server-side FFmpeg concatenation via the existing combineVideoScenes pipeline.
 * Deployed as a dedicated Vercel Function so the ffmpeg-static binary can be
 * included via vercel.json "includeFiles" — server actions don't support this.
 *
 * Body: { recipeId: string }
 * Returns: { success, combinedVideoUrl?, duration?, processingMethod?, error? }
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // seconds — requires Vercel Pro; Hobby caps at 60 (still enough for ~10 clips)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { recipeId?: string };
    const recipeId = body?.recipeId;
    if (!recipeId || typeof recipeId !== 'string') {
      return NextResponse.json({ success: false, error: 'recipeId is required' }, { status: 400 });
    }

    // Fetch the step video records from Firestore
    const { getAdmin } = await import('../../../../../config/firebase-admin');
    const admin = getAdmin();
    const db = admin.firestore();

    const stepDoc = await db.collection('recipe_step_videos').doc(recipeId).get();
    if (!stepDoc.exists) {
      return NextResponse.json({ success: false, error: 'No step videos found for this recipe.' }, { status: 404 });
    }

    type StepRecord = { stepIndex: number; videoUrl?: string; duration?: number };
    const steps = ((stepDoc.data()?.steps as StepRecord[]) ?? [])
      .filter(s => typeof s.videoUrl === 'string' && s.videoUrl.length > 0)
      .sort((a, b) => a.stepIndex - b.stepIndex);

    if (steps.length === 0) {
      return NextResponse.json({ success: false, error: 'No step videos generated yet.' }, { status: 400 });
    }

    const { combineVideoScenes } = await import('@/lib/video-combination');
    const result = await combineVideoScenes({
      scenes: steps.map(s => ({
        sceneNumber: s.stepIndex + 1,
        videoUrl: s.videoUrl as string,
        duration: s.duration ?? 6,
      })),
      recipeId,
      outputFormat: 'mp4',
    });

    if (result.success && result.combinedVideoUrl) {
      // Persist the real combined URL with method tag so the cache guard accepts it
      await db.collection('recipe_step_videos').doc(recipeId).update({
        combinedVideoUrl: result.combinedVideoUrl,
        combinedVideoMethod: result.processingMethod ?? 'ffmpeg',
        combinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: result.success,
      combinedVideoUrl: result.combinedVideoUrl,
      duration: result.duration,
      processingMethod: result.processingMethod,
      error: result.error,
    });
  } catch (err) {
    console.error('[/api/video/combine]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
