/**
 * Sample Cloud Function to cleanup generated images older than TTL.
 * Deploy with Firebase Functions (Node 20 runtime recommended).
 * This uses Firestore to track uploaded images in 'generatedImages'.
 */

const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

exports.cleanupGeneratedImages = async (req, res) => {
  try {
    const ttlDays = Number(process.env.FIREBASE_GENERATED_TTL_DAYS || 30);
    const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

    // Query by expiresAt and uploadedAt fallback
    const q1 = await db.collection('generatedImages').where('expiresAt', '<', new Date()).get();
    const q2 = await db.collection('generatedImages').where('uploadedAt', '<', cutoff).get();

    const docsMap = new Map();
    for (const d of q1.docs) docsMap.set(d.id, d);
    for (const d of q2.docs) docsMap.set(d.id, d);

    for (const [id, doc] of docsMap.entries()) {
      const data = doc.data();
      if (!data.storagePath) continue;
      try {
        await storage.bucket().file(data.storagePath).delete();
        await doc.ref.delete();
        console.log(`Deleted ${data.storagePath} and ${id}`);
      } catch (err) {
        console.error(`Failed to delete ${data.storagePath}:`, err);
      }
    }

    res.status(200).send({ deleted: docsMap.size });
  } catch (err) {
    console.error('Cleanup function error:', err);
    res.status(500).send({ error: String(err) });
  }
};
