/**
 * Lightweight client-side rate limiter using an in-memory Map with a
 * sliding window.  This prevents rapid form submission abuse (brute-force
 * login attempts, signup spam, etc.).
 *
 * For production-grade protection you'd also enforce rate limits on the
 * server (Firebase already rate-limits auth endpoints, but the client
 * limiter gives instant feedback without a round-trip).
 *
 * Note: This is per-browser-session. A determined attacker could clear
 * localStorage / cookies, which is why server-side limits remain essential.
 */

interface RateLimitEntry {
  /** Number of attempts in the current window. */
  count: number;
  /** Timestamp (ms) when the window resets. */
  resetTime: number;
}

/** Keyed by an arbitrary string (e.g. `"login"` or `"signup:google"`). */
const store = new Map<string, RateLimitEntry>();

/** Garbage-collect expired entries every 60s to prevent unbounded growth. */
if (typeof window !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime) store.delete(key);
      }
    },
    60_000,
  );
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Remaining attempts in the current window. */
  remaining: number;
  /** Epoch ms when the limit resets (0 if no active window). */
  resetAt: number;
}

/**
 * Check (and increment) the rate limit for a given key.
 *
 * @param key           Unique identifier for the action (e.g. "login")
 * @param maxAttempts   Maximum attempts allowed per window
 * @param windowMs       Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or window expired → start fresh
  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }

  // Still within window and under limit
  if (entry.count < maxAttempts) {
    entry.count++;
    return {
      success: true,
      remaining: maxAttempts - entry.count,
      resetAt: entry.resetTime,
    };
  }

  // Limit exceeded
  return { success: false, remaining: 0, resetAt: entry.resetTime };
}

/** Reset the rate limit for a given key (e.g. after a successful login). */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Peek at remaining attempts without incrementing. */
export function getRateLimitRemaining(key: string, maxAttempts = 5): number {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.resetTime) return maxAttempts;
  return Math.max(0, maxAttempts - entry.count);
}

/** Peek at when the current window resets (null if no active window). */
export function getRateLimitResetTime(key: string): number | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.resetTime) return null;
  return entry.resetTime;
}

/** Check if a key is currently rate-limited (without incrementing). */
export function isRateLimited(key: string): boolean {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.resetTime) return false;
  return entry.count >= 5; // uses default maxAttempts
}

/** Convenience presets for auth actions. */
export const RATE_LIMITS = {
  login: { maxAttempts: 5, windowMs: 60_000 },          // 5 per minute
  signup: { maxAttempts: 3, windowMs: 60_000 },         // 3 per minute
  forgotPassword: { maxAttempts: 3, windowMs: 60_000 }, // 3 per minute
  google: { maxAttempts: 5, windowMs: 60_000 },         // 5 per minute
} as const;
