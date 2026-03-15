import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const REQUIRED_VARS = [
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
];

export function GET() {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  return NextResponse.json({
    configured: missing.length === 0,
    missing,
  });
}
