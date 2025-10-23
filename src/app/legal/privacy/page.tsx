import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy | Banos Cookbook',
  description: 'Privacy Policy for Banos Cookbook - How we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* eslint-disable react/no-unescaped-entities */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-4xl">Privacy Policy</CardTitle>
          <CardDescription>Last Updated: October 12, 2025</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
            <p className="mb-4 text-muted-foreground">
              Welcome to Banos Cookbook ("we," "our," or "us"). We are committed to protecting your
              privacy and ensuring the security of your personal information. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use
              our recipe sharing platform.
            </p>
            <p className="mb-4 text-muted-foreground">
              <strong>Business Information:</strong>
              <br />
              ABN: 51 256 011 991
              <br />
              Contact: +61 4 8321 0312
              <br />
              Email: info@banoscookbook.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">2. Information We Collect</h2>

            <h3 className="mb-3 text-xl font-semibold">2.1 Information You Provide</h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Recipe Data:</strong> Title, description, ingredients, instructions, cuisine
                type, and cooking information
              </li>
              <li>
                <strong>User Information:</strong> Name, email address (when provided)
              </li>
              <li>
                <strong>Images:</strong> Photos you upload or generate using our AI features
              </li>
              <li>
                <strong>Comments & Reviews:</strong> Your comments, replies, ratings, and likes on
                recipes
              </li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">2.2 Automatically Collected Information</h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, time spent on the
                platform
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, IP address
              </li>
              <li>
                <strong>Cookies:</strong> Session data, preferences, and analytics (see our{' '}
                <Link href="/legal/cookies" className="underline">
                  Cookie Policy
                </Link>
                )
              </li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">2.3 Third-Party Data</h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Instagram Integration:</strong> If you connect your Instagram account, we
                access your public profile, posts, and comments as authorized
              </li>
              <li>
                <strong>Google AI Services:</strong> Recipe data processed for AI image generation
                and nutritional analysis
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">3. How We Use Your Information</h2>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Service Delivery:</strong> Display recipes, enable social features, generate
                AI images
              </li>
              <li>
                <strong>AI Features:</strong> Recipe extraction from PDFs/images, nutritional
                analysis, image generation
              </li>
              <li>
                <strong>Instagram Integration:</strong> Auto-post recipes, sync comments and likes
              </li>
              <li>
                <strong>Platform Improvement:</strong> Analyze usage patterns, improve features, fix
                bugs
              </li>
              <li>
                <strong>Communication:</strong> Respond to inquiries, send notifications about your
                content
              </li>
              <li>
                <strong>Legal Compliance:</strong> Comply with laws, prevent fraud, protect user
                safety
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">4. Third-Party Services</h2>

            <h3 className="mb-3 text-xl font-semibold">
              We use the following third-party services:
            </h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Google Gemini AI:</strong> For recipe analysis, image generation, and
                nutritional information
              </li>
              <li>
                <strong>Firebase/Firestore:</strong> Data storage and hosting
              </li>
              <li>
                <strong>Instagram Graph API:</strong> Social media integration (when authorized)
              </li>
              <li>
                <strong>Vercel:</strong> Application hosting and deployment
              </li>
              <li>
                <strong>Unsplash:</strong> Placeholder images (public API)
              </li>
            </ul>

            <p className="mb-4 text-muted-foreground">
              Each service has its own privacy policy governing how they handle data:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Firebase Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/privacy/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Meta (Instagram) Privacy Policy
                </a>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">5. Data Storage and Security</h2>
            <p className="mb-4 text-muted-foreground">
              Your data is stored securely using industry-standard practices:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Encryption:</strong> Data in transit is encrypted using HTTPS/TLS
              </li>
              <li>
                <strong>Firebase Security:</strong> Access controlled via Firestore security rules
              </li>
              <li>
                <strong>Data Location:</strong> Stored on Google Cloud Platform servers
              </li>
              <li>
                <strong>Retention:</strong> Data retained while your account is active or as needed
                for service delivery
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">6. Your Rights</h2>
            <p className="mb-4 text-muted-foreground">
              You have the following rights regarding your personal data:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Access:</strong> Request a copy of your data
              </li>
              <li>
                <strong>Correction:</strong> Update inaccurate information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your data (see{' '}
                <Link href="/legal/data-deletion" className="underline">
                  Data Deletion
                </Link>
                )
              </li>
              <li>
                <strong>Portability:</strong> Export your recipes and data
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from communications
              </li>
              <li>
                <strong>Disconnect:</strong> Revoke Instagram integration at any time
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">7. Instagram Integration</h2>
            <p className="mb-4 text-muted-foreground">
              When you connect your Instagram Business account:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>We can post recipes to your Instagram on your behalf</li>
              <li>We sync comments and likes from Instagram to your recipes</li>
              <li>We store Instagram post IDs, usernames, and engagement metrics</li>
              <li>You can disconnect at any time via your account settings</li>
              <li>Instagram data is subject to Meta's privacy policies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">8. Children's Privacy</h2>
            <p className="mb-4 text-muted-foreground">
              Our service is not directed to children under 13. We do not knowingly collect personal
              information from children. If you believe we have collected data from a child, please
              contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">9. International Users</h2>
            <p className="mb-4 text-muted-foreground">
              Our servers are located globally via Firebase/Google Cloud. By using our service, you
              consent to the transfer of your information to countries outside your residence, which
              may have different data protection laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">10. Changes to This Policy</h2>
            <p className="mb-4 text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">11. Contact Us</h2>
            <p className="mb-4 text-muted-foreground">
              If you have questions about this Privacy Policy or wish to exercise your rights,
              please contact us:
            </p>
            <div className="rounded-lg bg-muted p-4 text-muted-foreground">
              <p>
                <strong>Banos Cookbook</strong>
              </p>
              <p>ABN: 51 256 011 991</p>
              <p>
                Phone:{' '}
                <a href="tel:+61483210312" className="underline">
                  +61 4 8321 0312
                </a>
              </p>
              <p>
                Email:{' '}
                <a href="mailto:privacy@banoscookbook.com" className="underline">
                  privacy@banoscookbook.com
                </a>
              </p>
            </div>
          </section>

          <div className="mt-8 rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Related Documents:</strong>
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              <li>
                <Link href="/legal/terms" className="underline">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="underline">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/data-deletion" className="underline">
                  Data Deletion Instructions
                </Link>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
