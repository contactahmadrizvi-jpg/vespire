import { saveShopData } from "@/lib/shopify/save-data";
import { storeCollection } from "@/lib/security/access";
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
import { pageUser, audit } from "@/lib/security/access";
import { getAdminDb } from "@/lib/firebase/admin";

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
  const user = await pageUser();
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
  let binding: { state?: string; uid?: string; shop?: string } = {};
  try { binding = JSON.parse(cookieStore.get(SHOPIFY_STATE_COOKIE)?.value ?? "{}"); } catch { /* Invalid state is rejected below. */ }
  const cookieState = binding.state;

  if (!cookieState || cookieState !== state || binding.uid !== user.uid || binding.shop !== shop) {
    return errorResponse(
      "State mismatch. Possible CSRF attack. Request rejected.",
      403,
    );
  }

  // Clear the state cookie — it's single-use.
  cookieStore.delete(SHOPIFY_STATE_COOKIE);
  const existing = await getAdminDb().collection(storeCollection()).doc(shop).get();
  if (existing.data()?.ownerUid && existing.data()?.ownerUid !== user.uid) {
    return errorResponse("This store belongs to another account.", 403);
  }

  // ── 5. Exchange authorization code for access token ─────────────────
  let accessToken: string;
  let scope: string;
  let expiresIn: number | undefined;
  let refreshToken: string | undefined;
  let refreshTokenExpiresIn: number | undefined;
  try {
    console.log(`[Shopify OAuth] 🔄 Starting token exchange for: ${shop}`);

    const tokenResponse = await exchangeCodeForToken(shop, code);

    console.log(`[Shopify OAuth] 📦 Token response received:`, {
      hasAccessToken: !!tokenResponse.access_token,
      scope: tokenResponse.scope,
      expiresIn: tokenResponse.expires_in,

    });

    accessToken = tokenResponse.access_token;
    scope       = tokenResponse.scope;
    expiresIn   = tokenResponse.expires_in;
    refreshToken = tokenResponse.refresh_token;
    refreshTokenExpiresIn = tokenResponse.refresh_token_expires_in;

    console.log(
      `[Shopify OAuth] ✅ Token exchange successful for shop: ${shop}. ` +
      `Scopes: ${scope}, Expires in: ${expiresIn ? `${expiresIn}s (${Math.round(expiresIn / 86400)} days)` : 'offline access'}`,
    );


  } catch (err) {
    console.error("[Shopify OAuth] ❌ Token exchange error:", err);
    console.error("[Shopify OAuth] ❌ Error details:", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return errorResponse(
      `Failed to exchange authorization code: ${(err as Error).message}`,
      500,
    );
  }

  // Save credentials before syncing: a data error must not lose the installation.
  try {
    await saveShopToken(shop, accessToken, scope, expiresIn, refreshToken, refreshTokenExpiresIn, user.uid);
    await audit(user.uid, shop, "store.connect_and_accept_privacy");
    const data = await fetchAllShopDataGraphQL(shop, accessToken);
    await saveShopData(shop, data);
  } catch (err) {
    console.error("[Shopify OAuth] Installation sync failed:", err);
    return errorResponse("Could not save the Shopify connection. Please try connecting again.", 500);
  }

  // ── 8. Redirect merchant to success page ────────────────────────────
  const successUrl = new URL("/install/success", request.nextUrl.origin);
  successUrl.searchParams.set("shop", shop);
  if (!scope.split(",").map(value => value.trim()).includes("read_customers")) {
    successUrl.searchParams.set("customer_access", "missing");
  }
  return NextResponse.redirect(successUrl.toString());
}

/** Return a simple JSON error response with a consistent shape. */
function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
