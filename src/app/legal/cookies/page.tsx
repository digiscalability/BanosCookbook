import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Cookie Policy | Banos Cookbook',
  description: 'Cookie Policy for Banos Cookbook - How we use cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* eslint-disable react/no-unescaped-entities */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-4xl">Cookie Policy</CardTitle>
          <CardDescription>Last Updated: October 12, 2025</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">1. What Are Cookies?</h2>
            <p className="mb-4 text-muted-foreground">
              Cookies are small text files stored on your device when you visit our website. They
              help us provide a better user experience by remembering your preferences and analyzing
              how you use our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">2. Types of Cookies We Use</h2>

            <h3 className="mb-3 text-xl font-semibold">2.1 Essential Cookies</h3>
            <p className="mb-4 text-muted-foreground">
              These cookies are necessary for the website to function properly. They enable basic
              features like page navigation and access to secure areas.
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Session Management:</strong> Keep you logged in as you navigate
              </li>
              <li>
                <strong>Security:</strong> Prevent unauthorized access and fraud
              </li>
              <li>
                <strong>Form Data:</strong> Remember information you enter in forms
              </li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">2.2 Functional Cookies</h3>
            <p className="mb-4 text-muted-foreground">
              These cookies remember your preferences and choices to provide enhanced functionality.
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>User Preferences:</strong> Remember your selected theme, language, or
                display settings
              </li>
              <li>
                <strong>Recipe Filters:</strong> Save your cuisine or dietary preferences
              </li>
              <li>
                <strong>Comment Tracking:</strong> Track which recipes you've commented on
              </li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">2.3 Analytics Cookies</h3>
            <p className="mb-4 text-muted-foreground">
              These cookies help us understand how visitors interact with our website, allowing us
              to improve the service.
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Usage Statistics:</strong> Pages visited, time spent, features used
              </li>
              <li>
                <strong>Performance Monitoring:</strong> Page load times, errors
              </li>
              <li>
                <strong>User Behavior:</strong> Click patterns, navigation flows
              </li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">2.4 Third-Party Cookies</h3>
            <p className="mb-4 text-muted-foreground">
              We use services from third parties that may set their own cookies:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Google Fonts:</strong> For typography
              </li>
              <li>
                <strong>Firebase/Google Cloud:</strong> For authentication and data storage
              </li>
              <li>
                <strong>Instagram:</strong> If you connect your Instagram account
              </li>
              <li>
                <strong>Vercel Analytics:</strong> For performance monitoring
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">3. How We Use Cookies</h2>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Authentication:</strong> Keep you logged in across sessions
              </li>
              <li>
                <strong>Personalization:</strong> Remember your preferences and settings
              </li>
              <li>
                <strong>Like Tracking:</strong> Track which recipes and comments you've liked
              </li>
              <li>
                <strong>AI Features:</strong> Remember your AI image selections
              </li>
              <li>
                <strong>Performance:</strong> Optimize loading times and reduce server load
              </li>
              <li>
                <strong>Security:</strong> Detect and prevent fraudulent activity
              </li>
              <li>
                <strong>Analytics:</strong> Understand usage patterns to improve features
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">4. Browser Storage</h2>
            <p className="mb-4 text-muted-foreground">
              In addition to cookies, we may use browser storage technologies:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Local Storage:</strong> Store larger amounts of data like recipe drafts
              </li>
              <li>
                <strong>Session Storage:</strong> Temporary data cleared when you close your browser
              </li>
              <li>
                <strong>IndexedDB:</strong> Store structured data for offline access
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">5. Cookie Duration</h2>

            <h3 className="mb-3 text-xl font-semibold">5.1 Session Cookies</h3>
            <p className="mb-4 text-muted-foreground">
              Temporary cookies deleted when you close your browser. Used for session management and
              security.
            </p>

            <h3 className="mb-3 text-xl font-semibold">5.2 Persistent Cookies</h3>
            <p className="mb-4 text-muted-foreground">
              Remain on your device for a set period or until manually deleted. Used for:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Remember Me:</strong> Up to 30 days
              </li>
              <li>
                <strong>User Preferences:</strong> Up to 1 year
              </li>
              <li>
                <strong>Analytics:</strong> Up to 2 years
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">6. Managing Cookies</h2>

            <h3 className="mb-3 text-xl font-semibold">6.1 Browser Settings</h3>
            <p className="mb-4 text-muted-foreground">
              You can control cookies through your browser settings:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong>Block All Cookies:</strong> Prevent all websites from setting cookies
              </li>
              <li>
                <strong>Block Third-Party Cookies:</strong> Allow only first-party cookies
              </li>
              <li>
                <strong>Delete Cookies:</strong> Remove existing cookies from your device
              </li>
              <li>
                <strong>Incognito/Private Mode:</strong> Browse without saving cookies
              </li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">6.2 Browser-Specific Instructions</h3>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Apple Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>

            <h3 className="mb-3 text-xl font-semibold">6.3 Impact of Blocking Cookies</h3>
            <p className="mb-4 text-muted-foreground">
              Blocking or deleting cookies may impact your experience:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>You may need to log in repeatedly</li>
              <li>Your preferences won't be saved</li>
              <li>Some features may not work properly</li>
              <li>Recipe likes and comments tracking may not function</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">7. Third-Party Cookie Policies</h2>
            <p className="mb-4 text-muted-foreground">
              Our third-party service providers have their own cookie policies:
            </p>
            <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <a
                  href="https://policies.google.com/technologies/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Cookies Policy
                </a>
              </li>
              <li>
                <a
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Firebase Privacy & Security
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/policies/cookies/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Meta (Instagram) Cookies Policy
                </a>
              </li>
              <li>
                <a
                  href="https://vercel.com/docs/analytics/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Vercel Analytics Privacy
                </a>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">8. Do Not Track</h2>
            <p className="mb-4 text-muted-foreground">
              Some browsers offer "Do Not Track" (DNT) signals. Currently, there is no industry
              standard for responding to DNT signals. We may or may not honor DNT requests,
              depending on the browser and context.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">9. Updates to This Policy</h2>
            <p className="mb-4 text-muted-foreground">
              We may update this Cookie Policy to reflect changes in technology or legal
              requirements. The "Last Updated" date at the top indicates when the policy was last
              revised.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">10. Contact Us</h2>
            <p className="mb-4 text-muted-foreground">
              If you have questions about our use of cookies, please contact us:
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
                <Link href="/legal/privacy" className="underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="underline">
                  Terms of Service
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
