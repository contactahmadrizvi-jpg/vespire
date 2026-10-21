/**
 * Shopify OAuth token exchange + Firestore persistence.
 *
 * Exchanges the temporary authorization `code` for a permanent offline
 * access token, then writes the shop domain + token to Firestore.
 *
 * All network calls and Firestore writes happen server-side only.
 *
 * Reference: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant/implement-authorization-code-grant#step-3-exchange-the-authorization-code-for-an-access-token
 */

import { getAdminDb } from "@/lib/firebase/admin";
import {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SHOPIFY_REDIRECT_URI,
} from "./config";

export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
  expires_in?: number; // Seconds until token expires (for expiring tokens)
  associated_user_scope?: string;
  associated_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    account_owner: boolean;
  };
}

export interface ShopCredential {
  shop: string;
  accessToken: string;
  scope: string;
  expiresAt?: string; // ISO date string when token expires
  installedAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

/**
 * POST to Shopify's token endpoint and exchange `code` for an access token.
 * 
 * NOTE: As of API version 2025-01, Shopify requires expiring offline tokens.
 * We request them explicitly via grant_options.
 * 
 * Throws on any network or API error so the caller can return a proper 500.
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<ShopifyAccessTokenResponse> {
  const url = `https://${shop}/admin/oauth/access_token`;

  const requestBody = {
    client_id: SHOPIFY_API_KEY(),
    client_secret: SHOPIFY_API_SECRET(),
    code,
    // Request expiring offline tokens (required as of API version 2025-01)
    // See: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/offline-access-tokens
    grant_options: ["offline"],
  };

  console.log(`[Token Exchange] 🔄 Requesting token from Shopify...`);
  console.log(`[Token Exchange] 📝 Request body includes:`, {
    client_id: requestBody.client_id ? 'present' : 'MISSING',
    client_secret: requestBody.client_secret ? 'present' : 'MISSING',
    code: code ? `${code.substring(0, 15)}...` : 'MISSING',
    grant_options: requestBody.grant_options,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    // Abort if Shopify doesn't respond in 15 s
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    console.error(`[Token Exchange] ❌ Shopify returned error:`, {
      status: response.status,
      statusText: response.statusText,
      body: body,
    });
    throw new Error(
      `Shopify token exchange failed [${response.status}]: ${body}`,
    );
  }

  const data = (await response.json()) as ShopifyAccessTokenResponse;

  console.log(`[Token Exchange] ✅ Token received from Shopify:`, {
    hasAccessToken: !!data.access_token,
    scope: data.scope,
    expiresIn: data.expires_in,
    hasExpiresIn: data.expires_in !== undefined,
  });

  if (!data.access_token) {
    console.error(`[Token Exchange] ❌ No access_token in response:`, data);
    throw new Error(
      "Shopify token exchange succeeded but response contained no access_token.",
    );
  }

  if (!data.expires_in) {
    console.warn(`[Token Exchange] ⚠️ WARNING: No expires_in in response! Shopify returned non-expiring token despite grant_options!`);
  }

  return data;
}

/**
 * Persist (upsert) the shop's access token in Firestore.
 *
 * Collection: `shopify_installs`
 * Document ID: the shop domain (e.g. "mystore.myshopify.com")
 *
 * Using `merge: true` so re-installs update the token rather than
 * overwriting other fields that might exist on the document.
 */
export async function saveShopToken(
  shop: string,
  accessToken: string,
  scope: string,
  expiresIn?: number,
): Promise<void> {
  const { FieldValue } = await import("firebase-admin/firestore");

  const data: any = {
    shop,
    accessToken,
    scope,
    updatedAt: FieldValue.serverTimestamp(),
    // `installedAt` is only written on the first install (merge won't overwrite it)
    installedAt: FieldValue.serverTimestamp(),
  };

  // If expiring token, calculate and store expiration time
  if (expiresIn) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    data.expiresAt = expiresAt.toISOString();
    console.log(`[Token] Token expires at: ${expiresAt.toISOString()}`);
  } else {
    // Non-expiring token (shouldn't happen with new API versions)
    data.expiresAt = null;
    console.log(`[Token] Warning: Received non-expiring token`);
  }

  await getAdminDb()
    .collection("shopify_installs")
    .doc(shop)
    .set(data, { merge: true });
}
