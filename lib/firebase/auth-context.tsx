"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth, googleProvider } from "./config";
import { clearSessionCookie, setSessionCookie } from "./auth-actions";
import { getAuthErrorMessage } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────── */

interface AuthContextValue {
  /** Current Firebase user (null when signed out or initialising). */
  user: User | null;
  /** True while the initial `onAuthStateChanged` round-trip is in flight. */
  loading: boolean;
  /** Last auth error message, or null. */
  error: string | null;
  /** Clear the current error. */
  clearError: () => void;
  /** Sign in with email + password. Throws on failure. */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Create a new account, then set the display name. Throws on failure. */
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  /** Sign in with Google popup. Throws on failure. */
  signInWithGoogle: () => Promise<void>;
  /** Sign out and clear the session cookie. Throws on failure. */
  signOut: () => Promise<void>;
  /** Send a password reset email. Throws on failure. */
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ── Provider ──────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Subscribe to Firebase auth state changes.
   *
   * On every change we sync an HTTP-only session cookie via a server
   * action so middleware can guard routes without a client round-trip.
   *
   * A 5-second safety timeout ensures `loading` always resolves even
   * if Firebase can't reach its servers (e.g. bad config / offline).
   */
  useEffect(() => {
    // Safety net: stop showing the spinner after 5 s regardless.
    const timeout = setTimeout(() => setLoading(false), 5000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        clearTimeout(timeout);
        setUser(firebaseUser);
        setLoading(false);

        try {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            await setSessionCookie(token);
          } else {
            await clearSessionCookie();
          }
        } catch (err) {
          // Cookie sync failures are non-fatal — the client SDK still
          // has the auth state.  Log for debugging.
          console.warn("Session cookie sync failed:", err);
        }
      },
      (err) => {
        // onAuthStateChanged error callback — clears the spinner too.
        clearTimeout(timeout);
        console.error("Firebase auth error:", err);
        setLoading(false);
      },
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        // Sync the session cookie immediately so middleware can verify
        // the route guard before the redirect lands on a protected page.
        const token = await credential.user.getIdToken();
        await setSessionCookie(token);
      } catch (err) {
        const message = getAuthErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      setError(null);
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(credential.user, { displayName });
        const token = await credential.user.getIdToken();
        await setSessionCookie(token);
      } catch (err) {
        const message = getAuthErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
        const token = await result.user.getIdToken();
        await setSessionCookie(token);
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      await clearSessionCookie();
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      clearError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      resetPassword,
    }),
    [
      user,
      loading,
      error,
      clearError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      resetPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ── Hook ──────────────────────────────────────────────────────────── */

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
