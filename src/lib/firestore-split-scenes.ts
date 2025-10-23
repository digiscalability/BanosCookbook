import { collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';

import app from './firebase';

export interface SplitSceneDoc {
  recipeId: string;
  sceneNumber: number;
  script: string;
  description?: string;
  videoUrl?: string;
  videoGeneratedAt?: unknown;
}

export async function fetchSplitScenesForRecipe(recipeId: string): Promise<SplitSceneDoc[]> {
  try {
    const db = getFirestore(app);
    const q = query(
      collection(db, 'split_scenes'),
      where('recipeId', '==', recipeId),
      orderBy('sceneNumber', 'asc')
    );
    const snapshot = await getDocs(q);
    const scenes = snapshot.docs.map(doc => doc.data() as SplitSceneDoc);
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[fetchSplitScenesForRecipe] fetched', scenes.length, 'scenes:', scenes);
    }
    return scenes;
  } catch (err) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[fetchSplitScenesForRecipe] error:', err);
    }
    return [];
  }
}
