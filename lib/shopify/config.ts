/**
 * Shopify app configuration helpers.
 *
 * All values are sourced from server-side environment variables.
 * Nothing here uses NEXT_PUBLIC_ — these must never leak to the browser.
 */

/** Validate and return a required env var, throwing early if missing. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "Add it to .env.local (development) or your deployment platform.",
    );
  }
  return value;
}

export const SHOPIFY_API_KEY    = () => requireEnv("SHOPIFY_API_KEY");
export const SHOPIFY_API_SECRET = () => requireEnv("SHOPIFY_API_SECRET");
export const APP_URL = () => {
  const url = requireEnv("APP_URL");
  // Remove trailing slash if present
  return url.endsWith('/') ? url.slice(0, -1) : url;
};
export const SHOPIFY_SCOPES = () =>
  "read_products,read_orders,read_customers";

/**
 * The callback URL registered in the Shopify Partners Dashboard.
 * Must match exactly — including scheme and path.
 */
export const SHOPIFY_REDIRECT_URI = () =>
  `${APP_URL()}/api/auth/callback`;

/**
 * Validate that a shop domain looks like a real myshopify.com hostname.
 * Accepts both bare subdomain ("mystore") and full domain ("mystore.myshopify.com").
 * Returns the normalised full domain.
 *
 * Shopify's own validation rule:
 *   - Letters, numbers, and hyphens only
 *   - 3–255 characters before .myshopify.com
 *   - Must end with .myshopify.com
 */
export function normaliseShop(raw: string): string {
  // Strip protocol if the merchant accidentally included it
  let shop = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "");

  // Append the TLD if only the subdomain was given
  if (!shop.includes(".")) {
    shop = `${shop}.myshopify.com`;
  }

  // Strict regex per Shopify docs
  const VALID_SHOP = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  if (!VALID_SHOP.test(shop)) {
    throw new Error(
      `Invalid shop domain: "${raw}". ` +
        'Use the format "your-store.myshopify.com".',
    );
  }

  return shop;
}

/** Name of the HTTP-only cookie that carries the OAuth state nonce. */
export const SHOPIFY_STATE_COOKIE = "shopify_oauth_state";

/** Cookie lifetime for the state nonce — 10 minutes is ample for OAuth. */
export const SHOPIFY_STATE_COOKIE_MAX_AGE = 60 * 10; // seconds

/** Shopify Admin REST API version to use for all requests. */
export const SHOPIFY_API_VERSION = "2026-10";
