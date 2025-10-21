#!/usr/bin/env node
/**
 * Sync Instagram comments and likes for a recipeId by calling Instagram API
 * and updating Firestore documents. Use when you want to force an on-demand
 * sync from the terminal.
 *
 * Usage: node scripts/sync-instagram-for-recipe.js <RECIPE_ID>
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON
 */

require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');
const instagramApi = require('../config/instagram-api');

async function main() {
  const recipeId = process.argv[2];
  if (!recipeId) {
    console.error('Usage: node scripts/sync-instagram-for-recipe.js <RECIPE_ID>');
    process.exit(2);
  }

  try {
    if (!instagramApi.isConfigured()) {
      throw new Error('Instagram API not configured (check env vars)');
    }

    const { getDb } = adminConfig;
    const db = getDb();

    const snap = await db.collection('instagram_posts').where('recipeId', '==', recipeId).limit(1).get();
    if (snap.empty) {
      console.error('No instagram_posts document found for recipeId', recipeId);
      process.exit(1);
    }

    const doc = snap.docs[0];
    const ig = doc.data();
    const mediaId = ig.instagramMediaId;
    console.log('Found instagram post:', { mediaId, permalink: ig.instagramPermalink });

    // Fetch comments
    console.log('Fetching comments from Instagram...');
    const comments = await instagramApi.getComments(mediaId);
    console.log('Fetched', comments.length, 'comments');

    // Fetch recipe
    const recipeDoc = await db.collection('recipes').doc(recipeId).get();
    if (!recipeDoc.exists) {
      console.error('Recipe not found:', recipeId);
      process.exit(1);
    }

    const recipe = recipeDoc.data() || {};
    const existingComments = Array.isArray(recipe.comments) ? recipe.comments : [];
    const existingInstagramCommentIds = new Set(existingComments.filter(c => c.instagramCommentId).map(c => c.instagramCommentId));

    let newComments = 0;
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
      newComments++;
    }

    if (newComments > 0) {
      await db.collection('recipes').doc(recipeId).update({ comments: existingComments, updatedAt: new Date() });
      console.log('Added', newComments, 'new comments to recipe', recipeId);
    } else {
      console.log('No new comments to add');
    }

    // Fetch insights and update instagram_posts doc
    console.log('Fetching media insights...');
    const insights = await instagramApi.getMediaInsights(mediaId);
    await doc.ref.update({ likeCount: insights.likeCount, commentsCount: insights.commentsCount, lastSyncedAt: new Date() });
    console.log('Updated instagram_posts with insights:', insights);

    console.log('Sync complete');
  } catch (err) {
    console.error('Sync failed:', err && err.message ? err.message : err);
    process.exit(3);
  }
}

main();
