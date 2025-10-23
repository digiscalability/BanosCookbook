require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');

async function checkRecipes() {
  try {
    const { getDb } = adminConfig;
    const db = getDb();

    const snapshot = await db.collection('recipes')
      .orderBy('createdAt', 'desc')
      .limit(15)
      .get();

    console.log('\n📋 Current Recipes on Homepage:\n');
    console.log('='.repeat(80));

    snapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`\n${i+1}. ${data.title}`);
      console.log(`   Cuisine: ${data.cuisine || 'Not specified'}`);
      console.log(`   Author: ${data.author}`);

      if (data.imageUrl) {
        const imagePreview = data.imageUrl.length > 100
          ? data.imageUrl.substring(0, 100) + '...'
          : data.imageUrl;
        console.log(`   Image URL: ${imagePreview}`);

        // Check if it's a Firebase Storage URL (AI-generated) or external
        if (data.imageUrl.includes('firebasestorage.googleapis.com')) {
          console.log(`   ✨ AI-Generated Image`);
        } else if (data.imageUrl.includes('unsplash.com')) {
          console.log(`   🖼️  Unsplash Stock Image`);
        } else {
          console.log(`   🌐 External Image`);
        }
      } else if (data.imageId) {
        console.log(`   📷 Placeholder Image #${data.imageId}`);
      } else {
        console.log(`   ⚠️  No image set`);
      }

      console.log(`   Ingredients: ${data.ingredients?.length || 0} items`);
      console.log('-'.repeat(80));
    });

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRecipes();
