#!/usr/bin/env node
/**
 * Simple cleanup script to remove generated images older than a threshold.
 * Usage: node scripts/cleanup-generated-images.js --days=7
 * It will read the FIREBASE_SERVICE_ACCOUNT_JSON or use ADC if available.
 */

const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { days: 30, dryRun: true };
  for (const a of args) {
    if (a.startsWith('--days=')) out.days = Number(a.split('=')[1]) || out.days;
    if (a === '--dryRun=false' || a === '--dryRun=false') out.dryRun = false;
    if (a === '--dryRun' || a === '--dryRun=true') out.dryRun = true;
  }
  return out;
}

async function main() {
  const { days, dryRun } = parseArgs();

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (saJson) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(saJson)),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } catch (err) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', err);
      process.exit(1);
    }
  } else {
    try {
      admin.initializeApp();
    } catch (err) {
      console.error('Failed to initialize Firebase Admin:', err);
      process.exit(1);
    }
  }

  const db = admin.firestore();
  const bucketObj = admin.storage ? admin.storage().bucket() : null;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || (bucketObj && bucketObj.name);
  if (!bucketName) {
    console.error('No storage bucket configured. Set FIREBASE_STORAGE_BUCKET env var.');
    process.exit(1);
  }

  const bucket = admin.storage().bucket(bucketName);

  const now = new Date();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`Scanning generatedImages Firestore collection for documents with expiresAt < now or uploadedAt < cutoff (${cutoff.toISOString()})`);

  // Query 1: documents with explicit expiresAt less than now
  const q1 = await db.collection('generatedImages').where('expiresAt', '<', now).get();
  // Query 2: documents with uploadedAt older than cutoff (fallback for older entries)
  const q2 = await db.collection('generatedImages').where('uploadedAt', '<', cutoff).get();

  const docsMap = new Map();
  for (const d of q1.docs) docsMap.set(d.id, d);
  for (const d of q2.docs) docsMap.set(d.id, d);

  console.log(`Found ${docsMap.size} documents to consider for deletion.`);

  for (const [id, doc] of docsMap.entries()) {
    const data = doc.data();
    const path = data.storagePath;
    if (!path) {
      console.log(`Doc ${id} has no storagePath, skipping`);
      continue;
    }

    console.log(`${id}: ${path}`);
    if (!dryRun) {
      try {
        await bucket.file(path).delete();
        await doc.ref.delete();
        console.log(`Deleted ${path} and Firestore doc ${id}`);
      } catch (err) {
        console.error(`Failed to delete ${path}:`, err);
      }
    }
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Cleanup script failed:', err);
  process.exit(1);
});
