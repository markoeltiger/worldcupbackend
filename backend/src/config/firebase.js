'use strict';

/**
 * src/config/firebase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Admin SDK configuration for FCM notifications.
 *
 * RULES:
 * - Uses Firebase Admin SDK for push notifications
 * - Supports both service account and environment variable configuration
 * - Handles initialization errors gracefully
 */

const admin = require('firebase-admin');

// Firebase configuration from environment variables
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

/**
 * Initialize Firebase Admin SDK
 */
let firebaseApp = null;

function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if Firebase credentials are provided
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      console.warn('[Firebase] Firebase credentials not provided. FCM notifications will be disabled.');
      return null;
    }

    // Initialize Firebase Admin SDK with service account
    const serviceAccount = {
      project_id: FIREBASE_PROJECT_ID,
      client_email: FIREBASE_CLIENT_EMAIL,
      private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('[Firebase] Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (err) {
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', err.message);
    return null;
  }
}

/**
 * Get Firebase Admin instance
 */
function getFirebaseApp() {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

/**
 * Check if Firebase is enabled
 */
function isFirebaseEnabled() {
  return getFirebaseApp() !== null;
}

/**
 * Get messaging instance for FCM
 */
function getMessaging() {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  return admin.messaging(app);
}

module.exports = {
  initializeFirebase,
  getFirebaseApp,
  isFirebaseEnabled,
  getMessaging,
};
