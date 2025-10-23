#!/usr/bin/env node

/**
 * Update Firebase Storage CORS Configuration
 * Allows localhost development to access AI-generated images
 */

require('dotenv').config({ path: '.env.local' });

async function updateStorageCORS() {
  console.log('\n🔧 Updating Firebase Storage CORS Configuration\n');
  console.log('='.repeat(80));

  try {
    const { Storage } = require('@google-cloud/storage');

    // Get credentials from environment variables (used by firebase-admin.js)
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Required Firebase credentials not found in environment variables');
    }

    const projectId = serviceAccount.project_id;
    const bucketName = `${projectId}.firebasestorage.app`;

    console.log(`📦 Bucket: ${bucketName}`);
    console.log(`🔑 Using service account: ${serviceAccount.client_email}\n`);    // Initialize Storage with credentials
    const storage = new Storage({
      projectId: projectId,
      credentials: serviceAccount
    });

    const bucket = storage.bucket(bucketName);

    // Define CORS configuration
    const corsConfiguration = [
      {
        origin: ['https://www.banoscookbook.com', 'http://localhost:9002', 'http://localhost:3000', 'http://localhost:4000'],
        method: ['GET', 'HEAD', 'PUT', 'POST'],
        responseHeader: ['Content-Type', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers'],
        maxAgeSeconds: 3600
      }
    ];

    console.log('📝 Applying CORS configuration:\n');
    console.log(JSON.stringify(corsConfiguration, null, 2));
    console.log('\n' + '-'.repeat(80));

    await bucket.setCorsConfiguration(corsConfiguration);

    console.log('\n✅ CORS configuration updated successfully!\n');
    console.log('🌐 Allowed origins:');
    console.log('   - https://www.banoscookbook.com (production)');
    console.log('   - http://localhost:9002 (Next.js dev)');
    console.log('   - http://localhost:3000 (Next.js default)');
    console.log('   - http://localhost:4000 (Genkit dev)');
    console.log('\n📝 Allowed methods: GET, HEAD, PUT, POST');
    console.log('⏱️  Cache duration: 3600 seconds (1 hour)\n');

    // Verify the configuration
    const [metadata] = await bucket.getMetadata();
    if (metadata.cors) {
      console.log('✅ Verification: CORS is now active\n');
      console.log('='.repeat(80));
      console.log('\n💡 Next steps:');
      console.log('   1. Reload the browser page: http://localhost:9002/add-recipe');
      console.log('   2. The AI-generated images should now display correctly');
      console.log('   3. Try generating images again to test\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error updating CORS:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify Firebase credentials are set in .env.local');
    console.error('2. Ensure the service account has Storage Admin permissions');
    console.error('3. Check that @google-cloud/storage package is installed');
    console.error('\nError details:', error.stack);
    console.error('\n');
    process.exit(1);
  }
}

updateStorageCORS();
