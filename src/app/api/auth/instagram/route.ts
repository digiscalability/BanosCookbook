import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { authFailure, requireAdmin } from '@/server/auth/require-admin';
import { IG_OAUTH_STATE_COOKIE, IG_OAUTH_STATE_PATH } from '@/server/instagram/oauth-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/instagram (admin only) — starts the Facebook Login flow that stores
 * the Instagram token. To be removed once the content engine holds the Meta
 * System User token.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const rawBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.banoscookbook.com';
  const base = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`;
  const redirectUri = `${base.replace(/\/$/, '')}/api/auth/instagram/callback`;
  if (!appId) return NextResponse.json({ error: 'Facebook App ID not configured' }, { status: 500 });

  const state = crypto.randomBytes(32).toString('base64url');
  const scope =
    'instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement';
  const authUrl =
    `https://www.facebook.com/v24.0/dialog/oauth?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}` +
    `&response_type=code&state=${state}`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(IG_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: IG_OAUTH_STATE_PATH,
    maxAge: 600,
  });
  return res;
}
