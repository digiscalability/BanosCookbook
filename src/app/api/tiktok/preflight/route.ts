import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  const configured =
    Boolean(process.env.TIKTOK_ACCESS_TOKEN) &&
    Boolean(process.env.TIKTOK_CLIENT_KEY);

  return NextResponse.json({ configured });
}
