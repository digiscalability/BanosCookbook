require('dotenv/config');
const firebaseAdminModule = require('../config/firebase-admin.js');

async function main() {
  const db = firebaseAdminModule.getDb();
  const recipeId = 'debug-recipe';
  const recipeDocRef = db.collection('recipes').doc(recipeId);
  await recipeDocRef.set({
    title: 'Debug Pasta Primavera',
    author: 'Video Hub Bot',
    createdAt: new Date(),
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
    description: 'Sanity-check recipe for video hub testing',
  }, { merge: true });

  const sampleVideos = [
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  ];

  await db.collection('multi_scene_video_scripts').doc(recipeId).set({
    recipeId,
    recipeTitle: 'Debug Pasta Primavera',
    scenes: [
      {
        sceneNumber: 1,
        description: 'Chop veggies',
        script: 'Dice bell peppers and onions for a colorful base.',
        duration: 5,
        advancedOptions: {
          duration: 5,
          animation: { enabled: true, style: 'subtle_kenburns' },
        },
      },
      {
        sceneNumber: 2,
        description: 'Sauté and serve',
        script: 'Sauté vegetables, toss with pasta, and plate with herbs.',
        duration: 5,
        advancedOptions: {
          duration: 5,
          voice: { enabled: true, text: 'Finish with fresh herbs for brightness.' },
        },
      },
    ],
    sceneVideos: sampleVideos.map((videoUrl, index) => ({
      sceneNumber: index + 1,
      videoUrl,
      script: index === 0
        ? 'Dice bell peppers and onions for a colorful base.'
        : 'Sauté vegetables, toss with pasta, and plate with herbs.',
      duration: 5,
      videoGeneratedAt: new Date(),
    })),
    updatedAt: new Date(),
    marketingIdeas: [
      'Ask viewers for their favorite veggie add-in',
      'Promote colorful, healthy weeknight dinners',
    ],
  }, { merge: true });

  console.log('Seeded debug multi-scene document for recipe:', recipeId);
}

main().catch((err) => {
  console.error('seed-debug-multiscene failed:', err);
  process.exitCode = 1;
});
