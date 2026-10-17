import { getApp, getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore/lite";

// The website only reads published content, anonymously, through the
// REST-based Firestore Lite client — the same Security Rules apply to it as
// to any visitor, so it can never read drafts.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
export const FUNCTIONS_REGION = "asia-south1";

let db: Firestore | null | undefined;

/** Firestore, or null when the site is built without Firebase configuration (pages then show empty states). */
export function getDb(): Firestore | null {
  if (db !== undefined) return db;
  if (!config.projectId || (!useEmulators && !config.apiKey)) {
    db = null;
    return db;
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  db = getFirestore(app);
  if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return db;
}

/** Base URL of the HTTP Cloud Functions (overridable for custom domains). */
export function functionsOrigin(): string | null {
  if (process.env.NEXT_PUBLIC_FUNCTIONS_ORIGIN) return process.env.NEXT_PUBLIC_FUNCTIONS_ORIGIN.replace(/\/+$/, "");
  const project = config.projectId;
  if (!project) return null;
  return useEmulators
    ? `http://127.0.0.1:5001/${project}/${FUNCTIONS_REGION}`
    : `https://${FUNCTIONS_REGION}-${project}.cloudfunctions.net`;
}
