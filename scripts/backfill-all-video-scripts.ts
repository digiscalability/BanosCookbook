// Backfill all missing video scripts for recipes in Firestore (TypeScript, run with npx tsx)
import dotenv from 'dotenv';
import adminConfig from '../config/firebase-admin';
import { getRecipeById } from '../src/lib/firestore-recipes';
import { generateVideoScriptWithGemini } from '../src/lib/gemini-video-script';
import { Recipe } from '../src/lib/types';
dotenv.config({ path: require('path').resolve(__dirname, '../.env.local') });

async function main() {
  const db = adminConfig.getDb();
  // Get all recipes
  const recipesSnap = await db.collection('recipes').get();
  const allRecipes: Recipe[] = recipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
  // Get all video scripts
  const scriptsSnap = await db.collection('video_scripts').get();
  const allScripts = new Map(scriptsSnap.docs.map(doc => [doc.id, doc.data()]));
  // Find missing or empty scripts
  const missing = allRecipes.filter(r => {
    const scriptDoc = allScripts.get(r.id);
    return !scriptDoc || !scriptDoc.script || !scriptDoc.script.trim();
  });
  console.log(`Found ${missing.length} recipes missing scripts.`);
  for (const recipe of missing) {
    try {
      // Use API-based fetch for normalized data
      const fullRecipe = await getRecipeById(recipe.id);
      if (!fullRecipe) {
        console.warn(`Recipe not found: ${recipe.id}`);
        continue;
      }
      const input = {
        title: fullRecipe.title ?? '(Untitled)',
        description: fullRecipe.description ?? '',
        ingredients: Array.isArray(fullRecipe.ingredients) ? fullRecipe.ingredients : [],
        instructions: Array.isArray(fullRecipe.instructions) ? fullRecipe.instructions : [],
        cuisine: fullRecipe.cuisine ?? '',
      };
      const { script, marketingIdeas } = await generateVideoScriptWithGemini(input);
      if (!script || !script.trim()) {
        console.warn(`No script generated for recipe ${recipe.id} (${recipe.title ?? ''})`);
        continue;
      }
      await db.collection('video_scripts').doc(recipe.id).set({
        recipeId: recipe.id,
        script,
        marketingIdeas: marketingIdeas || [],
        createdAt: adminConfig.getAdmin().firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Backfilled script for recipe ${recipe.id} (${recipe.title ?? ''})`);
    } catch (err) {
      console.error(`Failed to backfill script for recipe ${recipe.id}:`, err);
    }
  }
  console.log('Backfill complete.');
}

main().catch(err => {
  console.error('Fatal error in backfill:', err);
  process.exit(1);
});
