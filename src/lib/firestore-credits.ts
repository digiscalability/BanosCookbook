/**
 * Runway ML credit tracking per user.
 *
 * Free tier:   2 videos/month
 * Creator:    15 videos/month  ($19/mo — to be enforced when Stripe is wired up)
 * Pro:       unlimited         ($49/mo)
 *
 * Collection: user_credits/{userId}
 * {
 *   monthKey: "2026-03",   // current billing month
 *   videosThisMonth: 3,    // count within that month
 *   videosAllTime: 12,     // lifetime total
 *   tier: "free" | "creator" | "pro",
 *   lastUpdatedAt: Timestamp
 * }
 */

import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from './firebase';

export type CreditTier = 'free' | 'creator' | 'pro';

export interface UserCredits {
  userId: string;
  monthKey: string;
  videosThisMonth: number;
  videosAllTime: number;
  tier: CreditTier;
}

const CREDITS = 'user_credits';
const MONTHLY_LIMITS: Record<CreditTier, number> = {
  free: 2,
  creator: 15,
  pro: Infinity,
};

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function getOrCreateCredits(userId: string): Promise<UserCredits> {
  const ref = doc(db, CREDITS, userId);
  const snap = await getDoc(ref);
  const currentMonth = monthKey();

  if (!snap.exists()) {
    const fresh: Omit<UserCredits, 'userId'> & { lastUpdatedAt: unknown } = {
      monthKey: currentMonth,
      videosThisMonth: 0,
      videosAllTime: 0,
      tier: 'free',
      lastUpdatedAt: serverTimestamp(),
    };
    await setDoc(ref, fresh);
    return { userId, ...fresh, lastUpdatedAt: undefined } as UserCredits;
  }

  const data = snap.data() as Record<string, unknown>;
  // Roll over counter when month changes
  if ((data.monthKey as string) !== currentMonth) {
    await updateDoc(ref, { monthKey: currentMonth, videosThisMonth: 0, lastUpdatedAt: serverTimestamp() });
    return {
      userId,
      monthKey: currentMonth,
      videosThisMonth: 0,
      videosAllTime: Number(data.videosAllTime ?? 0),
      tier: (data.tier as CreditTier) ?? 'free',
    };
  }

  return {
    userId,
    monthKey: (data.monthKey as string) ?? currentMonth,
    videosThisMonth: Number(data.videosThisMonth ?? 0),
    videosAllTime: Number(data.videosAllTime ?? 0),
    tier: (data.tier as CreditTier) ?? 'free',
  };
}

/** Returns current credits for a user. */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  return getOrCreateCredits(userId);
}

/** Returns true if the user can generate another video this month. */
export async function canGenerateVideo(userId: string): Promise<boolean> {
  const credits = await getOrCreateCredits(userId);
  return credits.videosThisMonth < MONTHLY_LIMITS[credits.tier];
}

/** Returns videos remaining this month (-1 = unlimited for Pro). */
export async function videosRemaining(userId: string): Promise<number> {
  const credits = await getOrCreateCredits(userId);
  if (credits.tier === 'pro') return -1;
  return Math.max(0, MONTHLY_LIMITS[credits.tier] - credits.videosThisMonth);
}

/**
 * Increments the video count after a successful generation.
 * Call this AFTER Runway ML returns successfully, not before.
 */
export async function recordVideoGenerated(userId: string): Promise<void> {
  const ref = doc(db, CREDITS, userId);
  // Ensure the doc exists and month is current before incrementing
  await getOrCreateCredits(userId);
  await updateDoc(ref, {
    videosThisMonth: increment(1),
    videosAllTime: increment(1),
    lastUpdatedAt: serverTimestamp(),
  });
}

/** Returns the monthly limit for a given tier. */
export function getMonthlyLimit(tier: CreditTier): number {
  return MONTHLY_LIMITS[tier];
}
