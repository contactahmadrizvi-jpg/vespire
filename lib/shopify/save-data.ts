import { getAdminDb } from "@/lib/firebase/admin";
import { storeCollection } from "@/lib/security/access";
import { recentRecords } from "@/lib/security/retention";
import type { fetchAllShopDataGraphQL } from "./graphql-fetch";

/** Read redaction markers in the same transaction as a sync, preventing re-import races. */
export async function saveShopData(shop: string, data: Awaited<ReturnType<typeof fetchAllShopDataGraphQL>>) {
  const ref = getAdminDb().collection(storeCollection()).doc(shop);
  await getAdminDb().runTransaction(async transaction => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw new Error("Store disconnected during sync.");
    const stored = doc.data()!;
    const part = (value: unknown) => String(value ?? "").split("/").pop();
    const deletedCustomers = new Set(stored.redactedCustomerIds ?? []);
    const deletedCheckouts = new Set(stored.redactedCheckoutIds ?? []);
    const deletedOrders = new Set(stored.redactedOrderIds ?? []);
    const updates: Record<string, unknown> = { syncErrors: data.errors };
    if (!data.errors.products) updates.products = data.products;
    if (!data.errors.orders) updates.orders = recentRecords(data.orders).filter(row => !deletedOrders.has(part(row.id)));
    if (!data.errors.abandonedCheckouts) updates.abandoned_checkouts = recentRecords(data.abandonedCheckouts).filter(row =>
      !deletedCustomers.has(part(row.customer_id)) && !deletedCheckouts.has(part(row.id)));
    if (!Object.keys(data.errors).length) updates.lastDataFetch = new Date().toISOString();
    transaction.update(ref, updates);
  });
}
