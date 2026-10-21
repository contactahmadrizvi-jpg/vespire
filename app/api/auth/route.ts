/**
 * GET /api/auth
 *
 * Step 1 of the Shopify OAuth flow.
 *
 * Accepts:  ?shop=mystore.myshopify.com  (from the install page)
 * Actions:
 *   1. Validate the shop domain.
 *   2. Generate a cryptographically random `state` nonce (CSRF protection).
 *   3. Store the nonce in a short-lived HTTP-only cookie.
 *   4. Redirect the browser to Shopify's OAuth authorization URL.
 *
 * Reference: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant/implement-authorization-code-grant#step-1-generate-the-authorization-url
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  normaliseShop,
  SHOPIFY_API_KEY,
  SHOPIFY_REDIRECT_URI,
  SHOPIFY_SCOPES,
  SHOPIFY_STATE_COOKIE,
  SHOPIFY_STATE_COOKIE_MAX_AGE,
} from "@/lib/shopify/config";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawShop = searchParams.get("shop");

  // ── 1. Validate shop param ───────────────────────────────────────────
  if (!rawShop) {
    return NextResponse.json(
      { error: "Missing required query parameter: shop" },
      { status: 400 },
    );
  }

  let shop: string;
  try {
    shop = normaliseShop(rawShop);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }

  // ── 2. Generate a random state nonce ────────────────────────────────
  // 32 bytes → 64 hex chars — enough entropy to prevent CSRF forgery.
  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // ── 3. Persist the nonce in an HTTP-only cookie ──────────────────────
  const cookieStore = await cookies();
  cookieStore.set(SHOPIFY_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SHOPIFY_STATE_COOKIE_MAX_AGE,
    path: "/",
  });

  // ── 4. Build and return the Shopify authorization URL ───────────────
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", SHOPIFY_API_KEY());
  authUrl.searchParams.set("scope", SHOPIFY_SCOPES());
  authUrl.searchParams.set("redirect_uri", SHOPIFY_REDIRECT_URI());
  authUrl.searchParams.set("state", state);

  // Debug log - check Vercel function logs to see actual values
  console.log('[OAuth] Redirect URI:', SHOPIFY_REDIRECT_URI());
  console.log('[OAuth] APP_URL:', APP_URL());
  console.log('[OAuth] Full auth URL:', authUrl.toString());

  return NextResponse.redirect(authUrl.toString());
}
