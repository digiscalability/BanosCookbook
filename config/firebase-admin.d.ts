// TypeScript declarations for firebase-admin.js

import type * as admin from 'firebase-admin';

/**
 * Lazy initializes Firebase Admin SDK
 * @throws {Error} If Firebase credentials are not configured
 */
export function getAdmin(): typeof admin;

/**
 * Gets Firestore database instance
 */
export function getDb(): admin.firestore.Firestore;

/**
 * Gets Firebase Storage instance
 */
export function getStorage(): admin.storage.Storage;

/**
 * Gets Firebase Auth instance
 */
export function getAuth(): admin.auth.Auth;

declare const adminConfig: {
  getAdmin: typeof getAdmin;
  getDb: typeof getDb;
  getStorage: typeof getStorage;
  getAuth: typeof getAuth;
};

export default adminConfig;
