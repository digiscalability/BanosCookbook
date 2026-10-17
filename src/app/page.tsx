import type { Metadata } from 'next';

import { NewsletterSignup } from '@/components/newsletter-signup';
import { jsonLdScript } from '@/lib/recipe-jsonld';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

import HomeClient from './home-client';

const title = `${SITE_NAME}: Ammi's recipes from her 1981 notebooks`;

export const metadata: Metadata = {
  title: { absolute: title },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
  },
  twitter: { card: 'summary_large_image', title, description: SITE_DESCRIPTION },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd) }}
      />
      <HomeClient />
      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <NewsletterSignup />
      </div>
    </>
  );
}
