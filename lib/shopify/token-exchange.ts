import { storeCollection } from "@/lib/security/access";
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
  refresh_token?: string;
  refresh_token_expires_in?: number;
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
 * Request expiring offline credentials using expiring=1.
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
    // Request an expiring offline token and a refresh token.
    // See: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/offline-access-tokens
    expiring: 1,
  };

  console.log(`[Token Exchange] 🔄 Requesting token from Shopify...`);

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

  if (!data.access_token || !data.refresh_token || !data.expires_in) {

    throw new Error(
      "Shopify did not return the required expiring offline credentials.",
    );
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
  refreshToken?: string,
  refreshTokenExpiresIn?: number,
  ownerUid?: string,
): Promise<void> {
  if (!ownerUid) throw new Error("A verified account is required to connect a store.");
  const { FieldValue } = await import("firebase-admin/firestore");

  const data: any = {
    shop,
    accessToken,
    scope,
    ownerUid,
    privacyVersion: "2026-10-22",
    privacyAcceptedAt: new Date().toISOString(),
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

  }

  if (refreshToken) data.refreshToken = refreshToken;
  if (refreshTokenExpiresIn) data.refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000).toISOString();

  const db = getAdminDb();
  const ref = db.collection(storeCollection()).doc(shop);
  await db.runTransaction(async transaction => {
    const existing = await transaction.get(ref);
    if (existing.data()?.ownerUid && existing.data()?.ownerUid !== ownerUid) throw new Error("Store belongs to another account.");
    if (existing.data()?.installedAt) data.installedAt = existing.data()!.installedAt;
    transaction.set(ref, data, { merge: true });
  });
}
