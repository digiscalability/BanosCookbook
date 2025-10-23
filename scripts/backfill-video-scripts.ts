// Backfill missing video scripts for recipes in Firestore (TypeScript, run with npx tsx)
import dotenv from 'dotenv';
import adminConfig from '../config/firebase-admin';
import { getRecipeById } from '../src/lib/firestore-recipes';
dotenv.config({ path: require('path').resolve(__dirname, '../.env.local') });

async function main() {
  const db = adminConfig.getDb();
  const recipeId = process.argv[2];
  if (!recipeId) {
    console.error('Usage: npx tsx scripts/backfill-video-scripts.ts <RECIPE_ID>');
    process.exit(1);
  }
  // Use the API-based recipe fetch for normalized data
  const recipe = await getRecipeById(recipeId);
  if (!recipe) {
    console.error(`Recipe not found: ${recipeId}`);
    process.exit(1);
  }
  const scriptDoc = await db.collection('video_scripts').doc(recipeId).get();
  if (scriptDoc.exists && scriptDoc.data()?.script && scriptDoc.data()?.script.trim()) {
    console.log(`Script already exists for recipe ${recipeId} (${recipe.title})`);
    return;
  }
  try {
    const input = {
      title: recipe.title ?? '(Untitled)',
      description: recipe.description ?? '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      cuisine: recipe.cuisine ?? '',
    };
    const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;
    const prompt = `You are a creative short-form video scripter for Instagram and TikTok Reels. Given a recipe, write a catchy, trendy, audience-boosting video script for a 30-60 second video. Include hooks, calls to action, and highlight what makes the recipe unique. Suggest 2-3 marketing ideas or trends to boost engagement. Format the script for easy reading by a video editor or AI video generator.\n\nRecipe Title: ${input.title}\nDescription: ${input.description}\nCuisine: ${input.cuisine}\nIngredients: ${input.ingredients.join(', ')}\nInstructions: ${input.instructions.join(' ')}\n`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data: any = await res.json();
    console.log('Direct Gemini API response:', JSON.stringify(data, null, 2));
    let script = '';
    if (data && Array.isArray(data.candidates) && data.candidates[0]?.content?.parts?.[0]?.text) {
      script = data.candidates[0].content.parts[0].text;
    }
    // Optionally parse marketing ideas from script here if needed
    if (!script || !script.trim()) {
      console.warn(`No script generated for recipe ${recipe.id} (${recipe.title ?? ''})`);
      return;
    }
    await db.collection('video_scripts').doc(recipe.id).set({
      recipeId: recipe.id,
      script,
      marketingIdeas: [],
      createdAt: new Date(),
    });
    console.log(`Backfilled script for recipe ${recipe.id} (${recipe.title ?? ''})`);
  } catch (err) {
    console.error(`Failed to backfill script for recipe ${recipe.id}:`, err);
  }
}

main().catch(err => {
  console.error('Fatal error in backfill:', err);
  process.exit(1);
});
