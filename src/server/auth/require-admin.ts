/**
 * Server-side identity checks for route handlers, server actions and middleware.
 *
 * Identity comes from either:
 *   - `Authorization: Bearer <Firebase ID token>` (scripts, programmatic callers), or
 *   - the `__session` cookie minted by POST /api/auth/session after a client sign-in.
 *
 * Admin = a verified token whose custom claims include `admin: true`
 * (set with `npx tsx scripts/set-admin-claim.ts <email>`).
 */
import type { DecodedIdToken } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';

import adminConfig from '../../../config/firebase-admin';

export const SESSION_COOKIE = '__session';
/** Non-httpOnly marker so the client knows a session cookie exists for this uid. */
export const SESSION_UID_COOKIE = 'bc_session_uid';
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export function isAdminClaims(token: object | null | undefined): boolean {
  return (token as { admin?: unknown } | null | undefined)?.admin === true;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/** Verifies a session cookie value. Returns null instead of throwing on any failure. */
export async function verifySessionCookieValue(
  sessionCookie: string | null | undefined
): Promise<DecodedIdToken | null> {
  if (!sessionCookie) return null;
  try {
    return await adminConfig.getAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

/** Verifies a Firebase ID token. Returns null instead of throwing on any failure. */
export async function verifyIdTokenValue(
  idToken: string | null | undefined
): Promise<DecodedIdToken | null> {
  if (!idToken) return null;
  try {
    return await adminConfig.getAuth().verifyIdToken(idToken, true);
  } catch {
    return null;
  }
}

/** Identity of the caller of a route handler, or null when anonymous / invalid. */
export async function getRequestUser(req: Request): Promise<DecodedIdToken | null> {
  const token = bearerToken(req);
  if (token) return verifyIdTokenValue(token);
  return verifySessionCookieValue(cookieValue(req, SESSION_COOKIE));
}

export async function requireUser(req: Request): Promise<DecodedIdToken> {
  const user = await getRequestUser(req);
  if (!user) throw new AuthError(401, 'Sign in required');
  return user;
}

export async function requireAdmin(req: Request): Promise<DecodedIdToken> {
  const user = await requireUser(req);
  if (!isAdminClaims(user)) throw new AuthError(403, 'Admin only');
  return user;
}

/** Converts an auth failure into a JSON response for route handlers. */
export function authFailure(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error('[auth] unexpected verification error', err);
  return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
}

// ─── Server actions ───────────────────────────────────────────────────────────
// Server actions are POST endpoints anyone can call with the action ID, so every
// spending or writing action must check the caller first. Actions only see cookies.

async function getActionUser(): Promise<DecodedIdToken | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return verifySessionCookieValue(store.get(SESSION_COOKIE)?.value);
}

export async function requireUserAction(): Promise<DecodedIdToken> {
  const user = await getActionUser();
  if (!user) throw new AuthError(401, 'Sign in required');
  return user;
}

export async function requireAdminAction(): Promise<DecodedIdToken> {
  const user = await requireUserAction();
  if (!isAdminClaims(user)) throw new AuthError(403, 'Admin only');
  return user;
}

/** Cookie header carrying the caller's session, for server-to-server calls on their behalf. */
export async function forwardSessionCookieHeader(): Promise<Record<string, string>> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return value ? { Cookie: `${SESSION_COOKIE}=${encodeURIComponent(value)}` } : {};
}
