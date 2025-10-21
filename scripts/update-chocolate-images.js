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
  for (const item of parsed.placeholderImages || []) {
    map[item.id] = item;
  }
  return map;
}

async function main() {
  const placeholders = loadPlaceholder();
  const chosen = placeholders['2'];
  if (!chosen || !chosen.imageUrl) {
    console.error('Placeholder id 2 not found');
    process.exit(1);
  }
  const stableUrl = chosen.imageUrl;
  console.log('Stable chocolate image URL:', stableUrl);

  const db = getDb();

  const targets = [
    'CAYoLFwtvMRkcz16PMUN', // existing source.unsplash dynamic URL
    'fPCwQArnmzzwIak0OJ0R', // wrong image (id 3)
  ];

  for (const id of targets) {
    try {
      const docRef = db.collection('recipes').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        console.warn(`Doc ${id} does not exist, skipping.`);
        continue;
      }
      console.log(`Updating doc ${id} (${doc.data().title}) -> ${stableUrl}`);
      await docRef.update({ imageId: stableUrl });
    } catch (err) {
      console.error(`Failed to update ${id}:`, err);
    }
  }

  console.log('Update complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
