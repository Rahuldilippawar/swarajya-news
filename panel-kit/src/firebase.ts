import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

// Each variable is referenced literally so Next.js can inline it at build time.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
const appCheckSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
const FUNCTIONS_REGION = "asia-south1";

export interface FirebaseClients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
}

export class FirebaseConfigError extends Error {
  constructor(missing: string[]) {
    super(`Firebase is not configured. Missing: ${missing.join(", ")}. Copy .env.example to .env.local and fill it in.`);
    this.name = "FirebaseConfigError";
  }
}

let clients: FirebaseClients | undefined;

/** Returns the Firebase clients, initialising them on first use (browser only). */
export function getFirebase(): FirebaseClients {
  if (clients) return clients;

  const missing = Object.entries(config)
    .filter(([key, value]) => !value && key !== "storageBucket" && key !== "messagingSenderId")
    .map(([key]) => key);
  if (missing.length > 0 && !(useEmulators && config.projectId)) throw new FirebaseConfigError(missing);

  const isNew = getApps().length === 0;
  const app = isNew ? initializeApp(config) : getApp();
  // App Check proves requests come from our panels. Enforcement is switched on
  // per service in the Firebase console once every client sends tokens.
  if (isNew && appCheckSiteKey && !useEmulators) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  }
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const storage = getStorage(app);

  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }

  clients = { app, auth, db, functions, storage };
  return clients;
}
