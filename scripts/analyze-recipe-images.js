require('dotenv').config({ path: '.env.local' });
const adminConfig = require('../config/firebase-admin');

async function analyzeRecipeImages() {
  try {
    const { getDb } = adminConfig;
    const db = getDb();

    const snapshot = await db.collection('recipes')
      .orderBy('createdAt', 'desc')
      .get();

    console.log('\n🔍 RECIPE IMAGE ANALYSIS REPORT\n');
    console.log('='.repeat(90));

    let totalRecipes = 0;
    let aiGeneratedImages = 0;
    let placeholderImages = 0;
    let externalImages = 0;
    const mismatches = [];

    snapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      totalRecipes++;

      let imageType = '';
      let imageDescription = '';
      let potentialMismatch = false;

      if (data.imageUrl) {
        if (data.imageUrl.includes('firebasestorage.googleapis.com')) {
          imageType = '✨ AI-Generated';
          aiGeneratedImages++;
          imageDescription = 'Custom AI image for this recipe';
        } else if (data.imageUrl.includes('unsplash.com')) {
          imageType = '🖼️  Unsplash Stock';
          externalImages++;
          imageDescription = 'Generic stock photo';
          potentialMismatch = true;
        } else {
          imageType = '🌐 External URL';
          externalImages++;
          imageDescription = 'External image source';
          potentialMismatch = true;
        }
      } else if (data.imageId) {
        imageType = '📷 Placeholder';
        placeholderImages++;
        imageDescription = `Generic placeholder #${data.imageId}`;
        potentialMismatch = true;
      }

      console.log(`\n${i + 1}. ${data.title}`);
      console.log(`   Cuisine: ${data.cuisine || 'Not specified'}`);
      console.log(`   Image Type: ${imageType}`);
      console.log(`   Description: ${imageDescription}`);

      if (potentialMismatch) {
        console.log(`   ⚠️  MISMATCH RISK: Using generic image instead of cuisine-specific`);
        mismatches.push({
          title: data.title,
          cuisine: data.cuisine,
          imageType,
          recommendation: `Generate AI image matching ${data.cuisine} cuisine`
        });
      } else {
        console.log(`   ✅ MATCH: Custom image generated for this recipe`);
      }

      console.log('-'.repeat(90));
    });

    console.log('\n📊 SUMMARY STATISTICS\n');
    console.log(`Total Recipes: ${totalRecipes}`);
    console.log(`✨ AI-Generated Images: ${aiGeneratedImages} (${Math.round(aiGeneratedImages/totalRecipes*100)}%)`);
    console.log(`📷 Placeholder Images: ${placeholderImages} (${Math.round(placeholderImages/totalRecipes*100)}%)`);
    console.log(`🌐 External Images: ${externalImages} (${Math.round(externalImages/totalRecipes*100)}%)`);
    console.log(`⚠️  Potential Mismatches: ${mismatches.length} recipes`);

    if (mismatches.length > 0) {
      console.log('\n\n🔧 RECOMMENDATIONS TO FIX MISMATCHES:\n');
      console.log('='.repeat(90));
      mismatches.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title} (${item.cuisine})`);
        console.log(`   Current: ${item.imageType}`);
        console.log(`   Recommended: ${item.recommendation}`);
      });

      console.log('\n\n💡 TO FIX:');
      console.log('   1. Open each recipe in the UI');
      console.log('   2. Click "Edit Recipe"');
      console.log('   3. Use "Generate AI Images" button');
      console.log('   4. Select an image that matches the cuisine and dish');
      console.log('   5. Save the recipe');
    } else {
      console.log('\n✅ All recipes have appropriate custom images!');
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

analyzeRecipeImages();
