import { NextRequest, NextResponse } from 'next/server';

import { authFailure, requireAdmin } from '@/server/auth/require-admin';

import adminConfig from '../../../../../config/firebase-admin';

export const runtime = 'nodejs';

const { getAdmin } = adminConfig as unknown as { getAdmin: () => typeof import('firebase-admin') };

export async function POST(request: NextRequest) {
  // Admin only: uploads are made public in the bucket. (Replaces the old guest
  // limit, which any `Authorization` header bypassed.)
  try {
    await requireAdmin(request);
  } catch (err) {
    return authFailure(err);
  }

  async function logUploadEvent(event: {
    path: string;
    ip: string;
    success: boolean;
    reason?: string;
    fallback?: boolean;
  }) {
    try {
      const admin = getAdmin();
      await admin
        .firestore()
        .collection('upload_events')
        .add({
          path: event.path,
          ip: event.ip,
          success: event.success,
          reason: event.reason || null,
          fallback: event.fallback || false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
      console.warn('Failed to log upload event', e);
    }
  }
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const admin = getAdmin();

    // Resolve a valid GCS bucket to use. Try env var, app config, and common fallbacks.
    async function resolveBucket() {
      const candidates: string[] = [];
      if (process.env.FIREBASE_STORAGE_BUCKET) candidates.push(process.env.FIREBASE_STORAGE_BUCKET);
      // App-level configured bucket (if any)
      try {
        const apps = admin.apps as unknown as Array<{ options?: Record<string, unknown> }>;
        if (apps && apps.length > 0 && apps[0].options) {
          const opts = apps[0].options as Record<string, unknown>;
          if (typeof opts.storageBucket === 'string' && opts.storageBucket)
            candidates.push(opts.storageBucket as string);
          if (typeof opts.projectId === 'string' && opts.projectId) {
            const pid = opts.projectId as string;
            candidates.push(`${pid}.appspot.com`);
            candidates.push(`${pid}.firebasestorage.app`);
          }
        }
      } catch (err) {
        console.warn('Failed to inspect admin.apps options for bucket resolution', err);
      }

      // Also check common environment keys
      if (process.env.FIREBASE_PROJECT_ID) {
        candidates.push(`${process.env.FIREBASE_PROJECT_ID}.appspot.com`);
        candidates.push(`${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`);
      }

      // Deduplicate
      const seen = new Set<string>();
      const uniq = candidates.filter(c => {
        if (!c) return false;
        if (seen.has(c)) return false;
        seen.add(c);
        return true;
      });

      for (const name of uniq) {
        try {
          const b = admin.storage().bucket(name);
          // bucket.exists() returns [boolean]
          // Some environments may not allow metadata checks; guard with try/catch
          const existsResUnknown = await (
            b as unknown as { exists?: () => Promise<unknown> }
          ).exists?.();
          const exists = Array.isArray(existsResUnknown)
            ? (existsResUnknown as unknown[])[0] === true
            : Boolean(existsResUnknown);
          if (exists) {
            console.warn('Resolved storage bucket:', name);
            return b;
          }
        } catch {
          console.warn('Bucket check failed for', name);
        }
      }

      // Fallback: return default bucket (may throw if not configured)
      try {
        const fallback = admin.storage().bucket();
        return fallback;
      } catch (err) {
        console.error('No valid storage bucket found');
        throw err;
      }
    }

    const bucket = await resolveBucket();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || 'application/octet-stream';
    if (!contentType.startsWith('image/') || file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Only images up to 15 MB' }, { status: 400 });
    }
    const ext = (contentType.split('/')[1] || 'bin').split('+')[0];
    const filename = `recipes/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const f = bucket.file(filename);

    await f.save(buffer, { metadata: { contentType } });

    // Try to make public, fall back to signed URL
    let publicUrl: string | undefined;
    try {
      const fileAsAny = f as unknown as {
        makePublic?: () => Promise<void>;
        getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
      };
      if (typeof fileAsAny.makePublic === 'function') {
        await fileAsAny.makePublic();
        publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      }
    } catch (err) {
      console.warn('makePublic failed for upload route', err);
    }

    if (!publicUrl) {
      try {
        const expires = Date.now() + 1000 * 60 * 60 * 24 * 365;
        const fileAsAny = f as unknown as {
          getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
        };
        if (typeof fileAsAny.getSignedUrl === 'function') {
          const [signedUrl] = await fileAsAny.getSignedUrl({ action: 'read', expires });
          publicUrl = signedUrl;
        }
      } catch {
        console.warn('getSignedUrl failed for upload route');
      }
    }

    const outUrl = publicUrl ?? `https://storage.googleapis.com/${bucket.name}/${filename}`;
    // log success
    try {
      const ipRaw =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const ip = ipRaw.split(',')[0].trim();
      await logUploadEvent({ path: '/api/images/upload', ip, success: true, fallback: false });
    } catch {
      // ignore
    }

    return NextResponse.json({ url: outUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    // Try to log the failure
    try {
      const admin = getAdmin();
      const ipRaw =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const ip = ipRaw.split(',')[0].trim();
      await admin
        .firestore()
        .collection('upload_events')
        .add({
          path: '/api/images/upload',
          ip,
          success: false,
          reason: String(error),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch {
      // ignore
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
