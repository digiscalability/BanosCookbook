'use client';

/**
 * /admin/ingest — add Ammi's recipes from her book, from a phone.
 *
 *  1. "New recipe": photograph a page (or pick an uploaded book page), let the model
 *     draft it, correct the draft, then save as draft or publish.
 *  2. "Attach scan": give one of the existing recipes its book page, which is what
 *     makes it eligible for the social queue.
 *
 * Access: middleware + every server action require the admin claim.
 */
import { BookOpen, Camera, CheckCircle2, Loader2, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import {
  attachScanAction,
  draftFromPageAction,
  listIngestDataAction,
  saveIngestedRecipeAction,
  setRecipeStatusAction,
} from './actions';

type IngestData = Extract<Awaited<ReturnType<typeof listIngestDataAction>>, { ok: true }>['data'];
type Scan = { scanPath: string; scanUrl: string; sourcePage?: number; bookPageId?: string };

interface Draft {
  title: string;
  description: string;
  ingredients: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  cuisine: string;
  sourcePage: string;
  tags: string;
}

/** Phone photos are 3-8 MB; shrink in the browser so uploads stay well under 4.5 MB. */
async function shrinkPhoto(file: File, maxEdge = 2000): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'page.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

function PhotoPicker({
  pages,
  photo,
  onPhoto,
  bookPageId,
  onBookPage,
}: {
  pages: IngestData['pages'];
  photo: File | null;
  onPhoto: (f: File | null) => void;
  bookPageId: string;
  onBookPage: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label htmlFor="page-photo" className="flex items-center gap-2">
        <Camera className="h-4 w-4" /> Photo of the page
      </Label>
      <Input
        id="page-photo"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={async e => {
          const f = e.target.files?.[0];
          onBookPage('');
          onPhoto(f ? await shrinkPhoto(f) : null);
        }}
      />
      {photo && (
        <p className="text-xs text-muted-foreground">Ready: {(photo.size / 1024).toFixed(0)} KB</p>
      )}
      {pages.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="book-page">…or an uploaded book page</Label>
          <select
            id="book-page"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={bookPageId}
            onChange={e => {
              onBookPage(e.target.value);
              if (e.target.value) onPhoto(null);
            }}
          >
            <option value="">Choose a page</option>
            {pages.map(p => (
              <option key={p.id} value={p.id}>
                Page {p.page}
                {p.recipeIds.length ? ` (linked to ${p.recipeIds.length})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function IngestPage() {
  const [data, setData] = useState<IngestData | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // New recipe state
  const [photo, setPhoto] = useState<File | null>(null);
  const [bookPageId, setBookPageId] = useState('');
  const [scan, setScan] = useState<Scan | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  // Attach state
  const [attachRecipeId, setAttachRecipeId] = useState('');
  const [attachPhoto, setAttachPhoto] = useState<File | null>(null);
  const [attachPageId, setAttachPageId] = useState('');
  const [attachPage, setAttachPage] = useState('');

  const refresh = useCallback(async () => {
    const res = await listIngestDataAction();
    if (res.ok) setData(res.data);
    else setMessage({ kind: 'error', text: res.error });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const readPage = () =>
    run(async () => {
      const form = new FormData();
      if (bookPageId) form.set('bookPageId', bookPageId);
      else if (photo) form.set('photo', photo);
      const res = await draftFromPageAction(form);
      if (!res.ok) throw new Error(res.error);
      const d = res.data.draft;
      setScan(res.data.scan);
      setDraft({
        title: d.title ?? '',
        description: d.description ?? '',
        ingredients: d.ingredients ?? '',
        instructions: d.instructions ?? '',
        prepTime: d.prepTime ?? '',
        cookTime: d.cookTime ?? '',
        servings: d.servings ? String(d.servings) : '',
        cuisine: d.cuisine || 'Pakistani',
        sourcePage: res.data.scan.sourcePage ? String(res.data.scan.sourcePage) : '',
        tags: '',
      });
    });

  const save = (status: 'draft' | 'published') =>
    run(async () => {
      if (!draft) return;
      const res = await saveIngestedRecipeAction({
        status,
        scan: scan ?? undefined,
        recipe: {
          title: draft.title.trim(),
          description: draft.description.trim(),
          ingredients: draft.ingredients,
          instructions: draft.instructions,
          prepTime: draft.prepTime.trim(),
          cookTime: draft.cookTime.trim(),
          servings: draft.servings ? Number(draft.servings) : 0,
          cuisine: draft.cuisine.trim(),
          tags: draft.tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
          sourcePage: draft.sourcePage ? Number(draft.sourcePage) : undefined,
        },
      });
      if (!res.ok) throw new Error(res.error);
      setMessage({
        kind: 'ok',
        text:
          status === 'published'
            ? `Published: /recipes/${res.data.id}`
            : `Saved as draft (${res.data.id})`,
      });
      setDraft(null);
      setScan(null);
      setPhoto(null);
      setBookPageId('');
      await refresh();
    });

  const attach = () =>
    run(async () => {
      const form = new FormData();
      form.set('recipeId', attachRecipeId);
      if (attachPage) form.set('sourcePage', attachPage);
      if (attachPageId) form.set('bookPageId', attachPageId);
      else if (attachPhoto) form.set('photo', attachPhoto);
      const res = await attachScanAction(form);
      if (!res.ok) throw new Error(res.error);
      setMessage({ kind: 'ok', text: 'Scan attached.' });
      setAttachPhoto(null);
      setAttachPageId('');
      setAttachPage('');
      await refresh();
    });

  const setStatus = (id: string, status: 'published' | 'hidden') =>
    run(async () => {
      const res = await setRecipeStatusAction(id, status);
      if (!res.ok) throw new Error(res.error);
      await refresh();
    });

  const field = (key: keyof Draft, label: string, opts: { area?: boolean; type?: string } = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`draft-${key}`}>{label}</Label>
      {opts.area ? (
        <Textarea
          id={`draft-${key}`}
          rows={key === 'description' ? 3 : 8}
          value={draft?.[key] ?? ''}
          onChange={e => setDraft(d => (d ? { ...d, [key]: e.target.value } : d))}
        />
      ) : (
        <Input
          id={`draft-${key}`}
          type={opts.type ?? 'text'}
          inputMode={opts.type === 'number' ? 'numeric' : undefined}
          value={draft?.[key] ?? ''}
          onChange={e => setDraft(d => (d ? { ...d, [key]: e.target.value } : d))}
        />
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="mb-1 flex items-center gap-2 font-headline text-2xl">
        <BookOpen className="h-6 w-6" /> Ammi&apos;s book
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Add recipes from MonAsal (Bana) and attach their scanned pages.
      </p>

      {message && (
        <div
          role="status"
          className={`mb-4 rounded-md border p-3 text-sm ${
            message.kind === 'ok'
              ? 'border-green-300 bg-green-50 text-green-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          {message.text}
        </div>
      )}

      <Tabs defaultValue="new">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new">New recipe</TabsTrigger>
          <TabsTrigger value="attach">Attach scan</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Read a page</CardTitle>
              <CardDescription>
                The model drafts the recipe; you check every line before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PhotoPicker
                pages={data?.pages ?? []}
                photo={photo}
                onPhoto={setPhoto}
                bookPageId={bookPageId}
                onBookPage={setBookPageId}
              />
              <Button
                className="h-12 w-full"
                disabled={busy || (!photo && !bookPageId)}
                onClick={readPage}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Read page
              </Button>
            </CardContent>
          </Card>

          {draft && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Review</CardTitle>
                <CardDescription>Author is Shahar Bano; source is the book.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scan?.scanUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scan.scanUrl}
                    alt="Scanned page"
                    className="max-h-80 w-full rounded-md object-contain"
                  />
                )}
                {field('title', 'Title')}
                {field('description', 'Description', { area: true })}
                {field('ingredients', 'Ingredients (one per line)', { area: true })}
                {field('instructions', 'Instructions (one step per line)', { area: true })}
                <div className="grid grid-cols-2 gap-3">
                  {field('prepTime', 'Prep time')}
                  {field('cookTime', 'Cook time')}
                  {field('servings', 'Servings', { type: 'number' })}
                  {field('sourcePage', 'Book page (needed with a scan)', { type: 'number' })}
                </div>
                {field('cuisine', 'Cuisine')}
                {field('tags', 'Tags (comma separated)')}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="h-12"
                    disabled={busy}
                    onClick={() => save('draft')}
                  >
                    Save draft
                  </Button>
                  <Button
                    className="h-12"
                    disabled={busy || draft.title.trim().length < 3}
                    onClick={() => save('published')}
                  >
                    Publish
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attach" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attach a page to a recipe</CardTitle>
              <CardDescription>
                A published recipe with its page becomes eligible for the daily social posts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="attach-recipe">Recipe</Label>
                <select
                  id="attach-recipe"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={attachRecipeId}
                  onChange={e => setAttachRecipeId(e.target.value)}
                >
                  <option value="">Choose a recipe</option>
                  {(data?.recipes ?? []).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} {r.scanUrl ? '✓ scan' : '· no scan'}
                    </option>
                  ))}
                </select>
              </div>
              <PhotoPicker
                pages={data?.pages ?? []}
                photo={attachPhoto}
                onPhoto={setAttachPhoto}
                bookPageId={attachPageId}
                onBookPage={setAttachPageId}
              />
              <div className="space-y-1">
                <Label htmlFor="attach-page">Book page number</Label>
                <Input
                  id="attach-page"
                  type="number"
                  inputMode="numeric"
                  value={attachPage}
                  onChange={e => setAttachPage(e.target.value)}
                />
              </div>
              <Button
                className="h-12 w-full"
                disabled={busy || !attachRecipeId || (!attachPageId && (!attachPhoto || !attachPage))}
                onClick={attach}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Attach scan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ammi&apos;s recipes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!data && <Loader2 className="h-5 w-5 animate-spin" />}
              {data?.recipes.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={r.status === 'published' ? 'default' : 'secondary'}>
                        {r.status ?? 'no status'}
                      </Badge>
                      <Badge variant="outline">
                        {r.scanUrl ? `page ${r.sourcePage ?? '?'}` : 'no scan'}
                      </Badge>
                      {r.socialEligible && <Badge variant="outline">social ✓</Badge>}
                    </div>
                  </div>
                  {r.status === 'published' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setStatus(r.id, 'hidden')}
                    >
                      Hide
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setStatus(r.id, 'published')}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
