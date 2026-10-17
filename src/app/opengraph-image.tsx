import { renderRecipeCard } from '@/server/og/recipe-card';

export const alt = "Bano's Cookbook: Ammi's recipes";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return renderRecipeCard(null);
}
