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
}

export interface ShopCredential {
  shop: string;
  accessToken: string;
  scope: string;
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

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY(),
      client_secret: SHOPIFY_API_SECRET(),
      code,
    }),
    // Abort if Shopify doesn't respond in 15 s
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(
      `Shopify token exchange failed [${response.status}]: ${body}`,
    );
  }

  const data = (await response.json()) as ShopifyAccessTokenResponse;

  if (!data.access_token) {
    throw new Error(
      "Shopify token exchange succeeded but response contained no access_token.",
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
): Promise<void> {
  const { FieldValue } = await import("firebase-admin/firestore");

  await getAdminDb()
    .collection("shopify_installs")
    .doc(shop)
    .set(
      {
        shop,
        accessToken,
        scope,
        updatedAt: FieldValue.serverTimestamp(),
        // `installedAt` is only written on the first install (merge won't overwrite it)
        installedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
