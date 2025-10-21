import adminConfig from '../../config/firebase-admin';
import * as instagramApi from '../../config/instagram-api';

/**
 * Resync all instagram_posts documents: fetch comments and insights and update Firestore.
 * Exported so both scripts and workers can call it.
 */
type InstagramComment = {
  id: string;
  username?: string;
  text?: string;
  timestamp?: string;
  like_count?: number;
};

type MediaInsights = {
  likeCount?: number;
  commentsCount?: number;
  timestamp?: string;
};

type RecipeComment = {
  instagramCommentId?: string;
};

export async function resyncAllInstagramPosts(): Promise<{ processed: number; addedComments: number; errors: number }> {
  if (!instagramApi.isConfigured()) {
    throw new Error('Instagram API not configured');
  }

  const { getDb } = adminConfig;
  const db = getDb();

  const snap = await db.collection('instagram_posts').get();
  if (snap.empty) return { processed: 0, addedComments: 0, errors: 0 };

  let processed = 0;
  let addedComments = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const mediaId = data.instagramMediaId;
    const recipeId = data.recipeId;
    if (!mediaId || !recipeId) continue;

    try {
      processed++;
  const igComments = (await instagramApi.getComments(mediaId)) as InstagramComment[];

      const recipeRef = db.collection('recipes').doc(recipeId);
      const recipeSnap = await recipeRef.get();
      const recipe = recipeSnap.exists ? recipeSnap.data() : {};
      const existingComments = Array.isArray(recipe?.comments) ? recipe.comments : [];
      const existingInstagramCommentIds = new Set(
        existingComments
          .filter((c: unknown): c is RecipeComment => typeof c === 'object' && c !== null && 'instagramCommentId' in (c as Record<string, unknown>))
          .map((c) => c.instagramCommentId as string)
      );

  let added = 0;
      for (const igc of igComments) {
        if (existingInstagramCommentIds.has(igc.id)) continue;
        const usernameSafe = typeof igc.username === 'string' ? igc.username : 'user';
        const timestampSafe = typeof igc.timestamp === 'string' ? new Date(igc.timestamp).toISOString() : new Date().toISOString();
        const newComment = {
          id: `ig_${igc.id}`,
          author: usernameSafe,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(usernameSafe)}&background=A7D1AB&color=fff`,
          text: igc.text || '',
          timestamp: timestampSafe,
          likes: typeof igc.like_count === 'number' ? igc.like_count : 0,
          isFromInstagram: true,
          instagramCommentId: igc.id,
          instagramUsername: igc.username,
          replies: []
        };
        existingComments.push(newComment);
        added++;
      }

      if (added > 0) {
        await recipeRef.update({ comments: existingComments, updatedAt: new Date() });
        addedComments += added;
      }

  const insights = (await instagramApi.getMediaInsights(mediaId)) as MediaInsights;
  const likes = typeof insights?.likeCount === 'number' ? insights.likeCount : 0;
  const commentsCount = typeof insights?.commentsCount === 'number' ? insights.commentsCount : 0;
  await doc.ref.update({ likeCount: likes, commentsCount: commentsCount, lastSyncedAt: new Date() });
    } catch (err) {
      console.error('resync error for doc', doc.id, err instanceof Error ? err.message : String(err));
      errors++;
    }
  }

  return { processed, addedComments, errors };
}
