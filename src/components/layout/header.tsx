'use client';

import { Bookmark, CookingPot, Menu, PlusCircle, Video, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { UserMenu } from '@/components/auth/user-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-card shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3 md:py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-headline text-lg font-bold text-foreground md:text-xl"
          >
            <CookingPot className="h-6 w-6 text-primary md:h-7 md:w-7" />
            <span className="hidden sm:inline">Banos Cookbook</span>
            <span className="sm:hidden">Banos</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/saved">
                <Bookmark className="mr-2 h-4 w-4" />
                Saved
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/videohub">
                <Video className="mr-2" />
                Video Hub
              </Link>
            </Button>
            <Button asChild>
              <Link href="/add-recipe">
                <PlusCircle className="mr-2" />
                Add Recipe
              </Link>
            </Button>
            {!loading && (
              <div className="ml-2 border-l border-border pl-2">
                <UserMenu />
              </div>
            )}
          </nav>

          {/* Mobile: auth + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            {!loading && <UserMenu />}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="space-y-2 border-t border-border py-4 md:hidden">
            <Button variant="ghost" asChild className="w-full justify-start">
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
            </Button>
            <Button variant="ghost" asChild className="w-full justify-start">
              <Link href="/saved" onClick={() => setIsMenuOpen(false)}>
                <Bookmark className="mr-2 h-4 w-4" />
                Saved
              </Link>
            </Button>
            <Button variant="ghost" asChild className="w-full justify-start">
              <Link href="/videohub" onClick={() => setIsMenuOpen(false)}>
                <Video className="mr-2" />
                Video Hub
              </Link>
            </Button>
            <Button asChild className="w-full justify-start">
              <Link href="/add-recipe" onClick={() => setIsMenuOpen(false)}>
                <PlusCircle className="mr-2" />
                Add Recipe
              </Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
