'use client';

import { CookingPot, PlusCircle, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <Button asChild>
              <Link href="/add-recipe">
                <PlusCircle className="mr-2" />
                Add Recipe
              </Link>
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="space-y-2 border-t border-border py-4 md:hidden">
            <Button variant="ghost" asChild className="w-full justify-start">
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                Home
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
