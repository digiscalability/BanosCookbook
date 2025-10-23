import { NextRequest, NextResponse } from 'next/server';

import adminConfig from '../../../../../config/firebase-admin';

const { getAdmin } = adminConfig as unknown as { getAdmin: () => typeof import('firebase-admin') };

export const runtime = 'nodejs';

async function uploadBufferToFirebaseStorage(
  buffer: Buffer,
  filename: string,
  contentType = 'application/octet-stream'
) {
  const admin = getAdmin();

  // Resolve bucket (similar logic to images/upload route)
  async function resolveBucket() {
    const candidates: string[] = [];
    if (process.env.FIREBASE_STORAGE_BUCKET) candidates.push(process.env.FIREBASE_STORAGE_BUCKET);
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
    if (process.env.FIREBASE_PROJECT_ID) {
      candidates.push(`${process.env.FIREBASE_PROJECT_ID}.appspot.com`);
      candidates.push(`${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`);
    }

    const seen = new Set<string>();
    const uniq = candidates.filter(c => c && !seen.has(c) && (seen.add(c), true));

    for (const name of uniq) {
      try {
        const b = admin.storage().bucket(name);
        const existsResUnknown = await (
          b as unknown as { exists?: () => Promise<unknown> }
        ).exists?.();
        const exists = Array.isArray(existsResUnknown)
          ? (existsResUnknown as unknown[])[0] === true
          : Boolean(existsResUnknown);
        if (exists) return b;
      } catch (err) {
        console.warn('Bucket check failed for', name, err instanceof Error ? err.message : err);
      }
    }

    // Fallback default
    return admin.storage().bucket();
  }

  const bucket = await resolveBucket();
  const file = bucket.file(filename);
  await file.save(buffer, { metadata: { contentType } });

  // Try make public, otherwise signed URL
  try {
    const fileAsAny = file as unknown as {
      makePublic?: () => Promise<void>;
      getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
    };
    if (typeof fileAsAny.makePublic === 'function') {
      await fileAsAny.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${filename}`;
    }
  } catch (err) {
    console.warn('makePublic failed:', err);
  }

  try {
    const expires = Date.now() + 1000 * 60 * 60 * 24 * 365;
    const fileAsAny2 = file as unknown as {
      getSignedUrl?: (opts: { action: string; expires: number }) => Promise<string[]>;
    };
    if (typeof fileAsAny2.getSignedUrl === 'function') {
      const [signedUrl] = await fileAsAny2.getSignedUrl({ action: 'read', expires });
      return signedUrl as string;
    }
    return `https://storage.googleapis.com/${bucket.name}/${filename}`;
  } catch {
    return `https://storage.googleapis.com/${bucket.name}/${filename}`;
  }
}

// Guest upload limits + captcha and logging (similar to images/upload route)
async function enforceGuestUploadLimitsDrive(request: NextRequest, captchaToken?: string) {
  const admin = getAdmin();
  const authHeader = request.headers.get('authorization');
  if (authHeader) return; // authenticated bypass

  const ipRaw =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const ip = ipRaw.split(',')[0].trim();

  const limit = Number(process.env.GUEST_UPLOAD_LIMIT_PER_HOUR || '10');
  const windowMs = 60 * 60 * 1000;

  const ref = admin.firestore().collection('upload_rate_limits').doc(ip);
  const snap = await ref.get();
  const now = Date.now();
  const data = snap.exists ? (snap.data() as { count?: number; windowStart?: number }) : null;

  if (!data || typeof data.windowStart !== 'number' || now - (data.windowStart || 0) > windowMs) {
    await ref.set({ count: 1, windowStart: now }, { merge: true });
    return;
  }

  if ((data.count || 0) < limit) {
    await ref.update({ count: (data.count || 0) + 1 });
    return;
  }

  // Over limit: require captcha
  const secret = process.env.RECAPTCHA_SECRET;
  if (!captchaToken || !secret) {
    throw { status: 429, message: 'Rate limit exceeded: please complete CAPTCHA' };
  }

  const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(captchaToken)}&remoteip=${encodeURIComponent(ip)}`,
  });
  const verifyJson = await verifyRes.json();
  if (!verifyJson.success) {
    throw { status: 429, message: 'CAPTCHA verification failed' };
  }

  await ref.set({ count: 1, windowStart: now }, { merge: true });
}

async function logUploadEventDrive(event: {
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

export async function POST(request: NextRequest) {
  try {
    // Extract captcha token from header or form field (form will be parsed below if needed)
    const captchaTokenHeader = request.headers.get('x-captcha-token');
    let captchaToken = captchaTokenHeader || undefined;

    // Enforce guest limits before heavy processing
    try {
      await enforceGuestUploadLimitsDrive(request, captchaToken);
    } catch (limitErr: unknown) {
      const ipRaw =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-real-ip') ||
        'unknown';
      const ip = ipRaw.split(',')[0].trim();
      const limitObj =
        typeof limitErr === 'object' && limitErr !== null
          ? (limitErr as Record<string, unknown>)
          : null;
      const limitMsg =
        limitObj && 'message' in limitObj ? String(limitObj.message) : String(limitErr);
      const statusCode = limitObj && 'status' in limitObj ? Number(limitObj.status) : 429;
      await logUploadEventDrive({
        path: '/api/drive/upload',
        ip,
        success: false,
        reason: limitMsg,
      });
      return NextResponse.json(
        { error: limitMsg || 'Rate limit exceeded' },
        { status: statusCode || 429 }
      );
    }

    const form = await request.formData();
    if (!captchaToken) captchaToken = form.get('captcha')?.toString() || undefined;
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Dynamically import googleapis so build doesn't require it at build-time
    const mod = await import('googleapis').catch(err => {
      console.error('googleapis import failed:', err);
      return null;
    });
    if (!mod) {
      return NextResponse.json(
        { error: 'googleapis package not installed on server.' },
        { status: 500 }
      );
    }
    const { google } = mod as typeof import('googleapis');

    // Resolve service account credentials
    let creds: Record<string, unknown> | null = null;
    const saJson =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      try {
        creds = JSON.parse(saJson);
      } catch (err) {
        console.warn('Failed to parse service account JSON from env var:', err);
      }
    }

    if (!creds && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const fs = await import('fs/promises');
        const path = process.env.GOOGLE_APPLICATION_CREDENTIALS as string;
        const raw = await fs.readFile(path, 'utf8');
        creds = JSON.parse(raw);
      } catch (err) {
        console.warn('Failed to read GOOGLE_APPLICATION_CREDENTIALS file:', err);
      }
    }

    if (!creds) {
      return NextResponse.json(
        {
          error:
            'Service account credentials not configured (FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS).',
        },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: creds as unknown as Record<string, unknown>,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a readable stream from buffer
    const { Readable } = await import('stream');
    const readable = Readable.from(buffer);

    const folderId = process.env.DRIVE_FOLDER_ID || undefined;

    // Attempt Drive upload, fallback to Firebase Storage on known errors
    try {
      const createRes = await drive.files.create({
        requestBody: {
          name: file.name || `upload-${Date.now()}`,
          parents: folderId ? [folderId] : undefined,
        },
        media: {
          mimeType: file.type || 'application/octet-stream',
          body: readable as unknown,
        },
        fields: 'id,name,webViewLink,webContentLink',
      });

      const fileId = createRes.data?.id;
      if (!fileId) {
        throw new Error('Drive upload returned no file id');
      }

      try {
        await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
      } catch (permErr) {
        console.warn('Failed to set file permissions to anyoneWithLink:', permErr);
      }

      const meta = await drive.files.get({ fileId, fields: 'id,name,webViewLink,webContentLink' });
      const url =
        meta.data.webViewLink ||
        meta.data.webContentLink ||
        `https://drive.google.com/uc?id=${fileId}&export=download`;

      // Save link to Firestore (best-effort)
      try {
        const admin = getAdmin();
        const db = admin.firestore();
        await db.collection('drive_files').add({
          name: meta.data.name || null,
          fileId,
          url,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // log success
        try {
          const ipRaw =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-real-ip') ||
            'unknown';
          const ip = ipRaw.split(',')[0].trim();
          await logUploadEventDrive({
            path: '/api/drive/upload',
            ip,
            success: true,
            fallback: false,
          });
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Failed to save Drive file metadata to Firestore:', err);
      }

      return NextResponse.json({ url });
    } catch (driveErr: unknown) {
      console.warn('Drive upload failed, attempting Firebase Storage fallback:', driveErr);

      // Fallback: upload to Firebase Storage and return that URL
      try {
        const contentType = file.type || 'application/octet-stream';
        const ext = (contentType.split('/')[1] || 'bin').split('+')[0];
        const filename = `drive-fallback/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const url = await uploadBufferToFirebaseStorage(buffer, filename, contentType);
        // log fallback success
        try {
          const ipRaw =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-real-ip') ||
            'unknown';
          const ip = ipRaw.split(',')[0].trim();
          await logUploadEventDrive({
            path: '/api/drive/upload',
            ip,
            success: true,
            fallback: true,
          });
        } catch {
          // ignore
        }
        return NextResponse.json({ url, fallback: true });
      } catch (fallbackErr) {
        console.error('Firebase Storage fallback also failed:', fallbackErr);
        return NextResponse.json(
          { error: 'Upload failed (drive + storage fallback)' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Image upload to Drive error:', error);
    return NextResponse.json({ error: 'Upload failed', detail: String(error) }, { status: 500 });
  }
}
