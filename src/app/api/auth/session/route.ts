/**
 * POST /api/auth/session   { idToken }  → sets the httpOnly `__session` cookie
 * DELETE /api/auth/session              → clears it
 *
 * The client calls POST after Firebase sign-in so middleware, route handlers and
 * server actions can identify the caller from the cookie alone.
 */
import { NextRequest, NextResponse } from 'next/server';

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  SESSION_UID_COOKIE,
  verifyIdTokenValue,
} from '@/server/auth/require-admin';

import adminConfig from '../../../../../config/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetches from older browsers may omit it
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

const cookieBase = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { idToken?: unknown };
  const idToken = typeof body.idToken === 'string' ? body.idToken : '';
  if (!idToken || idToken.length > 4096) {
    return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
  }

  const decoded = await verifyIdTokenValue(idToken);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await adminConfig
      .getAuth()
      .createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  } catch (err) {
    console.error('[auth/session] createSessionCookie failed', err);
    return NextResponse.json({ error: 'Could not create session' }, { status: 401 });
  }

  const maxAge = Math.floor(SESSION_MAX_AGE_MS / 1000);
  const res = NextResponse.json({ ok: true, admin: decoded.admin === true });
  res.cookies.set(SESSION_COOKIE, sessionCookie, { ...cookieBase, httpOnly: true, maxAge });
  res.cookies.set(SESSION_UID_COOKIE, decoded.uid, { ...cookieBase, httpOnly: false, maxAge });
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...cookieBase, httpOnly: true, maxAge: 0 });
  res.cookies.set(SESSION_UID_COOKIE, '', { ...cookieBase, httpOnly: false, maxAge: 0 });
  return res;
}
