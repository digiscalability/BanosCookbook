import { renderRecipeCard } from '@/server/og/recipe-card';
import { getPublishedRecipeCached } from '@/server/recipes/read-recipes';

export const alt = "A recipe from Bano's Cookbook";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getPublishedRecipeCached(id).catch(() => null);
  return renderRecipeCard(recipe);
}
