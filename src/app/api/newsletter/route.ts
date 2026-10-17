/**
 * POST /api/newsletter  { email, company? }
 * "Ammi's recipe of the week" sign-up → Resend contact.
 *
 * Env: RESEND_API_KEY plus RESEND_NEWSLETTER_SEGMENT_ID (current Resend contacts +
 * segments API) or RESEND_AUDIENCE_ID (legacy audiences API).
 * Abuse controls: same-origin only, honeypot field, 5 sign-ups per IP per hour,
 * duplicate emails are a no-op. Only a hash of the email is stored here.
 */
import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import adminConfig from '../../../../config/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PER_IP_PER_HOUR = 5;

const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

async function underRateLimit(ip: string): Promise<boolean> {
  const db = adminConfig.getDb();
  const ref = db.collection('newsletter_rate').doc(sha(`nl:${ip}`).slice(0, 40));
  const hour = Math.floor(Date.now() / 3_600_000);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const d = snap.data();
    const count = d?.hour === hour ? Number(d.count ?? 0) : 0;
    if (count >= PER_IP_PER_HOUR) return false;
    tx.set(ref, { hour, count: count + 1 });
    return true;
  });
}

async function addResendContact(email: string): Promise<{ ok: boolean; status: number }> {
  const key = process.env.RESEND_API_KEY;
  const segment = process.env.RESEND_NEWSLETTER_SEGMENT_ID;
  const audience = process.env.RESEND_AUDIENCE_ID;
  const url = segment
    ? 'https://api.resend.com/contacts'
    : `https://api.resend.com/audiences/${encodeURIComponent(audience ?? '')}/contacts`;
  const body = segment
    ? { email, unsubscribed: false, segments: [{ id: segment }] }
    : { email, unsubscribed: false };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (res.ok) return { ok: true, status: res.status };
  const text = await res.text().catch(() => '');
  // An existing contact is a successful sign-up from the visitor's point of view.
  if (res.status === 409 || /already exists/i.test(text)) return { ok: true, status: res.status };
  console.error('[newsletter] Resend error', res.status, text.slice(0, 200));
  return { ok: false, status: res.status };
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; company?: unknown };

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.company === 'string' && body.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  if (
    !process.env.RESEND_API_KEY ||
    !(process.env.RESEND_NEWSLETTER_SEGMENT_ID || process.env.RESEND_AUDIENCE_ID)
  ) {
    return NextResponse.json({ error: 'Newsletter sign-up is not open yet' }, { status: 503 });
  }

  try {
    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    if (!(await underRateLimit(ip))) {
      return NextResponse.json({ error: 'Too many sign-ups, try again later' }, { status: 429 });
    }

    const db = adminConfig.getDb();
    const ref = db.collection('newsletter_signups').doc(sha(email));
    if ((await ref.get()).exists) return NextResponse.json({ ok: true });

    const result = await addResendContact(email);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Could not sign you up, please try again' },
        { status: 502 }
      );
    }
    await ref.set({ list: 'ammi-weekly', source: 'site', createdAt: new Date() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[newsletter]', err);
    return NextResponse.json({ error: 'Could not sign you up, please try again' }, { status: 500 });
  }
}
