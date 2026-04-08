/**
 * POST /api/video/combine
 *
 * Proxies to the Cloud Run video-combiner service when CLOUD_RUN_COMBINE_URL is set.
 * Falls back to the local FFmpeg pipeline (ffmpeg-static) for local dev / if Cloud Run
 * is not yet deployed.
 *
 * Body: { recipeId: string }
 * Returns: { success, combinedVideoUrl?, duration?, processingMethod?, error? }
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { recipeId?: string };
    const recipeId = body?.recipeId;
    if (!recipeId || typeof recipeId !== 'string') {
      return NextResponse.json({ success: false, error: 'recipeId is required' }, { status: 400 });
    }

    // ---------------------------------------------------------------------------
    // Cloud Run path (production)
    // ---------------------------------------------------------------------------
    const cloudRunUrl = process.env.CLOUD_RUN_COMBINE_URL;
    if (cloudRunUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const secret = process.env.CLOUD_RUN_SECRET;
      if (secret) headers['Authorization'] = `Bearer ${secret}`;

      const upstream = await fetch(`${cloudRunUrl}/combine`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipeId }),
      });

      const result = await upstream.json() as Record<string, unknown>;
      return NextResponse.json(result, { status: upstream.status });
    }

    // ---------------------------------------------------------------------------
    // Local FFmpeg fallback (dev / no Cloud Run configured)
    // ---------------------------------------------------------------------------
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
