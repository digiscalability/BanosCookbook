import type { Metadata } from 'next';
import { Literata } from 'next/font/google';

import ErrorBoundary from '@/components/error-boundary';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: 'BanosCookbook',
  description: 'A warm, home-style digital recipe book for sharing and preserving family recipes.',
};

const literata = Literata({
  subsets: ['latin'],
  weight: ['200', '400', '700', '900'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          literata.className,
          'min-h-screen bg-background font-body antialiased',
          'flex flex-col'
        )}
      >
        <AuthProvider>
          <Header />
          <main className="flex-grow">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <Footer />
          <Toaster />
        </AuthProvider>
        <script src="/share-modal-fix.js" defer />
      </body>
    </html>
  );
}
