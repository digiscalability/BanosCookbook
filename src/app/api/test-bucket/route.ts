import { NextRequest, NextResponse } from 'next/server';
import adminConfig from '../../../../config/firebase-admin';

export const runtime = 'nodejs';

const { getAdmin } = adminConfig as unknown as { getAdmin: () => typeof import('firebase-admin') };

export async function GET(_request: NextRequest) {
  void _request;
  try {
    const admin = getAdmin();

    const tried: string[] = [];

    const candidates: string[] = [];
    if (process.env.FIREBASE_STORAGE_BUCKET) candidates.push(process.env.FIREBASE_STORAGE_BUCKET);
    try {
      const apps = (admin.apps as unknown) as Array<{ options?: Record<string, unknown> }>;
      if (apps && apps.length > 0 && apps[0].options) {
        const opts = apps[0].options as Record<string, unknown>;
        if (typeof opts.storageBucket === 'string' && opts.storageBucket) candidates.push(opts.storageBucket as string);
        if (typeof opts.projectId === 'string' && opts.projectId) {
          const pid = opts.projectId as string;
          candidates.push(`${pid}.appspot.com`);
          candidates.push(`${pid}.firebasestorage.app`);
        }
      }
    } catch {
      // ignore
    }
    if (process.env.FIREBASE_PROJECT_ID) {
      candidates.push(`${process.env.FIREBASE_PROJECT_ID}.appspot.com`);
      candidates.push(`${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`);
    }

    const seen = new Set<string>();
    const uniq = candidates.filter((c) => c && !seen.has(c) && (seen.add(c), true));

    let resolvedName: string | null = null;
    for (const name of uniq) {
      tried.push(name);
      try {
        const b = admin.storage().bucket(name);
        const existsResUnknown = await (b as unknown as { exists?: () => Promise<unknown> }).exists?.();
        const exists = Array.isArray(existsResUnknown) ? (existsResUnknown as unknown[])[0] === true : Boolean(existsResUnknown);
        if (exists) {
          resolvedName = name;
          break;
        }
      } catch {
        // capture and continue
        tried.push(`check-failed:${name}`);
      }
    }

    // If nothing matched, try default bucket (may throw)
    if (!resolvedName) {
      try {
        const defaultBucket = admin.storage().bucket();
        // bucket() may not have a name property easily readable; attempt exists
        const existsResUnknown = await (defaultBucket as unknown as { exists?: () => Promise<unknown> }).exists?.();
        const exists = Array.isArray(existsResUnknown) ? (existsResUnknown as unknown[])[0] === true : Boolean(existsResUnknown);
        if (exists) {
          // Attempt to extract name if possible
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            resolvedName = (defaultBucket as unknown as { name?: string }).name || 'default-bucket-resolved';
          } catch {
            resolvedName = 'default-bucket-resolved';
          }
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ ok: true, resolvedBucket: resolvedName, triedCandidates: tried });
  } catch (error) {
    console.error('test-bucket error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
