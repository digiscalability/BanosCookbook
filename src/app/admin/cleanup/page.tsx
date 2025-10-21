'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function AdminCleanupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    removed?: number;
    duplicates?: Array<{ title: string; count: number }>;
    error?: string;
  } | null>(null);

  const handleRemoveDuplicates = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST',
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove duplicates'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Admin: Database Cleanup</h1>

      <Card>
        <CardHeader>
          <CardTitle>Remove Duplicate Recipes</CardTitle>
          <CardDescription>
            This tool will scan your database for duplicate recipes (based on title) and remove them.
            The oldest recipe will be kept, and newer duplicates will be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleRemoveDuplicates}
            disabled={isLoading}
            variant="destructive"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning & Removing...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Duplicate Recipes
              </>
            )}
          </Button>

          {result && (
            <div className="mt-6">
              {result.success ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Success!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {result.removed === 0 ? (
                      <p>No duplicate recipes found. Your database is clean! ✨</p>
                    ) : (
                      <div>
                        <p className="mb-2">
                          Successfully removed <strong>{result.removed}</strong> duplicate recipe(s).
                        </p>
                        {result.duplicates && result.duplicates.length > 0 && (
                          <div className="mt-3">
                            <p className="font-semibold mb-1">Cleaned up:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {result.duplicates.map((dup, index) => (
                                <li key={index}>
                                  <strong>{dup.title}</strong> - removed {dup.count} duplicate(s)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {result.error || 'Failed to remove duplicates'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Scans all recipes in the database</li>
            <li>Groups recipes by title (case-insensitive)</li>
            <li>Identifies groups with multiple recipes (duplicates)</li>
            <li>Keeps the oldest recipe in each group</li>
            <li>Deletes all newer duplicates</li>
            <li>Reports the results with details of what was removed</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
