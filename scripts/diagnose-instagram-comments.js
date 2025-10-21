#!/usr/bin/env node
/**
 * Diagnose Instagram comments/insights for a given mediaId
 * Usage: node scripts/diagnose-instagram-comments.js <MEDIA_ID>
 *
 * Requires .env.local to have valid Instagram config (INSTAGRAM_ACCESS_TOKEN, FACEBOOK_APP_SECRET, etc.)
 */

require('dotenv').config({ path: '.env.local' });
const instagramApi = require('../config/instagram-api');

async function main() {
  const mediaId = process.argv[2];
  if (!mediaId) {
    console.error('Usage: node scripts/diagnose-instagram-comments.js <MEDIA_ID>');
    process.exit(2);
  }

  if (!instagramApi.isConfigured()) {
    console.error('Instagram API not configured. Ensure FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, INSTAGRAM_APP_ID and INSTAGRAM_BUSINESS_ACCOUNT_ID are set.');
    process.exit(1);
  }

  try {
    const token = await instagramApi.getAccessToken();
    console.log('Using access token:', token ? token.slice(0, 20) + '...' : '(none)');
  } catch (err) {
    console.error('Failed to get access token:', err && err.message ? err.message : err);
  }

  try {
    console.log('\nFetching comments (this will follow pagination)...');
    const comments = await instagramApi.getComments(mediaId);
    console.log(`Fetched ${comments.length} comment(s)`);
    console.log(JSON.stringify(comments.slice(0, 10), null, 2));
  } catch (err) {
    console.error('Error fetching comments:', err && err.message ? err.message : err);
  }

  try {
    console.log('\nFetching media insights...');
    const insights = await instagramApi.getMediaInsights(mediaId);
    console.log('Insights:', insights);
  } catch (err) {
    console.error('Error fetching insights:', err && err.message ? err.message : err);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
