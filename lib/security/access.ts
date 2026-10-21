import "server-only";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { redirect } from "next/navigation";
import { getAdminApp, getAdminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/constants";

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw new AccessError(401, "Sign in to continue.");
  try { return await getAuth(getAdminApp()).verifySessionCookie(token, true); }
  catch { throw new AccessError(401, "Your session expired. Please sign in again."); }
}

export async function pageUser() {
  try { return await currentUser(); }
  catch (error) { if (error instanceof AccessError) redirect("/login"); throw error; }
}

export function storeCollection() {
  const environment = process.env.APP_DATA_ENV;
  if (environment && !["production", "test"].includes(environment)) {
    throw new Error("APP_DATA_ENV must be production or test.");
  }
  // An unconfigured deployment remains in the test namespace. Live data is opt-in.
  return environment === "production" ? "shopify_installs_production" : "shopify_installs";
}

export async function ownedStore(shop: string, uid: string) {
  const ref = getAdminDb().collection(storeCollection()).doc(shop);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerUid !== uid) throw new AccessError(404, "Store not found. Reconnect it from your account.");
  return doc;
}

/** Metadata only: never record contact details, tokens, bodies, or recovery URLs. */
export async function audit(uid: string, shop: string, action: string) {
  const now = new Date();
  await getAdminDb().collection(`${storeCollection()}_audit`).add({
    uid, shop, action, at: now, expiresAt: new Date(now.getTime() + 90 * 86400000),
  });
}

export function sameOrigin(request: Request) {
  // Vercel can expose an internal request URL behind its public deployment host.
  // Only trust deployment configuration, never client-supplied forwarded headers.
  const allowed = new Set([new URL(request.url).origin]);
  for (const configured of [process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`]) {
    if (!configured) continue;
    try {
      const url = new URL(configured);
      if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) allowed.add(url.origin);
    } catch { /* Invalid configuration must not weaken origin verification. */ }
  }
  const origin = request.headers.get("origin");
  if (!origin || !allowed.has(origin)) throw new AccessError(403, "Request origin rejected.");
  return origin;
}

export function apiError(error: unknown) {
  return Response.json({ error: error instanceof AccessError ? error.message : "Request failed. Please try again." }, {
    status: error instanceof AccessError ? error.status : 500,
  });
}
