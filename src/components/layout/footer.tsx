import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="mb-6 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About Section */}
          <div>
            <h3 className="mb-3 font-headline text-lg font-semibold">Banos Cookbook</h3>
            <p className="mb-2 text-sm text-muted-foreground">
              Share family recipes and discover delicious dishes from around the world.
            </p>
            <p className="text-sm text-muted-foreground">ABN: 51 256 011 991</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 font-headline text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/add-recipe"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Add Recipe
                </Link>
              </li>
              <li>
                <Link
                  href="/videohub"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Video Hub
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 font-headline text-lg font-semibold">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="tel:+61483210312" className="transition-colors hover:text-foreground">
                  +61 4 8321 0312
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@banoscookbook.com"
                  className="transition-colors hover:text-foreground"
                >
                  info@banoscookbook.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t pt-6">
          {/* Bottom Bar */}
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
            {/* Copyright */}
            <div>© {currentYear} Banos Cookbook. All rights reserved.</div>

            {/* Legal Links */}
            <div className="flex items-center gap-4">
              <Link href="/legal/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
              <span>|</span>
              <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
              <span>|</span>
              <Link href="/legal/cookies" className="transition-colors hover:text-foreground">
                Cookies
              </Link>
              <span>|</span>
              <Link href="/legal/data-deletion" className="transition-colors hover:text-foreground">
                Data Deletion
              </Link>
            </div>
          </div>

          {/* reCAPTCHA Notice */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            This site is protected by reCAPTCHA and the Google{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              Terms of Service
            </a>{' '}
            apply.
          </div>
        </div>
      </div>
    </footer>
  );
}
