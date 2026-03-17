import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.banoscookbook.com';

  if (error || !code) {
    return NextResponse.redirect(
      `${appUrl}/settings?instagram_error=${encodeURIComponent(error ?? 'cancelled')}`
    );
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${appUrl}/api/auth/instagram/callback`;

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: unknown };
    if (!tokenData.access_token) throw new Error('No access token returned');

    // Exchange for long-lived token
    const llRes = await fetch(
      `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = (await llRes.json()) as { access_token?: string; expires_in?: number };
    const longLivedToken = llData.access_token ?? tokenData.access_token;

    // Store in Firestore using the existing firebase-admin pattern
    const adminModule = await import('../../../../../../config/firebase-admin');
    const adminConfig =
      (adminModule.default ?? adminModule) as {
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

    return NextResponse.redirect(`${appUrl}/settings?instagram_connected=true`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed';
    return NextResponse.redirect(
      `${appUrl}/settings?instagram_error=${encodeURIComponent(msg)}`
    );
  }
}
