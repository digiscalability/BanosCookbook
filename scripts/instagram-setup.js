/**
 * Instagram Setup Helper Script
 *
 * This script helps you retrieve your Instagram Business Account ID
 * Run this after setting up FACEBOOK_APP_ID and FACEBOOK_APP_SECRET
 *
 * Usage: node scripts/instagram-setup.js
 */

require('dotenv').config({ path: '.env.local' });

const appId = process.env.FACEBOOK_APP_ID;
const appSecret = process.env.FACEBOOK_APP_SECRET;

if (!appId || !appSecret) {
  console.error('❌ Missing required environment variables:');
  console.error('   - FACEBOOK_APP_ID');
  console.error('   - FACEBOOK_APP_SECRET');
  console.error('\nPlease set these in your .env.local file first.');
  process.exit(1);
}

console.log('🔍 Instagram Setup Helper\n');
console.log('📋 Current Configuration:');
console.log(`   Facebook App ID: ${appId}`);
console.log(`   Instagram App ID: ${process.env.INSTAGRAM_APP_ID || 'Not set'}`);
console.log('\n' + '='.repeat(60) + '\n');

console.log('📝 To get your Instagram Business Account ID:\n');

console.log('1️⃣  Go to Facebook Graph API Explorer:');
console.log('   https://developers.facebook.com/tools/explorer\n');

console.log('2️⃣  Select your app from the dropdown\n');

console.log('3️⃣  Click "Generate Access Token" and grant these permissions:');
console.log('   ✓ instagram_basic');
console.log('   ✓ pages_show_list');
console.log('   ✓ instagram_content_publish');
console.log('   ✓ pages_read_engagement\n');

console.log('4️⃣  Copy the access token and run this command:');
console.log('   (Replace YOUR_ACCESS_TOKEN with the token you copied)\n');

const curlCommand = `curl "https://graph.facebook.com/v24.0/me/accounts?access_token=YOUR_ACCESS_TOKEN"`;
console.log(`   ${curlCommand}\n`);

console.log('5️⃣  Find your Facebook Page ID in the response\n');

console.log('6️⃣  Get your Instagram Account ID:');
const curlInstagramCommand = `curl "https://graph.facebook.com/v24.0/YOUR_PAGE_ID?fields=instagram_business_account&access_token=YOUR_ACCESS_TOKEN"`;
console.log(`   ${curlInstagramCommand}\n`);

console.log('7️⃣  Copy the "instagram_business_account" → "id" value\n');

console.log('8️⃣  Add to your .env.local:');
console.log('   INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id_here');
console.log('   INSTAGRAM_ACCESS_TOKEN=your_access_token_here\n');

console.log('=' + '='.repeat(60) + '\n');

console.log('💡 For a long-lived access token (60 days):');
const longLivedCommand = `curl "https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"`;
console.log(`   ${longLivedCommand}\n`);

console.log('📚 Full documentation:');
console.log('   https://developers.facebook.com/docs/instagram-api/getting-started\n');

console.log('✅ After setup, test your integration with:');
console.log('   npm run instagram:test\n');
