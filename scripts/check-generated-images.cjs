#!/usr/bin/env node
'use strict';

// Quick check script to inspect generated_images collection
try {
  const adminConfig = require('../config/firebase-admin.js');
  const db = adminConfig.getDb();

  (async () => {
    console.log('\n🔎 Checking generated_images collection...');
    const snapshot = await db.collection('generated_images').limit(10).get();
    console.log(`Found ${snapshot.size} documents (first page)`);
    snapshot.forEach((doc, idx) => {
      const data = doc.data();
      console.log(`\n[${idx + 1}] id=${doc.id}`);
      console.log(' recipeTitle:', data.recipeTitle);
      console.log(
        ' url:',
        String(data.url).slice(0, 120) + (String(data.url).length > 120 ? '...' : '')
      );
      console.log(' generatedAt:', data.generatedAt);
      console.log(' originalTooLarge:', data.originalTooLarge || false);
    });
    console.log('\n✅ Quick check finished');
    process.exit(0);
  })().catch(err => {
    console.error('Check failed:', err && err.message ? err.message : err);
    process.exit(2);
  });
} catch (err) {
  console.error('Failed to load firebase-admin config:', err && err.message ? err.message : err);
  process.exit(2);
}
