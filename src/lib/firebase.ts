// src/lib/firebase.ts
// Firebase SDK initialization for VoiceCast Studio.
// Reads config from VITE_FIREBASE_* environment variables.
// Exports auth and db instances for use across the app.
// Firebase features are optional — the app works without them (localStorage only).

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config from environment variables (set in .env.local)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize Firebase if config is present (all required fields)
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = isConfigured ? initializeApp(firebaseConfig) : null;

/** Firebase Auth instance (null if Firebase is not configured) */
export const auth = app ? getAuth(app) : null;

/** Firestore instance (null if Firebase is not configured) */
export const db = app ? getFirestore(app) : null;

/** Google auth provider for sign-in */
export const googleProvider = new GoogleAuthProvider();

/** Whether Firebase is configured and available */
export const isFirebaseConfigured = isConfigured;
