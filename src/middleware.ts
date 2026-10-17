/**
 * Guards admin surfaces before any page or route code runs.
 *
 *   /admin/**, /videohub/**          → admin session required (else redirect to sign-in / 403)
 *   /api/admin/**, /api/auth/instagram/** → admin session required (else 401 / 403 JSON)
 *   test and debug paths             → 404 in any production build (preview included)
 *
 * Route handlers re-check with requireAdmin(); this is the first line, not the only one.
 * Runs on the Node.js runtime so firebase-admin can verify the session cookie.
 */
import { NextResponse, type NextRequest } from 'next/server';

import {
  isAdminClaims,
  SESSION_COOKIE,
  verifySessionCookieValue,
} from '@/server/auth/require-admin';

const DEV_ONLY = /^\/(?:api\/)?(?:test-[^/]*|debug)(?:\/|$)|^\/process-real-pdf(?:\/|$)/;
const ADMIN_PAGES = /^\/(?:admin|videohub)(?:\/|$)/;
const ADMIN_APIS = /^\/api\/(?:admin|auth\/instagram)(?:\/|$)/;

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (DEV_ONLY.test(pathname)) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  const isApi = ADMIN_APIS.test(pathname);
  if (!isApi && !ADMIN_PAGES.test(pathname)) return NextResponse.next();

  const user = await verifySessionCookieValue(req.cookies.get(SESSION_COOKIE)?.value);

  if (!user) {
    if (isApi) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const signIn = new URL('/sign-in', req.url);
    signIn.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(signIn);
  }

  if (!isAdminClaims(user)) {
    if (isApi) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    return new NextResponse('Admin only', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/admin/:path*',
    '/videohub/:path*',
    '/api/admin/:path*',
    '/api/auth/instagram/:path*',
    '/api/debug/:path*',
    '/process-real-pdf/:path*',
    '/((?:api/)?test-[^/]*)/:path*',
  ],
};
