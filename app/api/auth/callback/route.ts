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
  fetchAllShopDataGraphQL
} from "@/lib/shopify/graphql-fetch";

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
  let expiresIn: number | undefined;
  try {
    const tokenResponse = await exchangeCodeForToken(shop, code);
    accessToken = tokenResponse.access_token;
    scope       = tokenResponse.scope;
    expiresIn   = tokenResponse.expires_in;
    console.log(
      `[Shopify OAuth] Token exchange successful for shop: ${shop}. ` +
      `Scopes: ${scope}, Expires in: ${expiresIn ? `${expiresIn}s` : 'never'}`,
    );
  } catch (err) {
    console.error("[Shopify OAuth] Token exchange error:", err);
    return errorResponse(
      `Failed to exchange authorization code: ${(err as Error).message}`,
      500,
    );
  }

  // ── 6. Fetch products, orders using GraphQL (avoids token issues) ────
  let products: any[] = [];
  let orders: any[] = [];

  try {
    console.log(`[Shopify OAuth] Starting GraphQL data fetch for: ${shop}`);
    const data = await fetchAllShopDataGraphQL(shop, accessToken);
    products = data.products;
    orders = data.orders;
    console.log(
      `[Shopify OAuth] ✅ GraphQL data fetched for: ${shop} - ` +
      `Products: ${products.length}, Orders: ${orders.length}`
    );
    
    // Log sample data
    if (products.length > 0) {
      console.log(`[Shopify OAuth] Sample product:`, JSON.stringify(products[0], null, 2));
    }
  } catch (err) {
    console.error(`[Shopify OAuth] ❌ Failed to fetch data for ${shop}:`, err);
    // Continue with empty arrays - don't fail the install
  }

  // ── 7. Save EVERYTHING to Firestore in ONE WRITE ────────────────────
  try {
    console.log(`[Shopify OAuth] Saving to Firestore for: ${shop}...`);
    const { FieldValue } = await import("firebase-admin/firestore");
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = getAdminDb();
    
    const docData: any = {
      shop,
      accessToken,
      scope,
      products,
      orders,
      abandoned_checkouts: [], // GraphQL doesn't have abandoned checkouts endpoint
      installedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastDataFetch: new Date().toISOString(),
    };
    
    // Add expiration time if token expires
    if (expiresIn) {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      docData.expiresAt = expiresAt.toISOString();
      console.log(`[Shopify OAuth] Token expires at: ${expiresAt.toISOString()}`);
    }
    
    console.log(`[Shopify OAuth] Document data summary:`, {
      shop,
      scope,
      productsCount: products.length,
      ordersCount: orders.length,
      expiresIn: expiresIn ? `${expiresIn}s` : 'never',
    });
    
    await db.collection("shopify_installs").doc(shop).set(docData);
    
    console.log(`[Shopify OAuth] ✅ All data saved to Firestore for: ${shop}`);
  } catch (err) {
    console.error("[Shopify OAuth] ❌ Firestore save error:", err);
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
