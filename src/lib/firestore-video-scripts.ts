import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';

import app from './firebase';

export interface VideoScriptDoc {
  recipeId: string;
  script: string;
  marketingIdeas?: string[];
  createdAt?: unknown;
  videoUrl?: string;
  videoGeneratedAt?: unknown;
}

export async function fetchAllVideoScripts(): Promise<VideoScriptDoc[]> {
  try {
    const db = getFirestore(app);
    const q = query(collection(db, 'video_scripts'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const scripts = snapshot.docs.map(doc => doc.data() as VideoScriptDoc);
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[fetchAllVideoScripts] fetched', scripts.length, 'scripts:', scripts);
    }
    return scripts;
  } catch (err) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[fetchAllVideoScripts] error:', err);
    }
    return [];
  }
}
