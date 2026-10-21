/**
 * GET /api/auth/callback
 *
 * Step 2 of the Shopify OAuth flow — the redirect URI Shopify calls after
 * the merchant authorises the app.
 *
 * Actions (in strict order — fail fast on any violation):
 *   1. Extract `shop`, `hmac`, `code`, `state` from query params.
 *   2. Verify the HMAC signature against the App Secret.
 *   3. Validate `state` against the HTTP-only cookie (CSRF check).
 *   4. Exchange `code` for a permanent offline access token.
 *   5. Persist the shop + token in Firestore.
 *   6. Fetch products, orders, and abandoned checkouts with the new token.
 *   7. Redirect the merchant to the success page.
 *
 * Reference: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant/implement-authorization-code-grant#step-2-verify-the-installation-request
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { verifyHmac } from "@/lib/shopify/hmac";
import { normaliseShop, SHOPIFY_STATE_COOKIE } from "@/lib/shopify/config";
import {
  exchangeCodeForToken,
  saveShopToken,
} from "@/lib/shopify/token-exchange";
import { 
  fetchAllShopData
} from "@/lib/shopify/fetch-shop-data";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // ── 1. Extract required params ──────────────────────────────────────
  const rawShop = searchParams.get("shop");
  const hmac    = searchParams.get("hmac");
  const code    = searchParams.get("code");
  const state   = searchParams.get("state");

  if (!rawShop || !hmac || !code || !state) {
    return errorResponse(
      "Missing required OAuth callback parameters: shop, hmac, code, state.",
      400,
    );
  }

  // ── 2. Validate shop domain ──────────────────────────────────────────
  let shop: string;
  try {
    shop = normaliseShop(rawShop);
  } catch (err) {
    return errorResponse((err as Error).message, 400);
  }

  // ── 3. Verify HMAC signature ─────────────────────────────────────────
  // This MUST be done before any other processing to ensure the request
  // genuinely came from Shopify and was not tampered with.
  const hmacValid = await verifyHmac(searchParams);
  if (!hmacValid) {
    console.error(`[Shopify OAuth] HMAC verification failed for shop: ${shop}`);
    return errorResponse("HMAC verification failed. Request rejected.", 401);
  }

  // ── 4. Validate state (CSRF check) ───────────────────────────────────
  const cookieStore = await cookies();
  const cookieState = cookieStore.get(SHOPIFY_STATE_COOKIE)?.value;

  if (!cookieState || cookieState !== state) {
    console.error(
      `[Shopify OAuth] State mismatch for shop: ${shop}. ` +
        `Expected: ${cookieState}, Got: ${state}`,
    );
    return errorResponse(
      "State mismatch. Possible CSRF attack. Request rejected.",
      403,
    );
  }

  // Clear the state cookie — it's single-use.
  cookieStore.delete(SHOPIFY_STATE_COOKIE);

  // ── 5. Exchange authorization code for access token ─────────────────
  let accessToken: string;
  let scope: string;
  try {
    const tokenResponse = await exchangeCodeForToken(shop, code);
    accessToken = tokenResponse.access_token;
    scope       = tokenResponse.scope;
    console.log(
      `[Shopify OAuth] Token exchange successful for shop: ${shop}. Scopes: ${scope}`,
    );
  } catch (err) {
    console.error("[Shopify OAuth] Token exchange error:", err);
    return errorResponse(
      `Failed to exchange authorization code: ${(err as Error).message}`,
      500,
    );
  }

  // ── 6. Fetch products, orders, abandoned checkouts FIRST ────────────
  let products: any[] = [];
  let orders: any[] = [];
  let abandonedCheckouts: any[] = [];

  try {
    const data = await fetchAllShopData(shop, accessToken);
    products = data.products;
    orders = data.orders;
    abandonedCheckouts = data.abandonedCheckouts;
    console.log(
      `[Shopify OAuth] Shop data fetched for: ${shop} - ` +
      `Products: ${products.length}, Orders: ${orders.length}, Carts: ${abandonedCheckouts.length}`
    );
  } catch (err) {
    console.error(`[Shopify OAuth] Failed to fetch data for ${shop}:`, err);
    // Continue with empty arrays - don't fail the install
  }

  // ── 7. Save EVERYTHING to Firestore in ONE WRITE ────────────────────
  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = getAdminDb();
    
    await db.collection("shopify_installs").doc(shop).set({
      shop,
      accessToken,
      scope,
      products,
      orders,
      abandoned_checkouts: abandonedCheckouts,
      installedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastDataFetch: new Date().toISOString(),
    });
    
    console.log(`[Shopify OAuth] All data saved to Firestore for: ${shop}`);
  } catch (err) {
    console.error("[Shopify OAuth] Firestore save error:", err);
    return errorResponse(
      `Failed to save shop data: ${(err as Error).message}`,
      500,
    );
  }

  // ── 8. Redirect merchant to success page ────────────────────────────
  const successUrl = new URL("/install/success", request.nextUrl.origin);
  successUrl.searchParams.set("shop", shop);
  return NextResponse.redirect(successUrl.toString());
}

/** Return a simple JSON error response with a consistent shape. */
function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
