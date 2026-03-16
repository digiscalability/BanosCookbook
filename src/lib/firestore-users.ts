import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from './firebase';
import type { UserProfile } from './types';

const USERS = 'users';

// ─── Serialization ────────────────────────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date } | null | undefined;
  if (maybe && typeof maybe.toDate === 'function') return maybe.toDate();
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function toProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    username: (data.username as string) ?? '',
    displayName: (data.displayName as string) ?? '',
    email: (data.email as string) ?? '',
    bio: (data.bio as string) ?? undefined,
    photoURL: (data.photoURL as string) ?? undefined,
    socialLinks: (data.socialLinks as UserProfile['socialLinks']) ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// ─── Username helpers ─────────────────────────────────────────────────────────

/** Converts any string into a valid username (lowercase, alphanumeric + underscore). */
export function slugifyUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
}

/** Returns true if the username is already taken. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const q = query(collection(db, USERS), where('username', '==', username));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Finds a unique variant of a base username by appending numbers until free. */
export async function findAvailableUsername(base: string): Promise<string> {
  const slug = slugifyUsername(base);
  if (!(await isUsernameTaken(slug))) return slug;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${slug.slice(0, 27)}_${i}`;
    if (!(await isUsernameTaken(candidate))) return candidate;
  }
  return `${slug.slice(0, 22)}_${Date.now().toString(36)}`;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Creates a user profile document (idempotent — safe to call after Google sign-in). */
export async function createUserProfile(
  uid: string,
  data: {
    username: string;
    displayName: string;
    email: string;
    photoURL?: string;
  }
): Promise<UserProfile> {
  const ref = doc(db, USERS, uid);
  const now = serverTimestamp();
  await setDoc(
    ref,
    {
      username: data.username,
      displayName: data.displayName,
      email: data.email,
      photoURL: data.photoURL ?? null,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return toProfile(uid, snap.data() as Record<string, unknown>);
}

/** Returns a user profile by Firebase UID, or null if not found. */
export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return toProfile(uid, snap.data() as Record<string, unknown>);
}

/** Returns a user profile by username, or null if not found. */
export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  const q = query(collection(db, USERS), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc_ = snap.docs[0];
  return toProfile(doc_.id, doc_.data() as Record<string, unknown>);
}

/** Updates editable fields of a user profile. */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'photoURL' | 'socialLinks'>>
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
