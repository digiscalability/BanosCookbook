/**
 * Script to check recipe images in Firestore and verify they're compatible with Runway ML API
 * Runway ML requires:
 * - Publicly accessible URLs (not data URIs)
 * - Valid image formats (JPG, PNG, WebP)
 * - Working URLs that return 200 status
 */

const admin = require('firebase-admin');
const https = require('https');
const http = require('http');

// Initialize Firebase Admin
const serviceAccount = require('../studio-4664575455-de3d2-firebase-adminsdk-fbsvc-d36b200af4.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'studio-4664575455-de3d2.firebasestorage.app'
  });
}

const db = admin.firestore();

async function checkImageUrl(url) {
  if (!url) {
    return { valid: false, reason: 'No URL provided' };
  }

  // Check if it's a data URI
  if (url.startsWith('data:')) {
    return { valid: false, reason: 'Data URI (not publicly accessible)' };
  }

  // Check if it's a valid HTTP/HTTPS URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, reason: 'Not a valid HTTP/HTTPS URL' };
  }

  // Try to fetch the URL using Node's built-in http/https
  try {
    const protocol = url.startsWith('https:') ? https : http;

    return await new Promise((resolve) => {
      const request = protocol.request(url, { method: 'HEAD', timeout: 5000 }, (response) => {
        if (response.statusCode !== 200) {
          resolve({ valid: false, reason: `HTTP ${response.statusCode} ${response.statusMessage}` });
          return;
        }

        const contentType = response.headers['content-type'];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (!contentType || !validTypes.some(type => contentType.includes(type))) {
          resolve({ valid: false, reason: `Invalid content-type: ${contentType}` });
          return;
        }

        resolve({ valid: true, contentType });
      });

      request.on('error', (error) => {
        resolve({ valid: false, reason: `Request error: ${error.message}` });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({ valid: false, reason: 'Request timeout' });
      });

      request.end();
    });
  } catch (error) {
    return { valid: false, reason: `Fetch error: ${error.message}` };
  }
}

async function checkAllRecipeImages() {
  console.log('🔍 Checking all recipe images in Firestore...\n');

  const recipesSnapshot = await db.collection('recipes').get();

  if (recipesSnapshot.empty) {
    console.log('❌ No recipes found in Firestore');
    return;
  }

  console.log(`📊 Found ${recipesSnapshot.size} recipes\n`);

  const results = {
    total: 0,
    withImages: 0,
    validImages: 0,
    invalidImages: 0,
    noImages: 0,
    details: []
  };

  for (const doc of recipesSnapshot.docs) {
    const recipe = doc.data();
    results.total++;

    const recipeInfo = {
      id: doc.id,
      title: recipe.title || 'Untitled',
      author: recipe.author || 'Unknown',
      imageUrl: recipe.imageUrl,
      imageId: recipe.imageId,
      status: null,
      issue: null
    };

    if (!recipe.imageUrl) {
      results.noImages++;
      recipeInfo.status = '❌ NO IMAGE';
      recipeInfo.issue = 'No imageUrl field';
    } else {
      results.withImages++;
      const check = await checkImageUrl(recipe.imageUrl);

      if (check.valid) {
        results.validImages++;
        recipeInfo.status = '✅ VALID';
      } else {
        results.invalidImages++;
        recipeInfo.status = '⚠️ INVALID';
        recipeInfo.issue = check.reason;
      }
    }

    results.details.push(recipeInfo);
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total Recipes: ${results.total}`);
  console.log(`With Images: ${results.withImages} (${Math.round(results.withImages/results.total*100)}%)`);
  console.log(`Valid Images: ${results.validImages} (${Math.round(results.validImages/results.total*100)}%)`);
  console.log(`Invalid Images: ${results.invalidImages}`);
  console.log(`No Images: ${results.noImages}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Print details
  console.log('📋 DETAILED RESULTS:\n');

  for (const recipe of results.details) {
    console.log(`${recipe.status} ${recipe.title}`);
    console.log(`   ID: ${recipe.id}`);
    console.log(`   Author: ${recipe.author}`);

    if (recipe.imageUrl) {
      // Truncate long URLs for display
      const displayUrl = recipe.imageUrl.length > 80
        ? recipe.imageUrl.substring(0, 77) + '...'
        : recipe.imageUrl;
      console.log(`   URL: ${displayUrl}`);
    }

    if (recipe.issue) {
      console.log(`   Issue: ${recipe.issue}`);
    }

    console.log('');
  }

  // Print recommendations
  if (results.invalidImages > 0 || results.noImages > 0) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('💡 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════');

    if (results.noImages > 0) {
      console.log(`\n❌ ${results.noImages} recipes have no images:`);
      console.log('   → Add images to these recipes using:');
      console.log('      1. Upload images in the recipe form');
      console.log('      2. Use AI image generation feature');
      console.log('      3. Set placeholder images from Unsplash');
    }

    if (results.invalidImages > 0) {
      console.log(`\n⚠️ ${results.invalidImages} recipes have invalid images:`);
      console.log('   → Check the issues listed above');
      console.log('   → Data URIs need to be uploaded to Firebase Storage');
      console.log('   → Broken URLs need to be replaced');
      console.log('   → Use publicly accessible URLs (Firebase Storage, Unsplash, etc.)');
    }

    console.log('\n📝 For Runway ML video generation, recipes MUST have:');
    console.log('   ✅ A valid, publicly accessible image URL');
    console.log('   ✅ Image format: JPG, PNG, or WebP');
    console.log('   ✅ Recommended size: 800x600px minimum');
    console.log('═══════════════════════════════════════════════════════\n');
  } else {
    console.log('✅ All recipes with images are ready for Runway ML video generation!\n');
  }

  // Check video scripts
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎬 CHECKING VIDEO SCRIPTS');
  console.log('═══════════════════════════════════════════════════════');

  const scriptsSnapshot = await db.collection('video_scripts').get();
  console.log(`Found ${scriptsSnapshot.size} video scripts\n`);

  let readyForVideo = 0;
  const readyRecipes = [];

  for (const recipe of results.details) {
    const hasValidImage = recipe.status === '✅ VALID';
    const script = scriptsSnapshot.docs.find(doc => doc.id === recipe.id);
    const hasScript = script && script.data()?.script;

    if (hasValidImage && hasScript) {
      readyForVideo++;
      readyRecipes.push(recipe.title);
    }
  }

  console.log(`✅ ${readyForVideo} recipes are ready for video generation`);
  console.log(`   (Have both valid image AND video script)\n`);

  if (readyRecipes.length > 0) {
    console.log('Ready recipes:');
    readyRecipes.forEach(title => console.log(`   • ${title}`));
  }

  console.log('\n');
}

checkAllRecipeImages()
  .then(() => {
    console.log('✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
