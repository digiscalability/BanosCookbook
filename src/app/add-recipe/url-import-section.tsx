'use client';

import { useState } from 'react';
import { Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecipeFromUrlOutput } from '@/ai/flows/recipe-from-url';

interface UrlImportSectionProps {
  onImport: (data: RecipeFromUrlOutput) => void;
  importedRecipe: RecipeFromUrlOutput | null;
}

export function UrlImportSection({ onImport, importedRecipe }: UrlImportSectionProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recipe-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to extract recipe from URL');
        return;
      }
      onImport(data as RecipeFromUrlOutput);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Or import from URL</CardTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="https://www.example.com/my-pasta-recipe"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleImport}
                disabled={loading || !url.trim()}
              >
                {loading ? 'Extracting…' : 'Import'}
              </Button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Paste any recipe URL and we&apos;ll extract the ingredients, instructions, and metadata automatically.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Imported recipe preview */}
      {importedRecipe && (
        <Card className="mt-4 border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-800">
                Recipe extracted — copy details into the form below
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-800"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-green-900 text-base">{importedRecipe.title}</p>
              {importedRecipe.description && (
                <p className="text-green-700 text-xs mt-0.5">{importedRecipe.description}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="font-medium text-green-800">Prep</p>
                <p className="text-green-700">{importedRecipe.prepTime}</p>
              </div>
              <div>
                <p className="font-medium text-green-800">Cook</p>
                <p className="text-green-700">{importedRecipe.cookTime}</p>
              </div>
              <div>
                <p className="font-medium text-green-800">Servings</p>
                <p className="text-green-700">{importedRecipe.servings}</p>
              </div>
            </div>
            <div>
              <p className="font-medium text-green-800 mb-1">Ingredients</p>
              <pre className="text-xs text-green-700 whitespace-pre-wrap font-sans bg-green-100 rounded p-2 max-h-32 overflow-y-auto">
                {importedRecipe.ingredients}
              </pre>
            </div>
            <div>
              <p className="font-medium text-green-800 mb-1">Instructions</p>
              <pre className="text-xs text-green-700 whitespace-pre-wrap font-sans bg-green-100 rounded p-2 max-h-32 overflow-y-auto">
                {importedRecipe.instructions}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {importedRecipe && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          ↓ Fill in the form below using the extracted details above ↓
        </p>
      )}
    </div>
  );
}
