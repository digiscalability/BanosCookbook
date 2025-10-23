'use client';
import { useEffect, useState } from 'react';

import { generateAndSaveVideoScriptForRecipe } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getAllRecipes } from '@/lib/firestore-recipes';
import { fetchAllVideoScripts } from '@/lib/firestore-video-scripts';
import { Recipe } from '@/lib/types';

interface VideoScriptDoc {
  recipeId: string;
  script: string;
  marketingIdeas?: string[];
}

export default function RecipeListModal() {
  const [open, setOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [videoScripts, setVideoScripts] = useState<VideoScriptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 5;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getAllRecipes(), fetchAllVideoScripts()]).then(([recipes, scripts]) => {
      setRecipes(recipes);
      setVideoScripts(scripts);
      setLoading(false);
      setPage(0); // Reset to first page on open
    });
  }, [open]);

  // Map recipeId to script object
  const scriptMap = new Map(videoScripts.map(vs => [vs.recipeId, vs]));
  const totalPages = Math.ceil(recipes.length / PAGE_SIZE);
  const paginatedRecipes = recipes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="btn btn-primary mb-4">Browse All Recipes</button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle>All Recipes</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {/* If you see 'script: ""', your Gemini model or API key is misconfigured. */}
            <pre className="mb-2 max-h-32 overflow-auto rounded bg-muted/30 p-2 text-xs">
              {JSON.stringify(videoScripts, null, 2)}
            </pre>
            <div className="max-h-[60vh] overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-left">Author</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecipes.map(recipe => (
                    <RecipeRow
                      key={recipe.id}
                      recipe={recipe}
                      script={scriptMap.get(recipe.id)}
                      onScriptCreated={() => {
                        fetchAllVideoScripts().then(setVideoScripts);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

type RecipeRowProps = {
  recipe: Recipe;
  script?: VideoScriptDoc;
  onScriptCreated: () => void;
};

function RecipeRow({ recipe, script, onScriptCreated }: RecipeRowProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await generateAndSaveVideoScriptForRecipe(recipe.id);
      if (res.success) {
        setSuccess(true);
        onScriptCreated();
      } else {
        setError(res.error || 'Unknown error');
      }
    } catch (e) {
      setError((e as Error).message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b align-top last:border-b-0">
      <td className="p-2 font-medium">{recipe.title}</td>
      <td className="p-2">{recipe.author}</td>
      <td className="p-2">
        {script ? (
          <span className="font-semibold text-green-600">Script Ready</span>
        ) : (
          <span className="font-semibold text-yellow-600">Ready for Script</span>
        )}
      </td>
      <td className="p-2">
        {script && script.script && script.script.trim() !== '' ? (
          <div className="flex flex-col gap-2">
            <pre className="max-h-32 max-w-xs overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs">
              {script.script}
            </pre>
            {script.marketingIdeas && script.marketingIdeas.length > 0 && (
              <div className="text-xs">
                <div className="mb-1 font-semibold text-primary">Marketing Ideas:</div>
                <ul className="list-inside list-disc">
                  {script.marketingIdeas.map((idea: string, idx: number) => (
                    <li key={idx}>{idea}</li>
                  ))}
                </ul>
              </div>
            )}
            <button className="btn btn-accent" disabled>
              Send for Video Creation (Coming Soon)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs text-yellow-700">
              No script generated yet or model misconfigured.
            </span>
            <button className="btn btn-accent" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Video Script'}
            </button>
            {success && <span className="text-green-600">✓</span>}
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        )}
      </td>
    </tr>
  );
}
