#!/usr/bin/env node
/*
  Script: fix-source-unsplash-images.js
  Purpose: Find recipe documents whose imageId contains a dynamic source.unsplash.com URL
           (or other unstable Unsplash redirects) and replace with a stable images.unsplash.com
           URL from `src/lib/placeholder-images.json`.

  Usage:
    - Ensure you have local credentials available (set GOOGLE_APPLICATION_CREDENTIALS to the
      service account JSON path, or set FIREBASE_SERVICE_ACCOUNT_JSON env with the stringified JSON).
    - Run: node scripts/fix-source-unsplash-images.js

  The script will:
    - Load Firestore via config/firebase-admin.js
    - Query `recipes` collection for documents where imageId contains 'source.unsplash.com' or 'source.unsplash'
    - For recipes with 'chocolate' in the title, set a stable chocolate-cake placeholder URL
      (from src/lib/placeholder-images.json id '2'). Otherwise, set to placeholder id '1'.
    - Log changes and perform updates.
*/

const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const adminConfig = require('../config/firebase-admin');
const { getDb } = adminConfig;

async function isUrlGood(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', timeout: 10000 });
    return res.ok;
  } catch (err) {
    return false;
  }
}

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
  console.log('Starting fix-source-unsplash-images...');
  const placeholders = loadPlaceholder();
  const db = getDb();

  const snapshot = await db.collection('recipes').get();
  console.log(`Found ${snapshot.size} recipe documents.`);

  const toUpdate = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const imageId = data.imageId || '';
    if (typeof imageId === 'string' && imageId.includes('source.unsplash.com')) {
      toUpdate.push({ id: doc.id, title: data.title || '', imageId });
    }
  });

  console.log(`Recipes with dynamic source.unsplash URLs: ${toUpdate.length}`);

  for (const item of toUpdate) {
    const { id, title, imageId } = item;
    console.log(`Checking doc ${id} (${title}) -> ${imageId}`);

    // Choose a stable placeholder - use chocolate cake image for titles containing 'chocolate'
    const chosen = /chocolate/i.test(title) ? (placeholders['2'] || placeholders['1']) : (placeholders['1'] || placeholders['2']);
    const stableUrl = chosen && chosen.imageUrl ? chosen.imageUrl : null;

    if (!stableUrl) {
      console.warn(`No stable placeholder available for doc ${id}, skipping.`);
      continue;
    }

    const ok = await isUrlGood(stableUrl);
    if (!ok) {
      console.warn(`Stable URL ${stableUrl} is not reachable for doc ${id}, skipping.`);
      continue;
    }

    console.log(`Updating doc ${id}: setting imageId -> ${stableUrl}`);
    await db.collection('recipes').doc(id).update({ imageId: stableUrl });
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Error in script:', err);
  process.exit(1);
});
