import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Best Yummly Alternative for Food Creators — BanosCookbook',
  description:
    'Yummly shut down? BanosCookbook is the #1 Yummly alternative. Save your recipes, turn them into TikTok & Instagram Reels, and grow your food creator audience. Free to start.',
  keywords: [
    'Yummly alternative',
    'replace Yummly',
    'Yummly shutdown',
    'recipe platform',
    'food creator app',
    'recipe video maker',
    'save recipes online',
  ],
  openGraph: {
    title: 'Best Yummly Alternative for Food Creators',
    description:
      'BanosCookbook helps you save, share, and turn recipes into viral video content. The Yummly replacement built for creators.',
    type: 'website',
  },
};

const COMPARISON_FEATURES = [
  {
    icon: BookOpen,
    title: 'Recipe Ownership',
    yummly: 'Recipes locked in a platform that can shut down at any time',
    banos: 'Your cookbook, your data — always accessible, always yours',
  },
  {
    icon: Video,
    title: 'Video Creation',
    yummly: 'Static recipe cards only — no video content tools',
    banos: 'Turn recipes into Instagram & TikTok Reels with AI-powered video generation',
  },
  {
    icon: Users,
    title: 'Community & Growth',
    yummly: 'Limited social features, no creator monetisation',
    banos: 'Public profiles, social links, storefront for digital products, brand marketplace',
  },
];

const TESTIMONIALS = [
  {
    name: 'Maria C.',
    handle: '@mariascucina',
    quote:
      "After Yummly went dark I was devastated — years of recipes gone. BanosCookbook was the first platform that didn't just store my recipes but helped me actually grow an audience around them. The AI video tool is insane.",
  },
  {
    name: 'James T.',
    handle: '@jamesbbq',
    quote:
      "I imported my entire Yummly collection in an afternoon and posted my first TikTok recipe reel the same day. My BBQ channel went from 200 to 4,000 followers in two months. Nothing else comes close.",
  },
  {
    name: 'Priya R.',
    handle: '@priyaspantry',
    quote:
      "BanosCookbook is what Yummly should have always been — a real home for food creators, not just a recipe database. The comment reply suggestions alone save me an hour a week.",
  },
];

export default function YummlyAlternativePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50 to-white py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-block rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700 mb-6">
            The #1 Yummly Alternative
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
            Yummly shut down.
            <br />
            <span className="text-orange-500">Your recipes deserve a better home.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            BanosCookbook isn't just another recipe saver — it's the platform that actually helps you{' '}
            <strong>grow as a food creator</strong>. Import your recipes, turn them into viral TikTok &amp;
            Instagram Reels, and build an audience that loves your cooking.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Start Your Free Cookbook <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/add-recipe">Import Recipes Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why BanosCookbook beats Yummly */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            Why BanosCookbook beats Yummly
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Yummly was a recipe library. BanosCookbook is a creator platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COMPARISON_FEATURES.map((feature) => (
              <Card key={feature.title} className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <feature.icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded bg-red-50 p-3 text-sm">
                    <p className="text-xs font-semibold text-red-600 mb-1">Yummly</p>
                    <p className="text-red-800">{feature.yummly}</p>
                  </div>
                  <div className="rounded bg-green-50 p-3 text-sm">
                    <p className="text-xs font-semibold text-green-600 mb-1">BanosCookbook</p>
                    <p className="text-green-800">{feature.banos}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Migration callout */}
      <section className="py-16 px-4 bg-orange-500 text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Migrated from Yummly? Import your recipes in seconds.
          </h2>
          <p className="text-orange-100 mb-8 text-lg">
            Paste any recipe URL, snap a photo of a recipe card, or type it in manually. We make it easy
            to rebuild your collection — and start growing from day one.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/add-recipe">
              Import Your Recipes <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Food creators who made the switch
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <Card key={t.handle} className="bg-white">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground italic mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.handle}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start your free cookbook today
          </h2>
          <p className="text-muted-foreground mb-8">
            Free forever for 2 recipe videos per month. No credit card required.
            Import your old Yummly recipes in minutes.
          </p>
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Start Your Free Cookbook <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
