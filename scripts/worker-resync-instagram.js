#!/usr/bin/env node
/**
 * Long-running worker that periodically runs the Instagram resync.
 * Use a simple Firestore lease/document to ensure only one instance performs the work.
 * Run with: node scripts/worker-resync-instagram.js
 */

require('dotenv').config({ path: '.env.local' });
// If a service account JSON is provided via FIREBASE_SERVICE_ACCOUNT_JSON, write it to a temp file
// and set GOOGLE_APPLICATION_CREDENTIALS so firebase-admin can pick it up.
const fs = require('fs');
const os = require('os');
const path = require('path');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const tmpDir = os.tmpdir();
    const saPath = path.join(tmpDir, `firebase-sa-${Date.now()}.json`);
    fs.writeFileSync(saPath, process.env.FIREBASE_SERVICE_ACCOUNT_JSON, { encoding: 'utf8', flag: 'w' });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
    // Log the path and a masked preview (do not log full secret)
    const preview = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).slice(0, 16).replace(/\s+/g, ' ');
    console.log('Wrote FIREBASE_SERVICE_ACCOUNT_JSON to temporary file for credentials:', saPath);
    console.log('DEBUG: FIREBASE_SERVICE_ACCOUNT_JSON preview:', preview + '...');
  } catch (err) {
    console.error('Failed to write FIREBASE_SERVICE_ACCOUNT_JSON to temp file:', err instanceof Error ? err.message : err);
  }
}

const adminConfig = require('../config/firebase-admin');
const { execFile } = require('child_process');
const resyncScript = path.join(__dirname, 'resync-all-instagram-posts.js');

function runResyncScript() {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [resyncScript], { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        console.error('resync script error:', error, stderr);
        return reject(error);
      }
      try {
        console.log('resync script output:', stdout);
      } catch {}
      resolve(stdout);
    });
  });
}

const LEASE_DOC = 'resync_worker/lease';
const INTERVAL_MS = (process.env.RESYNC_INTERVAL_MINUTES ? Number(process.env.RESYNC_INTERVAL_MINUTES) : 5) * 60 * 1000; // default 5 minutes
const LEASE_TTL_MS = INTERVAL_MS * 0.8; // lease considered expired after 80% of interval

async function tryAcquireLease(db) {
  const leaseRef = db.doc(LEASE_DOC);
  const now = Date.now();
  try {
    // Use a transaction to avoid a race condition where two workers read the
    // lease at the same time and both attempt to set it.
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(leaseRef);
      if (!snap.exists) {
        tx.set(leaseRef, { owner: process.pid, acquiredAt: now });
        return true;
      }
      const data = snap.data();
      const acquiredAt = data?.acquiredAt || 0;
      if (now - acquiredAt > LEASE_TTL_MS) {
        // lease expired - take it
        tx.set(leaseRef, { owner: process.pid, acquiredAt: now });
        return true;
      }
      return false; // someone else holds it
    });
    return Boolean(result);
  } catch (err) {
    console.error('Lease acquire error', err instanceof Error ? err.message : err);
    return false;
  }
}

async function runLoop() {
  const { getDb } = adminConfig;
  // Diagnostic: log credential env and file existence to help debug auth problems
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log('DEBUG: GOOGLE_APPLICATION_CREDENTIALS=', credPath);
  try {
    if (credPath) {
      const exists = require('fs').existsSync(credPath);
      console.log('DEBUG: credentials file exists=', exists, credPath);
    }
  } catch (e) {
    console.warn('DEBUG: could not stat credentials file', e instanceof Error ? e.message : e);
  }

  // Try to initialize Firestore once and report any auth errors early
  let db;
  try {
    db = getDb();
    console.log('DEBUG: Firestore initialized successfully');
  } catch (err) {
    console.error('ERROR: Firestore initialization failed:', err instanceof Error ? err.message : err);
    // If running once for debug, surface error and exit
    if (process.argv.includes('--once')) {
      process.exit(1);
    }
    // Otherwise wait and retry on next iteration
  }

  console.log('Resync worker started. Interval (ms):', INTERVAL_MS);

  while (true) {
    try {
  const acquired = db ? await tryAcquireLease(db) : false;
      if (acquired) {
        console.log('Lease acquired, running resync (child process)...');
        await runResyncScript();
        console.log('Resync child process finished');
      } else {
        console.log('Lease held by another process; skipping this interval');
      }
    } catch (err) {
      console.error('Worker iteration error', err instanceof Error ? err.message : err);
    }

    // Sleep until next run
    await new Promise((r) => setTimeout(r, INTERVAL_MS));

    // If --once flag provided, break after single iteration
    if (process.argv.includes('--once')) {
      console.log('Run once flag detected, exiting after single loop');
      break;
    }
  }
}

runLoop().catch((e) => {
  console.error('Worker fatal error', e instanceof Error ? e.message : e);
  process.exit(1);
});
