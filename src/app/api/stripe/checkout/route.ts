import type { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

import { stripe, STRIPE_PRICES } from '@/lib/stripe';
import adminConfig from '../../../../../config/firebase-admin';

export const runtime = 'nodejs';

const { getAdmin } = adminConfig as unknown as {
  getAdmin: () => typeof import('firebase-admin');
};

async function verifyIdToken(token: string): Promise<string | null> {
  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const userId = await verifyIdToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { tier } = body as { tier: 'creator' | 'pro' };
    if (!tier || !['creator', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const priceId = STRIPE_PRICES[tier];
    if (!priceId) {
      return NextResponse.json({ error: `Stripe price not configured for tier: ${tier}` }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:9002'}/pricing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:9002'}/pricing`,
      metadata: { userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/checkout]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
