#!/usr/bin/env node
/**
 * Quick test to initialize Firestore using config/firebase-admin.js
 * Usage: node scripts/test-firestore-init.js
 */

require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');

async function main() {
  try {
    const { getDb } = adminConfig;
    const db = getDb();
    const collections = await db.listCollections();
    console.log('Firestore initialized. Listing collections (top-level):');
    console.log(collections.map(c => c.id).slice(0, 20));
  } catch (err) {
    console.error('Firestore init failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
