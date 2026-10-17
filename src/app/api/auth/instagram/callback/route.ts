import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { authFailure, requireAdmin } from '@/server/auth/require-admin';
import { IG_OAUTH_STATE_COOKIE, IG_OAUTH_STATE_PATH } from '@/server/instagram/oauth-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function stateMatches(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * GET /api/auth/instagram/callback (admin only) — Facebook Login redirect target.
 * Requires the `state` issued by /api/auth/instagram, then stores the long-lived token
 * server-side in instagram_tokens/main (never readable by clients).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const rawBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.banoscookbook.com';
  const appUrl = (rawBase.startsWith('http') ? rawBase : `https://${rawBase}`).replace(/\/$/, '');

  const finish = (target: string) => {
    const res = NextResponse.redirect(target);
    res.cookies.set(IG_OAUTH_STATE_COOKIE, '', { path: IG_OAUTH_STATE_PATH, maxAge: 0 });
    return res;
  };

  if (!stateMatches(request.cookies.get(IG_OAUTH_STATE_COOKIE)?.value, searchParams.get('state'))) {
    return finish(`${appUrl}/settings?instagram_error=${encodeURIComponent('invalid_state')}`);
  }

  if (error || !code) {
    return finish(`${appUrl}/settings?instagram_error=${encodeURIComponent(error ?? 'cancelled')}`);
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    return finish(`${appUrl}/settings?instagram_error=${encodeURIComponent('not_configured')}`);
  }
  const redirectUri = `${appUrl}/api/auth/instagram/callback`;

  try {
    // Exchange code for short-lived token
    const tokenParams = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      client_secret: appSecret,
      code,
    });
    const tokenRes = await fetch(`https://graph.facebook.com/v24.0/oauth/access_token?${tokenParams}`);
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: unknown };
    if (!tokenData.access_token) throw new Error('No access token returned');

    // Exchange for long-lived token
    const llParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: tokenData.access_token,
    });
    const llRes = await fetch(`https://graph.facebook.com/v24.0/oauth/access_token?${llParams}`);
    const llData = (await llRes.json()) as { access_token?: string; expires_in?: number };
    const longLivedToken = llData.access_token ?? tokenData.access_token;

    const adminModule = await import('../../../../../../config/firebase-admin');
    const adminConfig = (adminModule.default ?? adminModule) as {
      getDb?: () => FirebaseFirestore.Firestore;
    };
    if (!adminConfig.getDb) throw new Error('Firebase Admin getDb not available');
    const db = adminConfig.getDb();
    const expiresAt = new Date(Date.now() + (llData.expires_in ?? 5184000) * 1000);
    await db.collection('instagram_tokens').doc('main').set({
      accessToken: longLivedToken,
      expiresAt: expiresAt.toISOString(),
      connectedAt: new Date().toISOString(),
    });

    return finish(`${appUrl}/settings?instagram_connected=true`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed';
    return finish(`${appUrl}/settings?instagram_error=${encodeURIComponent(msg)}`);
  }
}
