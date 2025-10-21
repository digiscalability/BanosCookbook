#!/usr/bin/env node
/**
 * Direct test runner that imports generateRecipeImagesAction from server actions
 * and invokes it in-process. This bypasses HTTP and works within the project environment.
 */

(async () => {
  try {
    const { generateRecipeImagesAction } = require('../src/app/actions');

    const recipeData = {
      title: 'Chocolate Cake',
      description: 'Rich and moist chocolate cake with ganache',
      cuisine: 'Dessert',
      ingredients: 'flour\nsugar\nbutter\nchocolate\neggs',
    };

    console.log('Invoking generateRecipeImagesAction directly...');
    const result = await generateRecipeImagesAction(recipeData);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Direct invocation failed:', err);
    process.exitCode = 1;
  }
})();
