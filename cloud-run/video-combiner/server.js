'use strict';

const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const { promises: fs } = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// Firebase Admin
// ---------------------------------------------------------------------------
let _admin = null;
function getAdmin() {
  if (_admin) return _admin;
  const admin = require('firebase-admin');
  if (admin.apps.length > 0) {
    _admin = admin;
    return _admin;
  }
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(sa);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }
  if (!credential) {
    credential = admin.credential.applicationDefault();
  }
  admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  _admin = admin;
  return _admin;
}

// ---------------------------------------------------------------------------
// FFmpeg helpers
// ---------------------------------------------------------------------------
const TEMP_PREFIX = 'banos-combine-';
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

function toConcatPath(filePath) {
  return filePath.replace(/'/g, "'\\''");
}

function runFfmpegConcat(listPath, outputPath, reencode) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .output(outputPath);

    if (reencode) {
      cmd.outputOptions([
        '-c:v libx264',
        '-preset medium',
        '-crf 21',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ]);
    } else {
      cmd.outputOptions(['-c copy']);
    }

    cmd.once('end', resolve).once('error', reject).run();
  });
}

async function combineAndUpload(scenes, recipeId) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX));
  try {
    // Download all clips
    const localFiles = [];
    for (const [i, scene] of scenes.entries()) {
      const res = await fetch(scene.videoUrl);
      if (!res.ok) throw new Error(`Failed to download scene ${scene.sceneNumber}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const p = path.join(tempDir, `scene-${String(i).padStart(3, '0')}.mp4`);
      await fs.writeFile(p, buf);
      localFiles.push(p);
    }

    let combinedBuf;
    if (localFiles.length === 1) {
      combinedBuf = await fs.readFile(localFiles[0]);
    } else {
      const listPath = path.join(tempDir, 'files.txt');
      await fs.writeFile(listPath, localFiles.map(f => `file '${toConcatPath(f)}'`).join('\n'), 'utf8');
      const outputPath = path.join(tempDir, 'combined.mp4');

      try {
        await runFfmpegConcat(listPath, outputPath, false);
      } catch {
        console.warn('Lossless concat failed, retrying with re-encode');
        await runFfmpegConcat(listPath, outputPath, true);
      }
      combinedBuf = await fs.readFile(outputPath);
    }

    // Upload to Firebase Storage
    const admin = getAdmin();
    const bucket = admin.storage().bucket();
    const dest = `combined_videos/${recipeId}/${uuidv4()}.mp4`;
    const file = bucket.file(dest);
    await file.save(combinedBuf, { metadata: { contentType: 'video/mp4' } });

    let url;
    try {
      await file.makePublic();
      url = `https://storage.googleapis.com/${bucket.name}/${dest}`;
    } catch {
      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + ONE_YEAR_MS });
      url = signedUrl;
    }

    const duration = scenes.reduce((t, s) => t + (Number(s.duration) || 0), 0);
    return { url, duration, fileSize: combinedBuf.length };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Express server
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'banos-video-combiner' }));

app.post('/combine', async (req, res) => {
  // Auth
  const secret = process.env.CLOUD_RUN_SECRET;
  if (secret) {
    const auth = req.headers.authorization ?? '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  const { recipeId } = req.body ?? {};
  if (!recipeId || typeof recipeId !== 'string') {
    return res.status(400).json({ success: false, error: 'recipeId is required' });
  }

  try {
    const admin = getAdmin();
    const db = admin.firestore();

    const stepDoc = await db.collection('recipe_step_videos').doc(recipeId).get();
    if (!stepDoc.exists) {
      return res.status(404).json({ success: false, error: 'No step videos found for this recipe.' });
    }

    const steps = ((stepDoc.data()?.steps ?? []))
      .filter(s => typeof s.videoUrl === 'string' && s.videoUrl.length > 0)
      .sort((a, b) => a.stepIndex - b.stepIndex)
      .map(s => ({ sceneNumber: s.stepIndex + 1, videoUrl: s.videoUrl, duration: s.duration ?? 6 }));

    if (steps.length === 0) {
      return res.status(400).json({ success: false, error: 'No step videos generated yet.' });
    }

    console.log(`[combine] recipeId=${recipeId} clips=${steps.length}`);
    const { url, duration, fileSize } = await combineAndUpload(steps, recipeId);

    // Persist result back to Firestore
    await db.collection('recipe_step_videos').doc(recipeId).update({
      combinedVideoUrl: url,
      combinedVideoMethod: 'ffmpeg',
      combinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[combine] done recipeId=${recipeId} url=${url}`);
    return res.json({ success: true, combinedVideoUrl: url, duration, fileSize, processingMethod: 'ffmpeg' });
  } catch (err) {
    console.error('[combine] error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = parseInt(process.env.PORT ?? '8080', 10);
app.listen(PORT, () => console.log(`banos-video-combiner listening on :${PORT}`));
