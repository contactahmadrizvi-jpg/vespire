import { createHmac, timingSafeEqual } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { storeCollection } from "@/lib/security/access";
import { normaliseShop, SHOPIFY_API_SECRET } from "@/lib/shopify/config";

const topics: Record<string, string> = {
  "customers-data-request": "customers/data_request",
  "customers-redact": "customers/redact",
  "shop-redact": "shop/redact",
  "app-uninstalled": "app/uninstalled",
};
const idPart = (value: unknown) => String(value ?? "").split("/").pop();

export async function POST(request: Request, { params }: { params: Promise<{ topic: string }> }) {
  const raw = await request.text();
  const signature = Buffer.from(request.headers.get("x-shopify-hmac-sha256") ?? "", "base64");
  const expected = createHmac("sha256", SHOPIFY_API_SECRET()).update(raw).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return new Response(null, { status: 401 });
  const { topic } = await params;
  if (!topics[topic] || topics[topic] !== request.headers.get("x-shopify-topic")) return new Response(null, { status: 400 });
  try {
    const payload = JSON.parse(raw);
    const shop = normaliseShop(payload.shop_domain ?? request.headers.get("x-shopify-shop-domain") ?? "");
    const db = getAdminDb();
    const ref = db.collection(storeCollection()).doc(shop);
    if (topic === "shop-redact" || topic === "app-uninstalled") {
      await ref.delete();
      // No retained request/export snapshots or audit records after shop deletion.
      for (const suffix of ["privacy_requests", "audit"]) {
        while (true) {
          const docs = await db.collection(`${storeCollection()}_${suffix}`).where("shop", "==", shop).limit(200).get();
          if (docs.empty) break;
          const batch = db.batch();
          for (const doc of docs.docs) batch.delete(doc.ref);
          await batch.commit();
        }
      }
    } else if (topic === "customers-redact") {
      await db.runTransaction(async transaction => {
        const doc = await transaction.get(ref);
        if (!doc.exists) return;
        const data = doc.data()!;
        const customerId = idPart(payload.customer?.id);
        const orderIds = new Set((payload.orders_to_redact ?? []).map(idPart));
        // Legacy caches can lack customer IDs: clear ambiguous records rather than retain PII.
        const checkouts = (data.abandoned_checkouts ?? []).filter((row: { customer_id?: string; email?: string }) =>
          row.customer_id && idPart(row.customer_id) !== customerId && (!payload.customer?.email || row.email !== payload.customer.email));
        const orders = (data.orders ?? []).filter((row: { id: string }) => !orderIds.has(idPart(row.id)));
        const retainedIds = new Set(checkouts.map((row: { id: string }) => row.id));
        transaction.update(ref, {
          abandoned_checkouts: checkouts, orders,
          redactedCustomerIds: [...new Set([...(data.redactedCustomerIds ?? []), customerId].filter(Boolean))],
          redactedCheckoutIds: [...new Set([...(data.redactedCheckoutIds ?? []), ...(data.abandoned_checkouts ?? []).filter((row: { id: string }) => !retainedIds.has(row.id)).map((row: { id: string }) => idPart(row.id))])],
          redactedOrderIds: [...new Set([...(data.redactedOrderIds ?? []), ...orderIds])],
        });
      });
      const requests = await db.collection(`${storeCollection()}_privacy_requests`).where("shop", "==", shop).get();
      for (const doc of requests.docs) if (doc.data().customerId === idPart(payload.customer?.id)) await doc.ref.delete();
    } else {
      const requestId = String(payload.data_request?.id ?? "");
      if (!/^\d+$/.test(requestId)) return new Response(null, { status: 400 });
      // Deterministic document ID makes Shopify retries idempotent.
      const requestRef = db.collection(`${storeCollection()}_privacy_requests`).doc(`${shop}_${requestId}`);
      await db.runTransaction(async transaction => {
        if ((await transaction.get(requestRef)).exists) return;
        transaction.create(requestRef, {
          shop, customerId: idPart(payload.customer?.id), orderIds: (payload.orders_requested ?? []).map(idPart),
          receivedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000), status: "pending",
        });
      });
    }
    return Response.json({ received: true });
  } catch {
    // Do not log webhook bodies or personal data; failed requests remain retryable.
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
