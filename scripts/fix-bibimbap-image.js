#!/usr/bin/env node

/**
 * Quick fix script to generate AI image for Korean Beef Bibimbap
 * This tests the image generation before running bulk updates
 */

require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');

async function fixBibimbapImage() {
  console.log('\n🎨 Fixing Korean Beef Bibimbap Image\n');
  console.log('='.repeat(80));

  try {
    const { getDb } = adminConfig;
    const db = getDb();

    // Find the Korean Beef Bibimbap recipe
    const recipesRef = db.collection('recipes');
    const snapshot = await recipesRef.where('title', '==', 'Korean Beef Bibimbap').get();

    if (snapshot.empty) {
      console.log('❌ Recipe not found!');
      process.exit(1);
    }

    const doc = snapshot.docs[0];
    const recipe = doc.data();
    const recipeId = doc.id;

    console.log(`✅ Found recipe: ${recipe.title}`);
    console.log(`   ID: ${recipeId}`);
    console.log(`   Cuisine: ${recipe.cuisine}`);
    console.log(`   Current image: ${recipe.imageUrl || 'Placeholder #' + recipe.imageId}`);
    console.log('\n' + '-'.repeat(80));

    console.log('\n🎨 Generating AI images...');
    console.log('   This will take 10-20 seconds...\n');

    // Call the Genkit flow directly
    const { generateRecipeImages } = await import('../src/ai/flows/generate-recipe-images.ts');

    const images = await generateRecipeImages({
      title: recipe.title,
      cuisine: recipe.cuisine,
      ingredients: recipe.ingredients?.slice(0, 5) || [],
      instructions: recipe.instructions?.[0] || 'Traditional Korean rice bowl'
    });

    if (!images || images.length === 0) {
      console.log('❌ No images generated!');
      process.exit(1);
    }

    console.log(`✨ Generated ${images.length} image options:\n`);

    images.forEach((img, i) => {
      console.log(`${i + 1}. ${img.url.substring(0, 80)}...`);
      console.log(`   Prompt: ${img.prompt.substring(0, 100)}...`);
      console.log('');
    });

    // Use the first image
    const selectedImage = images[0];

    console.log('-'.repeat(80));
    console.log('\n📸 Updating recipe with first generated image...');

    await doc.ref.update({
      imageUrl: selectedImage.url,
      imageId: null, // Clear placeholder
      updatedAt: new Date()
    });

    console.log('✅ Recipe updated successfully!\n');
    console.log('🌐 View the updated recipe at:');
    console.log(`   http://localhost:9002/recipes/${recipeId}`);
    console.log('\n📋 Check the homepage to see the new image:');
    console.log('   http://localhost:9002/\n');
    console.log('='.repeat(80));

    console.log('\n💡 If the image looks good, run the bulk script for all recipes:');
    console.log('   node scripts/bulk-generate-recipe-images.js --dry-run');
    console.log('   node scripts/bulk-generate-recipe-images.js\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixBibimbapImage();
