import { syncInstagramComments, syncInstagramLikes } from '@/app/actions';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
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
    console.log('✅ Instagram webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('❌ Instagram webhook verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST - Webhook Notifications
 * Instagram sends real-time updates here
 */
export async function POST(request: NextRequest) {

  try {
    // Verify the request signature
    const signature = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    // Read the raw body as bytes (must use raw bytes for HMAC verification)
    let rawBuffer: Buffer;
    try {
      const arrayBuffer = await request.arrayBuffer();
      rawBuffer = Buffer.from(arrayBuffer);
      // --- DEBUG: Log raw POST body and signature header as base64 for local testing ---
      const payloadBase64 = rawBuffer.toString('base64');
      console.log('=== WEBHOOK DEBUG START ===');
      console.log('WEBHOOK_PAYLOAD_BASE64:', payloadBase64);
      console.log('WEBHOOK_SIGNATURE_HEADER:', signature || '');
      console.log('=== WEBHOOK DEBUG END ===');
      // --- END DEBUG ---
    } catch (e) {
      console.error('❌ Failed to read/log debug payload/signature', e);
      return NextResponse.json({ error: 'Failed to read request body' }, { status: 500 });
    }

    if (!appSecret) {
      console.error('❌ FACEBOOK_APP_SECRET not configured');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    // Read the raw body as bytes (must use raw bytes for HMAC verification)
  // (rawBuffer is already set above in debug block)

    // Determine signature header (support sha256 header and fallback)
  const signatureHeader = signature || request.headers.get('x-hub-signature');

    if (signatureHeader) {
      // Header format is usually 'sha256=<hex>' or 'sha1=<hex>'
      const parts = signatureHeader.split('=');
      const algo = (parts[0] || '').toLowerCase();
      const sigHex = parts[1] || '';

      if (!sigHex) {
        console.error('❌ Invalid webhook signature format');
        return NextResponse.json({ error: 'Invalid signature format' }, { status: 403 });
      }

      // Only allow known algorithms
      if (algo !== 'sha256' && algo !== 'sha1') {
        console.error('❌ Unsupported webhook signature algorithm', algo);
        return NextResponse.json({ error: 'Unsupported signature algorithm' }, { status: 403 });
      }

      const expectedHex = crypto.createHmac(algo === 'sha256' ? 'sha256' : 'sha1', appSecret).update(rawBuffer).digest('hex');

      try {
        const sigBuf = Buffer.from(sigHex, 'hex');
        const expectedBuf = Buffer.from(expectedHex, 'hex');

        // safe equal requires same length
        if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
          // Debug information to help diagnose signature mismatches in production
          try {
            const srcIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
            const rawLen = rawBuffer ? rawBuffer.length : 'unknown';
            const sigPreview = sigHex.slice(0, 12);
            const expectedPreview = expectedHex.slice(0, 12);
            console.error('❌ Invalid webhook signature', { srcIp, rawLen, sigPreview, expectedPreview });
          } catch (dbgErr) {
            console.error('❌ Invalid webhook signature (failed to build debug info)', dbgErr);
          }

          return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }
      } catch (e) {
        console.error('❌ Error verifying signature', e);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Parse the webhook payload from the raw buffer
    const rawBody = rawBuffer.toString('utf8');
    const body = JSON.parse(rawBody) as unknown;

    // Helper type guard
    const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

    // Log a small summary to avoid leaking large payloads or tokens
    try {
      const entries = isRecord(body) && Array.isArray((body as Record<string, unknown>)['entry']) ? (body as Record<string, unknown>)['entry'] as unknown[] : [];
      const entriesSummary = entries.map((e) => {
        if (!isRecord(e)) return { id: undefined, changes: [] };
        const id = typeof e.id === 'string' ? e.id : undefined;
        const rawChanges = Array.isArray(e.changes) ? e.changes as unknown[] : [];
        const changes = rawChanges.map((c) => (isRecord(c) && typeof c.field === 'string' ? c.field : undefined)).filter(Boolean);
        return { id, changes };
      });
      console.log('📥 Instagram webhook received (summary):', JSON.stringify(entriesSummary));
    } catch {
      console.log('📥 Instagram webhook received');
    }

    // Process each entry in the webhook
    const entries = isRecord(body) && Array.isArray((body as Record<string, unknown>)['entry']) ? (body as Record<string, unknown>)['entry'] as unknown[] : [];
    for (const entry of entries) {
      const changes = isRecord(entry) && Array.isArray((entry as Record<string, unknown>)['changes']) ? (entry as Record<string, unknown>)['changes'] as unknown[] : [];

      for (const change of changes) {
        const field = isRecord(change) && typeof change.field === 'string' ? (change.field as string) : undefined;
        const value = isRecord(change) && 'value' in change ? (change as Record<string, unknown>)['value'] : undefined;

        // Handle different webhook events
        if (field === 'comments') {
          if (isRecord(value)) await handleCommentEvent(value as { media_id?: string; id?: string; text?: string });
        } else if (field === 'mentions') {
          await handleMentionEvent();
        } else if (field === 'likes' || field === 'engagement' || (isRecord(value) && typeof (value as Record<string, unknown>)['like_count'] !== 'undefined')) {
          // Some Graph webhook configurations may send likes/engagement updates
          if (isRecord(value)) await handleLikeEvent(value as { media_id?: string });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('❌ Error processing Instagram webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    console.log(`💬 New comment on Instagram post ${mediaId}`);

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
    console.log(`🔄 Syncing comments for recipe ${recipeId}`);
    await syncInstagramComments(recipeId);

  } catch (error) {
    console.error('❌ Error handling comment event:', error);
  }
}

/**
 * Handle mention events from Instagram
 */
async function handleMentionEvent() {
  try {
    console.log(`📣 Mentioned in Instagram post/comment`);
    // You can implement mention handling logic here
    // For example, create a notification or auto-reply
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

    console.log(`👍 Like update on Instagram post ${mediaId}`);

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

    console.log(`🔄 Syncing likes for recipe ${recipeId}`);
    // Fire-and-forget is acceptable for webhooks but await to surface errors in logs
    await syncInstagramLikes(recipeId);
  } catch (error) {
    console.error('❌ Error handling like event:', error);
  }
}
