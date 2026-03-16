import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { stripe, STRIPE_PRICES, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import adminConfig from '../../../../../config/firebase-admin';

export const runtime = 'nodejs';

const { getDb } = adminConfig as unknown as {
  getDb: () => import('firebase-admin').firestore.Firestore;
};

function tierFromPriceId(priceId: string): 'creator' | 'pro' | null {
  if (priceId === STRIPE_PRICES.creator) return 'creator';
  if (priceId === STRIPE_PRICES.pro) return 'pro';
  return null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const db = getDb();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) {
        return NextResponse.json({ received: true });
      }

      // Get subscription to find price
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        if (priceId) {
          const tier = tierFromPriceId(priceId);
          if (tier) {
            await db.collection('user_credits').doc(userId).set(
              { tier, stripeCustomerId: session.customer, stripeSubscriptionId: session.subscription },
              { merge: true }
            );
          }
        }
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      // Find user by stripeCustomerId
      const userId = (subscription.metadata?.userId as string | undefined);
      if (userId && priceId) {
        const tier = tierFromPriceId(priceId);
        if (tier) {
          await db.collection('user_credits').doc(userId).set(
            { tier },
            { merge: true }
          );
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId as string | undefined;
      if (userId) {
        await db.collection('user_credits').doc(userId).set(
          { tier: 'free' },
          { merge: true }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe/webhook] handler error:', error);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }
}
