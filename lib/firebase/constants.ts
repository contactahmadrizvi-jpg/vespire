/**
 * Firebase auth constants that don't depend on the Firebase SDK.
 *
 * Kept separate from `config.ts` so that server-side code running in the
 * Edge runtime (e.g. middleware) can import the cookie name without
 * pulling the entire Firebase client SDK into the bundle.
 */

/** Name of the HTTP-only session cookie used by middleware for route guards. */
export const SESSION_COOKIE_NAME = "vespire-session";

/** Cookie lifetime: 7 days (the client SDK refreshes the underlying token). */
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // seconds
