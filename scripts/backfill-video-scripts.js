// Backfill missing video scripts for recipes in Firestore
// Usage: node scripts/backfill-video-scripts.js

const adminConfig = require('../config/firebase-admin');
const { getDb } = adminConfig;
const { generateVideoScriptFlow } = require('../dist/ai/flows/generate-video-script');

async function main() {
  const db = getDb();
  const recipesSnap = await db.collection('recipes').get();
  const scriptsSnap = await db.collection('video_scripts').get();

  const allRecipes = recipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const allScripts = new Map(scriptsSnap.docs.map(doc => [doc.id, doc.data()]));

  const missing = allRecipes.filter(r => {
    const scriptDoc = allScripts.get(r.id);
    return !scriptDoc || !scriptDoc.script || !scriptDoc.script.trim();
  });

  console.log(`Found ${missing.length} recipes missing scripts.`);
  for (const recipe of missing) {
    try {
      const input = {
        title: recipe.title,
        description: recipe.description || '',
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        cuisine: recipe.cuisine || '',
      };
      const { script, marketingIdeas } = await generateVideoScriptFlow(input);
      if (!script || !script.trim()) {
        console.warn(`No script generated for recipe ${recipe.id} (${recipe.title})`);
        continue;
      }
      await db.collection('video_scripts').doc(recipe.id).set({
        recipeId: recipe.id,
        script,
        marketingIdeas: marketingIdeas || [],
        createdAt: adminConfig.getAdmin().firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Backfilled script for recipe ${recipe.id} (${recipe.title})`);
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
