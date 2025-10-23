import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service | Banos Cookbook',
  description: 'Terms of Service for Banos Cookbook - Rules and guidelines for using our platform.',
};

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* eslint-disable react/no-unescaped-entities */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-4xl">Terms of Service</CardTitle>
          <CardDescription>Last Updated: October 12, 2025</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">1. Agreement to Terms</h2>
            <p className="mb-4 text-muted-foreground">
              Welcome to Banos Cookbook. By accessing or using our recipe sharing platform, you
              agree to be bound by these Terms of Service ("Terms"). If you do not agree to these
              Terms, please do not use our service.
            </p>
            <p className="mb-4 text-muted-foreground">
              <strong>Service Provider:</strong>
              <br />
              ABN: 51 256 011 991
              <br />
              Contact: +61 4 8321 0312
              <br />
              Email: info@banoscookbook.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">2. Description of Service</h2>
            <p className="mb-4 text-muted-foreground">
              Banos Cookbook is a recipe sharing platform that allows users to:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Create, upload, and share family recipes</li>
              <li>Extract recipes from PDFs and images using AI</li>
              <li>Generate AI-powered recipe images</li>
              <li>Get nutritional information for recipes</li>
              <li>Comment, rate, and review recipes</li>
              <li>Connect Instagram Business accounts for auto-posting</li>
              <li>Discover and save recipes from other users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">3. User Accounts and Registration</h2>

            <h3 className="mb-3 text-xl font-semibold">3.1 Account Creation</h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>You may need to provide a name and email to access certain features</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must be at least 13 years old to use this service</li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">3.2 Account Responsibilities</h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>You are responsible for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Provide accurate and current information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">4. User Content</h2>

            <h3 className="mb-3 text-xl font-semibold">4.1 Your Content Rights</h3>
            <p className="mb-4 text-muted-foreground">
              You retain ownership of all content you submit, including recipes, images, comments,
              and reviews. By posting content, you grant us a worldwide, non-exclusive, royalty-free
              license to use, display, reproduce, and distribute your content on our platform.
            </p>

            <h3 className="mb-3 text-xl font-semibold">4.2 Content Guidelines</h3>
            <p className="mb-4 text-muted-foreground">You agree NOT to post content that:</p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Violates copyright, trademark, or other intellectual property rights</li>
              <li>Contains hate speech, harassment, or discriminatory content</li>
              <li>Is obscene, pornographic, or sexually explicit</li>
              <li>Promotes illegal activities or violence</li>
              <li>Contains spam, advertising, or promotional material</li>
              <li>Impersonates others or misrepresents your affiliation</li>
              <li>Contains viruses, malware, or harmful code</li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">4.3 Recipe Attribution</h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Only post recipes you have the right to share</li>
              <li>Credit original recipe creators when applicable</li>
              <li>Respect family recipe privacy and permissions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">5. AI Features and Services</h2>

            <h3 className="mb-3 text-xl font-semibold">5.1 AI Image Generation</h3>
            <p className="mb-4 text-muted-foreground">
              Our AI image generation feature uses Google Gemini AI. Generated images are stored and
              may be reused to optimize costs. You may select which generated image to use for your
              recipe.
            </p>

            <h3 className="mb-3 text-xl font-semibold">5.2 Recipe Extraction</h3>
            <p className="mb-4 text-muted-foreground">
              AI-powered recipe extraction from PDFs and images is provided for convenience.
              Accuracy is not guaranteed. Always review and verify extracted information.
            </p>

            <h3 className="mb-3 text-xl font-semibold">5.3 Nutritional Information</h3>
            <p className="mb-4 text-muted-foreground">
              Nutritional analysis is AI-generated and provided for informational purposes only. It
              should not be used for medical, dietary, or health decisions. Consult a qualified
              healthcare professional for dietary advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">6. Instagram Integration</h2>
            <p className="mb-4 text-muted-foreground">
              If you connect your Instagram Business account:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>You authorize us to post recipes to your Instagram on your behalf</li>
              <li>We will sync comments and likes from Instagram to your recipes</li>
              <li>You can disconnect your Instagram account at any time</li>
              <li>Instagram integration is subject to Meta's Terms of Service and APIs</li>
              <li>We are not responsible for Instagram API changes or service interruptions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">7. Intellectual Property</h2>

            <h3 className="mb-3 text-xl font-semibold">7.1 Our Rights</h3>
            <p className="mb-4 text-muted-foreground">
              The Banos Cookbook platform, including its design, code, features, and branding, is
              owned by us and protected by intellectual property laws. You may not copy, modify, or
              create derivative works without permission.
            </p>

            <h3 className="mb-3 text-xl font-semibold">7.2 User Rights</h3>
            <p className="mb-4 text-muted-foreground">
              Users retain ownership of their original recipes and content. By sharing recipes, you
              allow others to view, save, and prepare them for personal, non-commercial use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">8. Prohibited Activities</h2>
            <p className="mb-4 text-muted-foreground">You agree NOT to:</p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Scrape, harvest, or collect data from the platform</li>
              <li>Use automated tools (bots, scripts) without permission</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Reverse engineer or decompile our platform</li>
              <li>Use the service for commercial purposes without authorization</li>
              <li>Create multiple accounts to manipulate ratings or comments</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">9. Termination</h2>
            <p className="mb-4 text-muted-foreground">
              We reserve the right to suspend or terminate your access to the service at any time,
              with or without notice, for:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Violation of these Terms</li>
              <li>Fraudulent, abusive, or illegal activity</li>
              <li>Inactivity for extended periods</li>
              <li>Request from law enforcement or legal authorities</li>
            </ul>
            <p className="mb-4 text-muted-foreground">
              Upon termination, your right to access the service ceases immediately. See our{' '}
              <Link href="/legal/data-deletion" className="underline">
                Data Deletion policy
              </Link>{' '}
              for information about removing your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">10. Disclaimers and Limitations</h2>

            <h3 className="mb-3 text-xl font-semibold">10.1 Service "As Is"</h3>
            <p className="mb-4 text-muted-foreground">
              The service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind,
              express or implied. We do not guarantee:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Uninterrupted or error-free service</li>
              <li>Accuracy of recipes, nutritional information, or AI-generated content</li>
              <li>Security from unauthorized access or data breaches</li>
              <li>Compatibility with all devices or browsers</li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">10.2 Food Safety Disclaimer</h3>
            <p className="mb-4 text-muted-foreground">
              <strong>Important:</strong> Recipes are user-generated and not professionally
              reviewed. Follow food safety guidelines, check for allergens, and use proper cooking
              techniques. We are not liable for food-related illnesses or injuries.
            </p>

            <h3 className="mb-3 text-xl font-semibold">10.3 Limitation of Liability</h3>
            <p className="mb-4 text-muted-foreground">
              To the maximum extent permitted by law, we shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the
              service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">11. Third-Party Services</h2>
            <p className="mb-4 text-muted-foreground">
              Our service integrates with third-party platforms (Google AI, Instagram, Firebase,
              Unsplash). These services have their own terms and privacy policies. We are not
              responsible for third-party service interruptions or changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">12. Governing Law</h2>
            <p className="mb-4 text-muted-foreground">
              These Terms are governed by the laws of Australia. Any disputes shall be resolved in
              the courts of New South Wales, Australia.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">13. Changes to Terms</h2>
            <p className="mb-4 text-muted-foreground">
              We may modify these Terms at any time. Significant changes will be notified via the
              platform or email. Continued use after changes constitutes acceptance of the new
              Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">14. Contact Information</h2>
            <p className="mb-4 text-muted-foreground">
              For questions about these Terms, please contact us:
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
                <a href="mailto:legal@banoscookbook.com" className="underline">
                  legal@banoscookbook.com
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
                <Link href="/legal/privacy" className="underline">
                  Privacy Policy
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
