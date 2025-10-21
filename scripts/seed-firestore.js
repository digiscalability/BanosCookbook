#!/usr/bin/env node
/*
 * Seed the Firestore `recipes` collection with sample content.
 * Uses the Firebase Admin SDK initialization in config/firebase-admin.js.
 */

const fs = require('fs');
const path = require('path');

// Reuse the shared Firebase Admin initializer so env configuration stays in one place.
const adminConfig = require('../config/firebase-admin');

async function seed() {
  const { db, admin } = adminConfig;
  const recipesPath = path.resolve(__dirname, 'sample-recipes.json');

  if (!fs.existsSync(recipesPath)) {
    throw new Error(`Sample data file not found at ${recipesPath}`);
  }

  const raw = fs.readFileSync(recipesPath, 'utf8');
  const recipes = JSON.parse(raw);

  if (!Array.isArray(recipes) || recipes.length === 0) {
    console.log('No recipes found in sample data. Nothing to seed.');
    return;
  }

  const snapshot = await db.collection('recipes').limit(1).get();
  if (!snapshot.empty) {
    console.log('Recipes collection already has documents. Skipping seed.');
    return;
  }

  const batch = db.batch();
  const createdAt = admin.firestore.FieldValue.serverTimestamp();

  recipes.forEach((recipe) => {
    const docRef = db.collection('recipes').doc(recipe.id);
    const {
      comments = [],
      rating = 0,
      ratingCount = 0,
      ...rest
    } = recipe;

    batch.set(docRef, {
      ...rest,
      rating,
      ratingCount,
      comments,
      createdAt,
      updatedAt: createdAt,
    });
  });

  await batch.commit();
  console.log(`Seeded ${recipes.length} recipes into Firestore.`);
}

seed().catch((error) => {
  console.error('Failed to seed Firestore:', error);
  process.exitCode = 1;
});
