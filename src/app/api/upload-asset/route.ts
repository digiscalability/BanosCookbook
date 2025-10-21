/**
 * API Route: Upload Asset to Firebase Storage
 * Handles video, image, audio, subtitle file uploads
 */

import type { EditorAsset } from '@/components/video-editor/types';
import { NextRequest, NextResponse } from 'next/server';
import adminConfig from '../../../../config/firebase-admin';

const { getAdmin, getDb, getStorage } = adminConfig;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const recipeId = formData.get('recipeId') as string;
    const assetType = formData.get('assetType') as string;

    if (!file || !recipeId || !assetType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🎬 Uploading asset:', {
      filename: file.name,
      size: file.size,
      type: assetType,
    });

    // Initialize Firebase Admin
    const admin = getAdmin();
    const db = getDb();
    const storage = getStorage();
    const bucket = storage.bucket();

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `assets/${recipeId}/${assetType}/${timestamp}-${sanitizedFilename}`;

    // Upload to Firebase Storage
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
      contentType: file.type,
      metadata: {
        contentType: file.type,
        metadata: {
          recipeId,
          assetType,
          originalName: file.name,
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Generate metadata
    const metadata: Record<string, unknown> = {
      format: file.type.split('/')[1] || 'unknown',
    };

    // For video files, you might want to extract duration, dimensions, etc.
    // For now, we'll use placeholder values
    let duration: number | undefined;
    let dimensions: { width: number; height: number } | undefined;

    if (assetType === 'video') {
      // TODO: Extract video metadata using ffprobe or similar
      duration = 10; // Placeholder
      dimensions = { width: 1280, height: 720 }; // Placeholder
    } else if (assetType === 'audio') {
      // TODO: Extract audio duration
      duration = 10; // Placeholder
    } else if (assetType === 'image') {
      // TODO: Extract image dimensions
      dimensions = { width: 1920, height: 1080 }; // Placeholder
    }

    // Create asset document
    const assetId = `asset-${timestamp}`;
    const asset: EditorAsset = {
      id: assetId,
      recipeId,
      type: assetType as 'video' | 'audio' | 'image' | 'subtitle',
      url,
      storagePath,
      filename: file.name,
      fileSize: file.size,
      duration,
      dimensions,
      metadata,
      createdAt: new Date(),
    };

    // Save to Firestore
    await db.collection('asset_library').doc(assetId).set({
      ...asset,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('🎬 Asset uploaded successfully:', assetId);

    return NextResponse.json({
      success: true,
      assetId,
      url,
      asset,
    });
  } catch (error) {
    console.error('🎬 Upload asset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle FormData
  },
};
