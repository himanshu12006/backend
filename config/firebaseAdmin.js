// backend/config/firebaseAdmin.js
// PURPOSE: Initialize the Firebase Admin SDK using the modern modular API (firebase-admin v12+)
//
// firebase-admin v12+ uses sub-path imports:
//   require('firebase-admin/app')   → initializeApp, cert, getApps
//   require('firebase-admin/auth')  → getAuth
//
// This replaces the old pattern of:
//   const admin = require('firebase-admin');
//   admin.credential.cert(...)   ← THIS BREAKS in v12+

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const projectId    = process.env.FIREBASE_PROJECT_ID;
const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;

// The private key in .env is stored with literal \n characters.
// We must replace them with actual newlines before passing to the SDK.
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!projectId || !clientEmail || !privateKey) {
  console.warn(
    '⚠️  FIREBASE WARNING: Missing credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env'
  );
} else {
  // Prevent re-initializing if already initialized (nodemon hot reload safety)
  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
      console.log('🔒 Firebase Admin SDK initialized successfully.');
    } catch (err) {
      console.error('❌ Firebase Admin SDK initialization failed:', err.message);
    }
  } else {
    console.log('🔒 Firebase Admin SDK already initialized — skipping.');
  }
}

// Export getAuth so the controller can call getAuth().verifyIdToken()
module.exports = { getAuth };
