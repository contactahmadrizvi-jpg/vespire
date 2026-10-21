import { storeCollection } from "@/lib/security/access";
import { getAdminDb } from "@/lib/firebase/admin";
import { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, normaliseShop } from "./config";

const pending = new Map<string, Promise<string>>();

/** Migrate legacy tokens and renew expiring tokens before API requests. */
export async function getShopAccessToken(rawShop: string): Promise<string> {
  const shop = normaliseShop(rawShop);
  const existing = pending.get(shop);
  if (existing) return existing;
  const operation = renew(shop);
  pending.set(shop, operation);
  try { return await operation; }
  finally { pending.delete(shop); }
}

async function renew(shop: string): Promise<string> {
  const ref = getAdminDb().collection(storeCollection()).doc(shop);
  const snapshot = await ref.get();
  const stored = snapshot.data();
  if (!stored?.accessToken) throw new Error("Reconnect your Shopify store.");
  if (stored.expiresAt && Date.parse(stored.expiresAt) > Date.now() + 60_000) return stored.accessToken;

  const parameters = stored.refreshToken ? {
    grant_type: "refresh_token",
    refresh_token: stored.refreshToken,
  } : !stored.expiresAt ? {
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: stored.accessToken,
    subject_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    expiring: "1",
  } : null;
  if (!parameters) throw new Error("Shopify connection expired. Reconnect your store.");

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: SHOPIFY_API_KEY(), client_secret: SHOPIFY_API_SECRET(), ...parameters }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Shopify could not renew this connection. Reconnect your store.");
  const token = await response.json();
  if (!token.access_token || !token.refresh_token || !token.expires_in || !token.refresh_token_expires_in) {
    throw new Error("Shopify did not return expiring credentials. Reconnect your store.");
  }
  // Save the rotated pair together before using it for API calls.
  await ref.update({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(Date.now() + token.refresh_token_expires_in * 1000).toISOString(),
    ...(token.scope ? { scope: token.scope } : {}),
  });
  return token.access_token;
}
