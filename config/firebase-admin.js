// Firebase Admin SDK - initialized from environment variables
// This file is gitignored because it previously contained hardcoded credentials.
// Credentials are now read from FIREBASE_SERVICE_ACCOUNT_JSON env var.

let adminApp = null;

function initializeAdmin() {
  if (adminApp) return adminApp;

  const admin = require('firebase-admin');

  if (admin.apps.length > 0) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  // Fallback: build from individual FIREBASE_* env vars (set on Vercel)
  if (!credential && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    try {
      credential = admin.credential.cert({
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      });
    } catch (e) {
      console.warn('Failed to build credential from FIREBASE_* vars:', e.message);
    }
  }

  if (!credential) {
    // Last resort: application default credentials (works in GCP/Firebase hosting)
    try {
      credential = admin.credential.applicationDefault();
    } catch (e) {
      console.warn('No Firebase credentials found. Admin SDK features will be unavailable.');
      credential = null;
    }
  }

  const appOptions = {
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  };

  if (credential) {
    appOptions.credential = credential;
  }

  try {
    adminApp = admin.initializeApp(appOptions);
  } catch (e) {
    if (e.code === 'app/duplicate-app') {
      adminApp = admin.app();
    } else {
      throw e;
    }
  }

  return adminApp;
}

function getAdmin() {
  initializeAdmin();
  return require('firebase-admin');
}

function getDb() {
  initializeAdmin();
  return require('firebase-admin').firestore();
}

function getStorage() {
  initializeAdmin();
  return require('firebase-admin').storage();
}

function getAuth() {
  initializeAdmin();
  return require('firebase-admin').auth();
}

const adminConfig = {
  getAdmin,
  getDb,
  getStorage,
  getAuth,
};

module.exports = adminConfig;
module.exports.default = adminConfig;
module.exports.getAdmin = getAdmin;
module.exports.getDb = getDb;
module.exports.getStorage = getStorage;
module.exports.getAuth = getAuth;
