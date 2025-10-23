'use client';

import { CheckCircle, Image as ImageIcon, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showNotification } from '@/lib/notify';

interface GeneratedImage {
  id: string;
  url: string;
  description: string;
  style: string;
  recipeTitle: string;
  recipeCuisine: string;
  used: boolean;
  generatedAt: string | null;
  usedAt: string | null;
}

export default function GeneratedImagesPage() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unused'>('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteDays, setPendingDeleteDays] = useState(30);

  const loadImages = async (unusedOnly = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = unusedOnly
        ? '/api/admin/generated-images?unused=true'
        : '/api/admin/generated-images';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setImages(data.images);
      } else {
        setError(data.error || 'Failed to load images');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteOldUnusedImages = async (daysOld = 30) => {
    setPendingDeleteDays(daysOld);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/generated-images?daysOld=${pendingDeleteDays}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        showNotification(data.message || 'Deleted images successfully', 'success');
        loadImages(filter === 'unused');
      } else {
        showNotification('Error: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showNotification(
        'Failed to delete images: ' + (err instanceof Error ? err.message : 'Unknown error'),
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadImages(filter === 'unused');
  }, [filter]);

  const usedImages = images.filter(img => img.used);
  const unusedImages = images.filter(img => !img.used);

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Generated Images Library</h1>
          <p className="mt-1 text-muted-foreground">
            All AI-generated recipe images are saved here to avoid wasting API calls
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => deleteOldUnusedImages(30)}
            disabled={isDeleting}
            variant="destructive"
            size="sm"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Clean Old Unused
              </>
            )}
          </Button>
          <Button
            onClick={() => loadImages(filter === 'unused')}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">All AI-generated images</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Used Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{usedImages.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Selected by users for recipes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unused Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unusedImages.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Available for future use</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={v => setFilter(v as 'all' | 'unused')}>
        <TabsList>
          <TabsTrigger value="all">All Images ({images.length})</TabsTrigger>
          <TabsTrigger value="unused">Unused Only ({unusedImages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ImageGrid images={images} isLoading={isLoading} error={error} />
        </TabsContent>

        <TabsContent value="unused" className="mt-6">
          <ImageGrid images={unusedImages} isLoading={isLoading} error={error} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Old Unused Images</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete unused images older than {pendingDeleteDays} days?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImageGrid({
  images,
  isLoading,
  error,
}: {
  images: GeneratedImage[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (images.length === 0) {
    return (
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertTitle>No Images</AlertTitle>
        <AlertDescription>
          No generated images found. Start creating recipes to generate images!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {images.map(image => (
        <Card key={image.id} className="overflow-hidden">
          <div className="relative aspect-square bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={image.description}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute right-2 top-2">
              {image.used ? (
                <Badge className="bg-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Used
                </Badge>
              ) : (
                <Badge variant="secondary">Unused</Badge>
              )}
            </div>
          </div>
          <CardContent className="p-3">
            <h3 className="truncate text-sm font-semibold" title={image.recipeTitle}>
              {image.recipeTitle}
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground" title={image.description}>
              {image.description}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {image.recipeCuisine}
              </Badge>
              {image.generatedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(image.generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
