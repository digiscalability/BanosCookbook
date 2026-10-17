import { NextRequest, NextResponse } from 'next/server';

import { syncInstagramComments, syncInstagramLikes } from '@/server/instagram/recipe-instagram';
import { verifyMetaSignature } from '@/server/instagram/verify-signature';

import adminConfig from '../../../../../config/firebase-admin';

/**
 * Instagram Webhook Endpoint
 *
 * Receives real-time notifications from Instagram when:
 * - New comments are posted on Instagram
 * - Posts are liked
 * - Comments are deleted
 *
 * Setup in Facebook Developer Dashboard:
 * 1. Go to Products → Webhooks
 * 2. Add webhook with this URL: https://your-domain.com/api/webhooks/instagram
 * 3. Subscribe to: comments, mentions
 * 4. Verify token: use INSTAGRAM_WEBHOOK_VERIFY_TOKEN env var
 */

/**
 * GET - Webhook Verification
 * Instagram sends this to verify the webhook endpoint
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error('❌ INSTAGRAM_WEBHOOK_VERIFY_TOKEN not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Verify the token matches
  if (mode === 'subscribe' && token === verifyToken) {
    console.warn('✅ Instagram webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('❌ Instagram webhook verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST - Webhook notifications. Rejected with 401 unless signed by Meta.
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appSecret) {
      console.error('❌ FACEBOOK_APP_SECRET not configured');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const rawBuffer = Buffer.from(await request.arrayBuffer());
    if (!verifyMetaSignature(rawBuffer, signature, appSecret)) {
      console.warn('❌ Instagram webhook rejected: missing or invalid x-hub-signature-256');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook payload from the raw buffer
    const rawBody = rawBuffer.toString('utf8');
    const body = JSON.parse(rawBody) as unknown;

    // Helper type guard
    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;

    // Log a small summary to avoid leaking large payloads or tokens
    try {
      const entries =
        isRecord(body) && Array.isArray((body as Record<string, unknown>)['entry'])
          ? ((body as Record<string, unknown>)['entry'] as unknown[])
          : [];
      const entriesSummary = entries.map(e => {
        if (!isRecord(e)) return { id: undefined, changes: [] };
        const id = typeof e.id === 'string' ? e.id : undefined;
        const rawChanges = Array.isArray(e.changes) ? (e.changes as unknown[]) : [];
        const changes = rawChanges
          .map(c => (isRecord(c) && typeof c.field === 'string' ? c.field : undefined))
          .filter(Boolean);
        return { id, changes };
      });
      console.warn('📥 Instagram webhook received (summary):', JSON.stringify(entriesSummary));
    } catch {
      console.warn('📥 Instagram webhook received');
    }

    // Process each entry in the webhook
    const entries =
      isRecord(body) && Array.isArray((body as Record<string, unknown>)['entry'])
        ? ((body as Record<string, unknown>)['entry'] as unknown[])
        : [];
    for (const entry of entries) {
      const changes =
        isRecord(entry) && Array.isArray((entry as Record<string, unknown>)['changes'])
          ? ((entry as Record<string, unknown>)['changes'] as unknown[])
          : [];

      for (const change of changes) {
        const field =
          isRecord(change) && typeof change.field === 'string'
            ? (change.field as string)
            : undefined;
        const value =
          isRecord(change) && 'value' in change
            ? (change as Record<string, unknown>)['value']
            : undefined;

        // Handle different webhook events
        if (field === 'comments') {
          if (isRecord(value))
            await handleCommentEvent(value as { media_id?: string; id?: string; text?: string });
        } else if (field === 'mentions') {
          await handleMentionEvent(isRecord(value) ? (value as Record<string, unknown>) : undefined);
        } else if (
          field === 'likes' ||
          field === 'engagement' ||
          (isRecord(value) &&
            typeof (value as Record<string, unknown>)['like_count'] !== 'undefined')
        ) {
          // Some Graph webhook configurations may send likes/engagement updates
          if (isRecord(value)) await handleLikeEvent(value as { media_id?: string });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Error processing Instagram webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle comment events from Instagram
 */
async function handleCommentEvent(value: {
  media_id?: string;
  id?: string;
  text?: string;
  media?: { id?: string; [key: string]: unknown };
}) {
  try {
    // Support both value.media_id and value.media.id
    const mediaId = value.media_id || (value.media && value.media.id);

    if (!mediaId) {
      console.warn('⚠️ Comment event missing media_id (checked both media_id and media.id)');
      return;
    }

    console.warn(`💬 New comment on Instagram post ${mediaId}`);

    // Find which recipe this Instagram post belongs to
    const { getDb } = adminConfig;
    const db = getDb();

    const snapshot = await db
      .collection('instagram_posts')
      .where('instagramMediaId', '==', mediaId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️ No recipe found for Instagram post ${mediaId}`);
      return;
    }

    const instagramPost = snapshot.docs[0].data();
    const recipeId = instagramPost.recipeId;

    // Sync comments for this recipe
    console.warn(`🔄 Syncing comments for recipe ${recipeId}`);
    await syncInstagramComments(recipeId);
  } catch (error) {
    console.error('❌ Error handling comment event:', error);
  }
}

/**
 * Handle mention events from Instagram
 * Generates an AI reply suggestion and logs it (auto-reply to mentions
 * requires additional Graph API permissions — log for manual follow-up).
 */
async function handleMentionEvent(value?: Record<string, unknown>) {
  try {
    const commentText =
      typeof value?.text === 'string' ? value.text : undefined;
    const mediaId =
      typeof value?.media_id === 'string' ? value.media_id : undefined;

    console.warn(`📣 Mentioned in Instagram post/comment`, { mediaId, commentText });

    if (!commentText) return;

    // Generate an AI reply suggestion using the existing Genkit flow.
    const { commentReplySuggestion } = await import('@/ai/flows/comment-reply-suggestion');
    const result = await commentReplySuggestion({
      recipeTitle: 'BanosCookbook recipe',
      recipeDescription: 'A delicious home-style recipe from BanosCookbook.',
      comment: commentText,
    });

    const suggestion = result.suggestions[0];
    if (suggestion) {
      console.warn(`📣 AI reply suggestion for mention: "${suggestion}"`);

      // Store the suggestion in Firestore for the admin to review/send.
      const { getDb } = adminConfig;
      const db = getDb();
      await db.collection('mention_replies').add({
        mediaId: mediaId ?? null,
        commentText,
        aiSuggestion: suggestion,
        allSuggestions: result.suggestions,
        status: 'pending',
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error('❌ Error handling mention event:', error);
  }
}

/**
 * Handle likes/engagement events from Instagram
 */
async function handleLikeEvent(value: { media_id?: string }) {
  try {
    const mediaId = value.media_id;
    if (!mediaId) {
      console.warn('⚠️ Like event missing media_id');
      return;
    }

    console.warn(`👍 Like update on Instagram post ${mediaId}`);

    const { getDb } = adminConfig;
    const db = getDb();

    const snapshot = await db
      .collection('instagram_posts')
      .where('instagramMediaId', '==', mediaId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️ No recipe found for Instagram post ${mediaId} (like event)`);
      return;
    }

    const instagramPost = snapshot.docs[0].data();
    const recipeId = instagramPost.recipeId;

    console.warn(`🔄 Syncing likes for recipe ${recipeId}`);
    // Fire-and-forget is acceptable for webhooks but await to surface errors in logs
    await syncInstagramLikes(recipeId);
  } catch (error) {
    console.error('❌ Error handling like event:', error);
  }
}
