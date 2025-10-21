#!/usr/bin/env node
/**
 * Resync all instagram_posts documents by fetching comments and insights
 * from Instagram and updating Firestore and recipe documents accordingly.
 *
 * Usage: node scripts/resync-all-instagram-posts.js
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON
 */

require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');
const instagramApi = require('../config/instagram-api');

async function processPost(doc) {
  const data = doc.data();
  const mediaId = data.instagramMediaId;
  const recipeId = data.recipeId;
  if (!mediaId || !recipeId) {
    console.warn('Skipping instagram_posts doc without mediaId or recipeId', doc.id);
    return { skipped: 1 };
  }

  try {
    console.log('\n---');
    console.log(`Processing mediaId=${mediaId} recipeId=${recipeId} (doc=${doc.id})`);

    const comments = await instagramApi.getComments(mediaId);
    console.log(`Fetched ${comments.length} comment(s) from Instagram for ${mediaId}`);

    const db = adminConfig.getDb();
    const recipeRef = db.collection('recipes').doc(recipeId);
    // Use a transaction to read/update recipe comments to avoid lost updates
    let added = 0;
    try {
      await db.runTransaction(async (tx) => {
        const recipeSnap = await tx.get(recipeRef);
        const recipe = recipeSnap.exists ? recipeSnap.data() : {};
        const existingComments = Array.isArray(recipe?.comments) ? recipe.comments.slice() : [];
        const existingInstagramCommentIds = new Set(existingComments.filter(c => c.instagramCommentId).map(c => c.instagramCommentId));

        for (const igc of comments) {
          if (existingInstagramCommentIds.has(igc.id)) continue;
          const newComment = {
            id: `ig_${igc.id}`,
            author: igc.username,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(igc.username)}&background=A7D1AB&color=fff`,
            text: igc.text,
            timestamp: new Date(igc.timestamp).toISOString(),
            likes: igc.like_count || 0,
            isFromInstagram: true,
            instagramCommentId: igc.id,
            instagramUsername: igc.username,
            replies: []
          };
          existingComments.push(newComment);
          added++;
        }

        if (added > 0) {
          tx.update(recipeRef, { comments: existingComments, updatedAt: new Date() });
        }
      });

      if (added > 0) {
        console.log(`Added ${added} comment(s) to recipe ${recipeId}`);
      } else {
        console.log('No new comments to add');
      }
    } catch (txErr) {
      console.error('Transaction error updating recipe comments for', recipeId, txErr && txErr.message ? txErr.message : txErr);
    }

    const insights = await instagramApi.getMediaInsights(mediaId);
    // Update the instagram_posts doc atomically to avoid race conditions
    try {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);
        tx.update(doc.ref, { likeCount: insights.likeCount, commentsCount: insights.commentsCount, lastSyncedAt: new Date() });
      });
    } catch (metaErr) {
      console.error('Failed to update instagram_posts metadata for', doc.id, metaErr && metaErr.message ? metaErr.message : metaErr);
    }
    console.log('Updated instagram_posts doc with insights:', insights);

    return { processed: 1, added };
  } catch (err) {
    console.error('Error processing post', mediaId, err && err.message ? err.message : err);
    return { error: 1 };
  }
}

async function main() {
  if (!instagramApi.isConfigured()) {
    console.error('Instagram API not configured. Aborting.');
    process.exit(1);
  }

  const db = adminConfig.getDb();
  const snap = await db.collection('instagram_posts').get();
  if (snap.empty) {
    console.log('No instagram_posts documents found.');
    return;
  }

  const docs = snap.docs;
  console.log(`Found ${docs.length} instagram_posts documents. Starting resync...`);

  const results = { processed: 0, skipped: 0, addedComments: 0, errors: 0 };

  // Simple sequential processing to avoid rate limits (safe default). Could be parallelized with throttling.
  for (const doc of docs) {
    const r = await processPost(doc);
    if (r.processed) results.processed += r.processed;
    if (r.skipped) results.skipped += r.skipped;
    if (r.added) results.addedComments += r.added;
    if (r.error) results.errors += r.error;
  }

  console.log('\nResync complete:', results);
}

main().catch(e => {
  console.error('Resync failed:', e && e.message ? e.message : e);
  process.exit(2);
});
