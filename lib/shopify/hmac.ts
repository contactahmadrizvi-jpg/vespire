/**
 * Shopify HMAC verification.
 *
 * Shopify signs every OAuth callback by appending an `hmac` query parameter.
 * To verify it we:
 *   1. Remove `hmac` from the query params.
 *   2. Sort the remaining params alphabetically by key.
 *   3. Build a `key=value&key=value` message string.
 *   4. Compute HMAC-SHA256 of that message using the App Secret as the key.
 *   5. Compare (constant-time) to the provided `hmac` hex digest.
 *
 * Uses the Web Crypto API (available in Node 18+ and all Edge runtimes)
 * so no extra dependencies are needed.
 *
 * Reference: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant/implement-authorization-code-grant#step-2-verify-the-installation-request
 */

import { SHOPIFY_API_SECRET } from "./config";

/**
 * Verify the `hmac` signature on a Shopify OAuth callback URL.
 *
 * @param searchParams  The full URLSearchParams from the callback request.
 * @returns             `true` if the signature is valid, `false` otherwise.
 */
export async function verifyHmac(
  searchParams: URLSearchParams,
): Promise<boolean> {
  const receivedHmac = searchParams.get("hmac");
  if (!receivedHmac) return false;

  // Step 1: build the message — all params except `hmac`, sorted by key.
  const params: [string, string][] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac") continue;
    // Percent-encode `%` and `&` in values per Shopify spec.
    params.push([key, value.replace(/%/g, "%25").replace(/&/g, "%26")]);
  }
  params.sort(([a], [b]) => a.localeCompare(b));
  const message = params.map(([k, v]) => `${k}=${v}`).join("&");

  // Step 2: import the secret key.
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SHOPIFY_API_SECRET()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Step 3: sign the message.
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(message),
  );

  // Step 4: convert to hex.
  const computedHmac = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Step 5: constant-time comparison to prevent timing attacks.
  return constantTimeEqual(computedHmac, receivedHmac);
}

/**
 * Constant-time string comparison.
 * Avoids timing-based HMAC oracle attacks by always iterating the full length.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
