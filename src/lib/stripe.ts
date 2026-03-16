import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-02-25.clover',
});

export const STRIPE_PRICES = {
  creator: process.env.STRIPE_PRICE_CREATOR ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
};

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
