import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
      _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover' });
    }
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const STRIPE_PRICES = {
  creator: process.env.STRIPE_PRICE_CREATOR ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
};

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
