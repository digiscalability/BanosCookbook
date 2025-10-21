import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* About Section */}
          <div>
            <h3 className="font-headline text-lg font-semibold mb-3">Banos Cookbook</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Share family recipes and discover delicious dishes from around the world.
            </p>
            <p className="text-sm text-muted-foreground">
              ABN: 51 256 011 991
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-headline text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/add-recipe" className="text-muted-foreground hover:text-foreground transition-colors">
                  Add Recipe
                </Link>
              </li>
              <li>
                <Link href="/admin/generated-images" className="text-muted-foreground hover:text-foreground transition-colors">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-headline text-lg font-semibold mb-3">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="tel:+61483210312" className="hover:text-foreground transition-colors">
                  +61 4 8321 0312
                </a>
              </li>
              <li>
                <a href="mailto:info@banoscookbook.com" className="hover:text-foreground transition-colors">
                  info@banoscookbook.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t pt-6">
          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            {/* Copyright */}
            <div>
              © {currentYear} Banos Cookbook. All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-4">
              <Link href="/legal/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <span>|</span>
              <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <span>|</span>
              <Link href="/legal/cookies" className="hover:text-foreground transition-colors">
                Cookies
              </Link>
              <span>|</span>
              <Link href="/legal/data-deletion" className="hover:text-foreground transition-colors">
                Data Deletion
              </Link>
            </div>
          </div>

          {/* reCAPTCHA Notice */}
          <div className="mt-4 text-xs text-center text-muted-foreground">
            This site is protected by reCAPTCHA and the Google{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
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
