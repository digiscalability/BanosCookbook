import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { PricingUpgradeButtons } from './pricing-upgrade-buttons';

export const metadata: Metadata = {
  title: 'Pricing — BanosCookbook',
  description: 'Choose the plan that fits your food creator journey. Free, Creator, and Pro tiers available.',
};

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Perfect for home cooks sharing family recipes',
    badge: null,
    features: [
      '2 recipe videos per month',
      'Basic cookbook page',
      'Public creator profile',
      'Recipe comments & ratings',
      'Share recipes via link',
    ],
    cta: 'Get Started',
    ctaVariant: 'outline' as const,
    ctaHref: '/sign-up',
    tier: 'free' as const,
  },
  {
    name: 'Creator',
    price: '$19',
    period: '/mo',
    description: 'For food creators ready to grow their audience',
    badge: 'Most Popular',
    features: [
      '15 recipe videos per month',
      'Everything in Free',
      'TikTok auto-post',
      'Instagram auto-post',
      'Comment reply suggestions (AI)',
      'Priority in recipe discovery',
    ],
    cta: 'Upgrade to Creator',
    ctaVariant: 'default' as const,
    ctaHref: null,
    tier: 'creator' as const,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For serious food creators and culinary professionals',
    badge: null,
    features: [
      'Unlimited recipe videos',
      'Everything in Creator',
      'Priority support',
      'Brand marketplace access',
      'Creator storefront',
      'Analytics dashboard',
    ],
    cta: 'Upgrade to Pro',
    ctaVariant: 'default' as const,
    ctaHref: null,
    tier: 'pro' as const,
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      {params.success === 'true' && (
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800">
          <p className="font-semibold">Payment successful! Your plan has been upgraded.</p>
          <p className="text-sm mt-1">Your new video credits will be available momentarily.</p>
        </div>
      )}

      <header className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Turn your recipes into viral content. Start free, upgrade when you&apos;re ready to grow.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={`relative flex flex-col ${tier.badge ? 'border-primary shadow-lg scale-[1.02]' : ''}`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-3 py-1">{tier.badge}</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>
              <CardDescription className="mt-2">{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {tier.ctaHref ? (
                <Button variant={tier.ctaVariant} className="w-full" asChild>
                  <Link href={tier.ctaHref}>{tier.cta}</Link>
                </Button>
              ) : (
                <PricingUpgradeButtons tier={tier.tier as 'creator' | 'pro'} label={tier.cta} />
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Business tier callout */}
      <div className="mt-12 rounded-xl border bg-muted/40 p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Business / Restaurant</h2>
        <p className="text-muted-foreground mb-1">
          <span className="text-3xl font-bold text-foreground">$149</span>/mo
        </p>
        <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
          Everything in Pro + team accounts (up to 5), custom domain cookbook, white-label video exports, and a dedicated account manager.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:hello@banoscookbook.com">Contact Sales</a>
        </Button>
      </div>
    </div>
  );
}
