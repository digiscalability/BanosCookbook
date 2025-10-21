process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });
require('dotenv/config');
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const firebaseAdminModule = require('../config/firebase-admin.js');
  const db = firebaseAdminModule.getDb();

  const snapshot = await db.collection('multi_scene_video_scripts').limit(10).get();
  if (snapshot.empty) {
    console.log('No multi_scene_video_scripts documents found.');
    return;
  }

  const candidates = snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter((entry) => Array.isArray(entry.data.sceneVideos) && entry.data.sceneVideos.length > 0);

  if (candidates.length === 0) {
    console.log('No script documents contain sceneVideos yet.');
    return;
  }

  const target = candidates[0];
  console.log('Inspecting recipe:', target.id);

  const actionsModule = await import(pathToFileURL(path.resolve(__dirname, '../src/app/actions.ts')).href);
  const getMultiSceneVideoDataAction = actionsModule.getMultiSceneVideoDataAction;
  const combineVideoScenesAction = actionsModule.combineVideoScenesAction;

  const before = await getMultiSceneVideoDataAction(target.id);
  console.log('Before combine:', JSON.stringify(before, null, 2));

  const combineResult = await combineVideoScenesAction(target.id);
  console.log('Combine result:', JSON.stringify(combineResult, null, 2));

  const after = await getMultiSceneVideoDataAction(target.id);
  console.log('After combine:', JSON.stringify(after, null, 2));
}

main().catch((err) => {
  console.error('debug-video-hub failed:', err);
  process.exitCode = 1;
});
