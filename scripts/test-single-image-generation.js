#!/usr/bin/env node

/**
 * Test AI Image Generation for a Single Recipe
 *
 * This script tests the AI image generation feature by generating images
 * for a specific recipe and showing the results.
 */

require('dotenv').config({ path: '.env.local' });

async function testImageGeneration() {
  console.log('\n🎨 Testing AI Image Generation\n');
  console.log('='.repeat(80));

  // Test with Korean Beef Bibimbap
  const testRecipe = {
    title: 'Korean Beef Bibimbap',
    cuisine: 'Korean',
    ingredients: [
      'beef',
      'rice',
      'carrots',
      'spinach',
      'bean sprouts',
      'egg',
      'gochujang (Korean chili paste)'
    ],
    instructions: 'Traditional Korean rice bowl with marinated beef, assorted vegetables, and egg, served in a hot stone bowl with gochujang sauce'
  };

  console.log(`Testing with recipe: ${testRecipe.title}`);
  console.log(`Cuisine: ${testRecipe.cuisine}`);
  console.log(`Ingredients: ${testRecipe.ingredients.slice(0, 5).join(', ')}`);
  console.log('\n' + '-'.repeat(80));

  try {
    console.log('\n📡 Calling AI image generation action...');

    // Note: In production, this would be called via the Server Action from the browser
    // For testing, we'll call the flow directly
    const { generateRecipeImages } = await import('../src/ai/flows/generate-recipe-images.ts');

    const images = await generateRecipeImages({
      title: testRecipe.title,
      cuisine: testRecipe.cuisine,
      ingredients: testRecipe.ingredients.slice(0, 5),
      instructions: testRecipe.instructions
    });

    console.log(`\n✅ Success! Generated ${images.length} images\n`);

    images.forEach((img, i) => {
      console.log(`Image ${i + 1}:`);
      console.log(`  URL: ${img.url}`);
      console.log(`  Prompt: ${img.prompt.substring(0, 100)}...`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n💡 To use these images:');
    console.log('1. Open the recipe in the browser');
    console.log('2. Copy one of the URLs above');
    console.log('3. Update the recipe imageUrl field in Firestore');
    console.log('\nOr use the bulk generation script to automate this process.\n');

  } catch (error) {
    console.error('\n❌ Error generating images:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testImageGeneration();
