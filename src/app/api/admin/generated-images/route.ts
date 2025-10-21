import { NextResponse } from 'next/server';
import adminConfig from '../../../../../config/firebase-admin';

const { getAdmin } = adminConfig as unknown as { getAdmin: () => typeof import('firebase-admin') };

/**
 * API endpoint to get all generated images
 * GET /api/admin/generated-images?unused=true (optional: filter unused only)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unusedOnly = searchParams.get('unused') === 'true';

    console.log('🖼️ Admin: Fetching generated images', { unusedOnly });

    const admin = getAdmin();
    const db = admin.firestore();
    let query = db.collection('generated_images').orderBy('generatedAt', 'desc');

    // Filter for unused images if requested
    if (unusedOnly) {
      query = query.where('used', '==', false) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
    }

    const snapshot = await query.limit(100).get();

    const images = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      generatedAt: doc.data().generatedAt?.toDate?.()?.toISOString() || null,
      usedAt: doc.data().usedAt?.toDate?.()?.toISOString() || null,
    }));

    console.log(`📊 Found ${images.length} generated images`);

    return NextResponse.json({
      success: true,
      count: images.length,
      images
    });
  } catch (error) {
    console.error('Error fetching generated images:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE endpoint to clean up old unused images
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('daysOld') || '30');

    console.log(`🗑️ Admin: Deleting unused images older than ${daysOld} days`);

    const admin = getAdmin();
    const db = admin.firestore();
    const imagesRef = db.collection('generated_images');

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    // Find unused images older than cutoff
    const snapshot = await imagesRef
      .where('used', '==', false)
      .where('generatedAt', '<', cutoffTimestamp)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No old unused images found'
      });
    }

    // Delete the documents
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`✅ Deleted ${snapshot.size} old unused images`);

    return NextResponse.json({
      success: true,
      deleted: snapshot.size,
      message: `Deleted ${snapshot.size} unused images older than ${daysOld} days`
    });
  } catch (error) {
    console.error('Error deleting old images:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
