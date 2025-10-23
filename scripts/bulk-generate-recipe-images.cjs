#!/usr/bin/env node

/**
 * Bulk Generate Recipe Images Script
 *
 * This script automatically generates AI images for all recipes that are using
 * placeholder or external images. It uses the existing Genkit AI flow to generate
 * cuisine-appropriate images for each recipe.
 *
 * Usage:
 *   node scripts/bulk-generate-recipe-images.cjs [options]
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --limit=N    Only process N recipes (for testing)
 *   --force      Regenerate images even for recipes that already have AI images
 */

require('dotenv/config');

// Set up ts-node for TypeScript compilation
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  esModuleInterop: true,
  allowSyntheticDefaultImports: true
});

// Register ts-node to handle .ts files
require('ts-node/register');
require('tsconfig-paths/register');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

async function main() {
  console.log('\n🎨 Bulk Recipe Image Generation Script\n');
  console.log('='.repeat(80));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (limit) {
    console.log(`📊 Processing limit: ${limit} recipes\n`);
  }

  // Load Firebase Admin
  const adminModule = require('../config/firebase-admin.js');
  const { getDb } = adminModule;
  const db = getDb();

  console.log('✅ Firebase Admin initialized\n');

  // Fetch all recipes
  const recipesRef = db.collection('recipes').orderBy('createdAt', 'desc');
  const snapshot = limit ? await recipesRef.limit(limit).get() : await recipesRef.get();

  console.log(`📋 Found ${snapshot.docs.length} recipes\n`);
  console.log('='.repeat(80));

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const results = [];

  for (const doc of snapshot.docs) {
    const recipe = doc.data();
    const recipeId = doc.id;

    console.log(`\n🍽️  Processing: ${recipe.title}`);
    console.log(`   ID: ${recipeId}`);
    console.log(`   Cuisine: ${recipe.cuisine || 'Not specified'}`);

    // Check if recipe needs new image
    let needsImage = false;
    let reason = '';

    if (!recipe.imageUrl && !recipe.imageId) {
      needsImage = true;
      reason = 'No image set';
    } else if (recipe.imageId && !recipe.imageUrl) {
      needsImage = true;
      reason = 'Using placeholder image';
    } else if (recipe.imageUrl && !recipe.imageUrl.includes('firebasestorage.googleapis.com')) {
      needsImage = true;
      reason = 'Using external/stock image';
    } else if (force && recipe.imageUrl) {
      needsImage = true;
      reason = 'Force regenerate';
    }

    if (!needsImage) {
      console.log(`   ✅ Already has AI-generated image - Skipping`);
      skippedCount++;
      continue;
    }

    console.log(`   ⚠️  Needs new image: ${reason}`);

    if (dryRun) {
      console.log(`   🔍 [DRY RUN] Would generate AI image for this recipe`);
      processedCount++;
      results.push({
        id: recipeId,
        title: recipe.title,
        cuisine: recipe.cuisine,
        action: 'would_generate',
        reason
      });
      continue;
    }

    try {
      // Generate AI images using the Genkit flow
      console.log(`   🎨 Generating AI images...`);

      // Import the generateRecipeImages action from TypeScript using require
      const actionsModule = require('../src/app/actions.ts');
      const { generateRecipeImagesAction } = actionsModule;

      const result = await generateRecipeImagesAction({
        title: recipe.title,
        description: recipe.description || recipe.title,
        cuisine: recipe.cuisine || 'International',
        ingredients: Array.isArray(recipe.ingredients)
          ? recipe.ingredients.slice(0, 5).join('\n')
          : (recipe.ingredients || ''),
      });

      if (!result.success || !result.data?.images || result.data.images.length === 0) {
        throw new Error(result.error || 'No images generated');
      }

      console.log(`   ✨ Generated ${result.data.images.length} image options`);

      // Use the first generated image
      const selectedImage = result.data.images[0];
      const imageUrl = selectedImage.url.substring(0, 60) + '...';
      console.log(`   📸 Selected image: ${imageUrl}`);

      // Update the recipe in Firestore
      await doc.ref.update({
        imageUrl: selectedImage.url,
        imageId: null, // Clear placeholder
        updatedAt: new Date()
      });

      console.log(`   ✅ Recipe updated successfully`);

      processedCount++;
      results.push({
        id: recipeId,
        title: recipe.title,
        cuisine: recipe.cuisine,
        action: 'generated',
        imageUrl: selectedImage.url
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Error generating image: ${error.message}`);
      errorCount++;
      results.push({
        id: recipeId,
        title: recipe.title,
        cuisine: recipe.cuisine,
        action: 'error',
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY\n');
  console.log(`Total Recipes Scanned: ${snapshot.docs.length}`);
  console.log(`✨ Images Generated: ${processedCount}`);
  console.log(`✅ Skipped (Already have AI images): ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (dryRun) {
    console.log('\n🔍 This was a DRY RUN - No changes were made');
    console.log('Run without --dry-run to actually generate images');
  }

  console.log('\n' + '='.repeat(80));

  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
