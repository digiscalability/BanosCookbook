#!/usr/bin/env node
const adminConfig = require('../config/firebase-admin');
const { getDb } = adminConfig;

async function main() {
  try {
    const db = getDb();
    const snapshot = await db.collection('recipes').get();
    console.log(`Found ${snapshot.size} recipes:`);
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`- id=${doc.id} title=${data.title} imageId=${data.imageId}`);
    });
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  }
}

main();
