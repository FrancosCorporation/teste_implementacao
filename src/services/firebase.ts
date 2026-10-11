import type { FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

let appPromise: Promise<FirebaseApp> | null = null;

async function getFirebaseApp() {
  if (!isFirebaseConfigured) throw new Error('Firebase não está configurado.');
  appPromise ??= import('firebase/app').then(({ getApp, getApps, initializeApp }) => (
    getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  ));
  return appPromise;
}

export async function loadFirebaseAuth() {
  const [app, sdk] = await Promise.all([getFirebaseApp(), import('firebase/auth')]);
  return { auth: sdk.getAuth(app), sdk };
}

export async function loadRealtimeDatabase() {
  const [app, sdk] = await Promise.all([getFirebaseApp(), import('firebase/database')]);
  return { database: sdk.getDatabase(app), sdk };
}
