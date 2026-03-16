import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Video, Palette, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'BanosCookbook for Restaurants & Food Businesses',
  description:
    'Turn your restaurant menu into viral social content automatically. BanosCookbook for Business: recipe library management, automated video creation, and brand consistency across all platforms.',
  keywords: [
    'restaurant social media',
    'food business content',
    'recipe marketing',
    'restaurant video content',
    'menu to video',
    'food brand content creation',
  ],
  openGraph: {
    title: 'BanosCookbook for Restaurants & Food Businesses',
    description:
      'Turn your menu into viral content — automatically. The content platform built for food businesses.',
    type: 'website',
  },
};

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Recipe Library Management',
    description:
      'Centralise your entire menu in one place. Keep recipes consistent across locations, update seasonal menus instantly, and never lose a recipe again. Full version history and team collaboration built in.',
  },
  {
    icon: Video,
    title: 'Automated Social Media Content',
    description:
      'Transform every menu item into a professional recipe video with one click. AI-powered voiceovers, branded captions, and automatic posting to Instagram and TikTok — no video production team needed.',
  },
  {
    icon: Palette,
    title: 'Brand Consistency',
    description:
      'Every video your brand produces follows the same style, tone, and quality standards. Custom branding, white-label exports, and consistent presentation across all your social channels.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Up to 5 team members on one account. Chefs create recipes, marketers schedule posts, managers review analytics — everyone in the same platform with appropriate access levels.',
  },
];

const SOCIAL_PROOF = [
  { label: 'Restaurants using BanosCookbook', value: '150+' },
  { label: 'Videos generated per month', value: '12,000+' },
  { label: 'Average follower growth per month', value: '+23%' },
];

export default function BusinessPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-block rounded-full bg-orange-500/20 border border-orange-500/30 px-4 py-1.5 text-sm font-medium text-orange-400 mb-6">
            BanosCookbook for Business
          </div>
          <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
            Turn your menu into
            <br />
            <span className="text-orange-400">viral content — automatically.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
            Restaurants and food businesses use BanosCookbook to transform every dish into
            professional social media content, posted automatically to Instagram and TikTok.
            No video team. No agency. Just results.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="mailto:hello@banoscookbook.com?subject=BanosCookbook Business Demo Request">
                Get a Demo <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-orange-500 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-white">
            {SOCIAL_PROOF.map((item) => (
              <div key={item.label}>
                <p className="text-3xl font-bold">{item.value}</p>
                <p className="text-sm text-orange-100 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything a food business needs
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            One platform to manage your recipe library, create content, and grow your social presence.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-2 hover:border-orange-200 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <feature.icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing callout */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">Business Tier Pricing</h2>
          <div className="rounded-2xl border-2 border-orange-200 bg-white p-8 max-w-md mx-auto">
            <p className="text-sm text-muted-foreground mb-2">Business / Restaurant</p>
            <p className="text-5xl font-bold mb-1">$149</p>
            <p className="text-muted-foreground mb-6">/month</p>
            <ul className="text-sm text-left space-y-3 mb-8">
              {[
                'Everything in Pro (unlimited videos)',
                'Team accounts — up to 5 users',
                'Custom domain cookbook',
                'White-label video exports',
                'Dedicated account manager',
                'Priority phone & email support',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="w-full" asChild>
              <a href="mailto:hello@banoscookbook.com?subject=BanosCookbook Business Demo Request">
                Contact Sales
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Trusted by section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium text-muted-foreground mb-8 uppercase tracking-wide">
            Trusted by food businesses everywhere
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {['Local Bistros', 'Food Trucks', 'Catering Co.', 'Meal Kit Services'].map((name) => (
              <div
                key={name}
                className="rounded-lg border bg-gray-50 p-4 text-sm font-medium text-gray-500"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to automate your food content?
          </h2>
          <p className="text-slate-300 mb-8">
            Book a 20-minute demo and we&apos;ll show you exactly how BanosCookbook can work for your
            restaurant or food business.
          </p>
          <Button size="lg" asChild>
            <a href="mailto:hello@banoscookbook.com?subject=BanosCookbook Business Demo Request">
              Get a Demo <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
