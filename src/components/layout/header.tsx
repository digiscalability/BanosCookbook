import Link from 'next/link';
import { CookingPot, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold font-headline text-foreground">
            <CookingPot className="h-7 w-7 text-primary" />
            <span>Family Cookbook Hub</span>
          </Link>
          <nav className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}
