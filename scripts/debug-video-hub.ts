import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { register } from 'tsconfig-paths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: {
    '@/*': ['src/*']
  }
});

import { getDb } from '../config/firebase-admin.js';

async function main(): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection('multi_scene_video_scripts').limit(10).get();
  if (snapshot.empty) {
    console.log('No multi_scene_video_scripts documents found.');
    return;
  }

  const candidates = snapshot.docs
    .map((doc: FirebaseFirestore.DocumentSnapshot) => ({ id: doc.id, data: doc.data() }))
    .filter(
      (entry: { id: string; data: any }) =>
        Array.isArray(entry.data.sceneVideos) && entry.data.sceneVideos.length > 0
    );

  if (candidates.length === 0) {
    console.log('No script documents contain sceneVideos yet.');
    return;
  }

  const target = candidates[0];
  console.log('Inspecting recipe:', target.id);

  // @ts-expect-error: Allow importing TS module directly for script execution context.
  const actions = await import('../src/app/actions.ts');
  const { getMultiSceneVideoDataAction, combineVideoScenesAction } = actions;

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
