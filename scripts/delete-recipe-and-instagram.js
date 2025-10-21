#!/usr/bin/env node
/**
 * Delete a recipe document and any associated instagram_posts entries.
 * Usage: node scripts/delete-recipe-and-instagram.js <RECIPE_ID>
 */

require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');

async function main() {
  const recipeId = process.argv[2];
  if (!recipeId) {
    console.error('Usage: node scripts/delete-recipe-and-instagram.js <RECIPE_ID>');
    process.exit(1);
  }

  try {
    const db = adminConfig.getDb();

    // Delete recipe document if it exists
    const recipeRef = db.collection('recipes').doc(recipeId);
    const recipeSnap = await recipeRef.get();
    if (recipeSnap.exists) {
      await recipeRef.delete();
      console.log(`Deleted recipe ${recipeId}`);
    } else {
      console.log(`Recipe ${recipeId} not found (skipped)`);
    }

    // Delete any instagram_posts entries referencing this recipe
    const igSnap = await db.collection('instagram_posts').where('recipeId', '==', recipeId).get();
    if (igSnap.empty) {
      console.log('No instagram_posts documents to delete');
    } else {
      const deletions = igSnap.docs.map((doc) => doc.ref.delete());
      await Promise.all(deletions);
      console.log(`Deleted ${igSnap.size} instagram_posts document(s)`);
    }

    console.log('Cleanup complete');
  } catch (err) {
    console.error('Cleanup failed:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
