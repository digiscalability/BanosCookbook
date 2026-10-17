/**
 * Firebase Admin bootstrap for one-off scripts (migrations, book ingestion).
 *
 * Credentials, in order: FIREBASE_SERVICE_ACCOUNT_JSON, then Application Default
 * Credentials (`gcloud auth application-default login`). The project is explicit so
 * user ADC works. Set FIRESTORE_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST to
 * point a script at the local emulators instead of production.
 */
import { config as loadEnv } from 'dotenv';
import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';

loadEnv({ path: ['.env.local', '.env'] });

export const DEFAULT_PROJECT_ID = 'studio-4664575455-de3d2';

export function initAdmin(opts: { projectId?: string; storageBucket?: string } = {}): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = opts.projectId ?? process.env.FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return initializeApp({
    credential: sa ? cert(JSON.parse(sa)) : applicationDefault(),
    projectId,
    storageBucket:
      opts.storageBucket ??
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      `${projectId}.firebasestorage.app`,
  });
}

/** Minimal flag parser: --flag, --key value, --key=value. */
export function parseArgs(argv = process.argv.slice(2)) {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split('=', 2);
    if (inline !== undefined) flags[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { flags, positional };
}

export function targetLabel(): string {
  return process.env.FIRESTORE_EMULATOR_HOST
    ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `PRODUCTION project ${process.env.FIREBASE_PROJECT_ID ?? DEFAULT_PROJECT_ID}`;
}
