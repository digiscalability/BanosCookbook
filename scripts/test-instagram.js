/**
 * Test Instagram API Integration
 *
 * Tests the Instagram API configuration and connection
 * Run: node scripts/test-instagram.js
 */

require('dotenv').config({ path: '.env.local' });
const instagramApi = require('../config/instagram-api');

async function testInstagramIntegration() {
  console.log('🧪 Testing Instagram API Integration\n');
  console.log('=' + '='.repeat(60) + '\n');

  // Check configuration
  console.log('1️⃣  Checking configuration...');
  if (!instagramApi.isConfigured()) {
    console.error('❌ Instagram API not configured');
    console.error('   Please set the following environment variables:');
    console.error('   - FACEBOOK_APP_ID');
    console.error('   - FACEBOOK_APP_SECRET');
    console.error('   - INSTAGRAM_APP_ID');
    console.error('   - INSTAGRAM_BUSINESS_ACCOUNT_ID');
    console.error('\n   Run: node scripts/instagram-setup.js for help\n');
    process.exit(1);
  }

  const config = instagramApi.getConfig();
  console.log('✅ Configuration loaded');
  console.log(`   App ID: ${config.appId}`);
  console.log(`   Instagram App ID: ${config.instagramAppId}`);
  console.log(`   Instagram Account ID: ${config.instagramAccountId}\n`);

  // Check access token
  console.log('2️⃣  Checking access token...');
  try {
    const token = await instagramApi.getAccessToken();
    console.log('✅ Access token available');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);
  } catch (error) {
    console.error('❌ Access token not available');
    console.error(`   Error: ${error.message}`);
    console.error('   Please set INSTAGRAM_ACCESS_TOKEN in .env.local\n');
    process.exit(1);
  }

  // Test API connection
  console.log('3️⃣  Testing API connection...');
  try {
    const url = `${config.graphApiBase}/${config.instagramAccountId}?fields=id,username,media_count&access_token=${await instagramApi.getAccessToken()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    console.log('✅ API connection successful');
    console.log(`   Instagram Username: @${data.username}`);
    console.log(`   Total Posts: ${data.media_count}\n`);
  } catch (error) {
    console.error('❌ API connection failed');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  }

  // Summary
  console.log('=' + '='.repeat(60));
  console.log('✅ Instagram API Integration Test: PASSED\n');
  console.log('🎉 You can now:');
  console.log('   - Post recipes to Instagram automatically');
  console.log('   - Sync Instagram comments back to the website');
  console.log('   - Track Instagram likes and engagement\n');
  console.log('📝 Next steps:');
  console.log('   1. Set up Instagram webhooks (see docs/INSTAGRAM_SETUP.md)');
  console.log('   2. Test posting a recipe from the website');
  console.log('   3. Monitor webhook notifications\n');
}

testInstagramIntegration().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
