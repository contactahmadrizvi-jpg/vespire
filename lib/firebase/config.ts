import { getApps, getApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";

/**
 * Firebase configuration sourced entirely from environment variables.
 * All keys use the NEXT_PUBLIC_ prefix because the Firebase client SDK
 * runs in the browser.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Validate that every required env var is present.  Throwing at module
 * load time surfaces misconfiguration early instead of a confusing
 * runtime auth error later.
 */
function validateConfig() {
  const required: (keyof typeof firebaseConfig)[] = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId",
  ];

  const missing = required.filter((key) => !firebaseConfig[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missing
        .map((k) => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`)
        .join(", ")}.  Copy .env.local.example to .env.local and fill in values from the Firebase Console.`,
    );
  }
}

/**
 * Initialise (or reuse) the Firebase app singleton.
 * `getApps()` avoids double-initialisation during hot reloads in dev.
 */
function initFirebase(): FirebaseApp {
  validateConfig();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const app: FirebaseApp = initFirebase();
export const auth: Auth = getAuth(app);

/** Pre-configured Google OAuth provider instance. */
export const googleProvider = new GoogleAuthProvider();

// Request fresh tokens and profile info on every Google sign-in.
googleProvider.setCustomParameters({ prompt: "select_account" });

// Re-export constants so existing imports from config.ts keep working,
// while middleware can import directly from ./constants to avoid
// pulling the Firebase SDK into the Edge runtime bundle.
export { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "./constants";
