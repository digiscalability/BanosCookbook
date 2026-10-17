import { NextResponse } from 'next/server';

import { authFailure, requireAdmin } from '@/server/auth/require-admin';

export const runtime = 'nodejs';

const REQUIRED_VARS = [
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
];

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return authFailure(err);
  }
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  return NextResponse.json({
    configured: missing.length === 0,
    missing,
  });
}
