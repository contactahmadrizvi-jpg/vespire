"use server";

import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./admin";
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
} from "./constants";

/**
 * Server actions that manage the HTTP-only session cookie.
 *
 * The Firebase client SDK handles auth state in the browser, but the
 * cookie lets Next.js middleware protect routes on the server side
 * without shipping the token to client JS.
 */

/** Persist the Firebase ID token in an HTTP-only cookie so middleware can guard routes. */
export async function setSessionCookie(idToken: string): Promise<void> {
  const auth = getAuth(getAdminApp());
  await auth.verifyIdToken(idToken, true);
  const session = await auth.createSessionCookie(idToken, { expiresIn: SESSION_COOKIE_MAX_AGE * 1000 });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });
}

/** Remove the session cookie (called on sign-out or when auth state clears). */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Light-weight check used by server components / layouts to decide
 * whether a user *might* be authenticated.  The actual Firebase token
 * verification still happens client-side via `onAuthStateChanged`.
 */
export async function hasSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(SESSION_COOKIE_NAME);
}
