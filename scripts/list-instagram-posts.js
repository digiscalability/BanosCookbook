#!/usr/bin/env node
/**
 * List instagram_posts docs and print mapping to recipes (id/title)
 * Usage: node scripts/list-instagram-posts.js
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in .env.local
 */

require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');

async function main() {
  try {
    const { getAdmin, getDb } = adminConfig;
    const admin = getAdmin();
    const db = getDb();

    const snap = await db.collection('instagram_posts').orderBy('postedAt','desc').limit(50).get();
    if (snap.empty) {
      console.log('No instagram_posts documents found');
      process.exit(0);
    }

    for (const doc of snap.docs) {
      const d = doc.data();
      const recipeId = d.recipeId;
      let recipeTitle = '(unknown)';
      try {
        const r = await db.collection('recipes').doc(recipeId).get();
        if (r.exists) recipeTitle = r.data().title || recipeTitle;
      } catch {}

      console.log(`mediaId=${d.instagramMediaId}  recipeId=${recipeId}  title=${recipeTitle}  permalink=${d.instagramPermalink}  likes=${d.likeCount||0} comments=${d.commentsCount||0}`);
    }
  } catch (err) {
    console.error('Error listing instagram_posts:', err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();
