import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names intelligently — later classes win over
 * earlier ones, and conditional classes are supported via clsx.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Maps a Firebase Auth error code (or generic Error) to a human-friendly
 * message.  Firebase error objects carry a `code` string like
 * `auth/wrong-password`; we map the common ones and fall back to the
 * error message or a generic prompt.
 */
export function getAuthErrorMessage(error: unknown): string {
  // Firebase errors expose a `code` property.
  const code =
    (error as { code?: string })?.code ??
    (error as { error?: { code?: string } })?.error?.code ??
    "";

  const messages: Record<string, string> = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-disabled": "This account has been disabled. Contact support.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/missing-password": "Please enter your password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a minute and try again.",
    "auth/popup-closed-by-user":
      "The sign-in window was closed before completing.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/popup-blocked":
      "The sign-in popup was blocked by your browser. Allow popups and try again.",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled. Contact the administrator.",
    "auth/unauthorized-domain":
      "This domain is not authorized for sign-in. Contact the administrator.",
    "auth/configuration-not-found":
      "Firebase configuration error. Please contact support.",
  };

  if (code && messages[code]) {
    return messages[code];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

/**
 * Returns a human-readable countdown string for a rate-limit reset time.
 * e.g. "58s" or "1m 5s"
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
