#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const adminConfig = require('../config/firebase-admin');
const { getDb } = adminConfig;

function loadPlaceholder() {
  const file = path.join(__dirname, '..', 'src', 'lib', 'placeholder-images.json');
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw);
  const map = {};
  for (const item of parsed.placeholderImages || []) map[item.id] = item;
  return map;
}

async function main() {
  const placeholders = loadPlaceholder();
  const db = getDb();
  const snapshot = await db.collection('recipes').get();
  console.log(`Found ${snapshot.size} recipes.`);
  const updates = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const imageId = data.imageId || '';
    if (typeof imageId === 'string' && imageId.includes('source.unsplash')) {
      updates.push({ id: doc.id, title: data.title || '', imageId });
    }
  });

  console.log(`Found ${updates.length} recipes with source.unsplash URLs.`);
  for (const item of updates) {
    const { id, title } = item;
    const chosen = /chocolate/i.test(title) ? placeholders['2'] || placeholders['1'] : placeholders['1'] || placeholders['2'];
    const stableUrl = chosen && chosen.imageUrl ? chosen.imageUrl : null;
    if (!stableUrl) {
      console.warn(`No stable placeholder for doc ${id}, skipping.`);
      continue;
    }
    console.log(`Updating ${id} (${title}) -> ${stableUrl}`);
    try {
      await db.collection('recipes').doc(id).update({ imageId: stableUrl });
    } catch (err) {
      console.error(`Failed to update ${id}:`, err.message || err);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
