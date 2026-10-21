/**
 * Firebase Admin SDK — lazy singleton.
 *
 * Initialisation is deferred to the first actual use (first call to
 * `getAdminDb()`).  This prevents module-level errors during `next build`
 * when the real service-account credentials aren't present in the build
 * environment.
 *
 * Auth strategy (in priority order):
 *  1. FIREBASE_SERVICE_ACCOUNT_JSON  — full JSON pasted as an env var
 *                                      (recommended for Vercel / cloud)
 *  2. GOOGLE_APPLICATION_CREDENTIALS — path to a JSON file (local dev)
 */

import {
  cert,
  getApps,
  getApp,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;

export function getAdminApp(): App {
  if (_app) return _app;

  // Already initialised (e.g. hot-reload in Next.js dev server)
  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (json) {
    let serviceAccount: object;
    try {
      serviceAccount = JSON.parse(json);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. " +
          "Paste the entire service-account file content as a single-line JSON string.",
      );
    }
    _app = initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    });
    return _app;
  }

  // Fall back to Application Default Credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    _app = initializeApp();
    return _app;
  }

  throw new Error(
    "Firebase Admin SDK is not configured. " +
      "Set FIREBASE_SERVICE_ACCOUNT_JSON (paste the full service-account JSON) or " +
      "GOOGLE_APPLICATION_CREDENTIALS (path to service-account file).",
  );
}

/**
 * Returns the lazy-initialised Firestore instance.
 * Call this inside route handlers and server actions — never at module scope.
 */
export function getAdminDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getAdminApp());
  return _db;
}

/**
 * @deprecated Import `getAdminDb()` instead for lazy initialisation.
 * Kept for any existing callers; will throw at runtime if credentials
 * are missing (intentional — it should not be imported at module scope).
 */
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getAdminDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
