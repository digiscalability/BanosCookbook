import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  const rawBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.banoscookbook.com';
  const base = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`;
  const redirectUri = `${base.replace(/\/$/, '')}/api/auth/instagram/callback`;
  if (!appId) return NextResponse.json({ error: 'Facebook App ID not configured' }, { status: 500 });

  const scope =
    'instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,pages_show_list,pages_read_engagement';
  const authUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
