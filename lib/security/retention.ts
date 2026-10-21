import { getAdminDb } from "@/lib/firebase/admin";
import { storeCollection } from "./access";

export const RETENTION_DAYS = 30;
export function recentRecords<T extends { created_at?: string }>(rows: T[], now = Date.now()): T[] {
  return rows.filter(row => Number.isFinite(Date.parse(row.created_at ?? "")) && Date.parse(row.created_at!) > now - RETENTION_DAYS * 86400000);
}

/** Also run on reads, so expired records are not returned if the scheduler is delayed. */
export async function pruneStore(shop: string) {
  const ref = getAdminDb().collection(storeCollection()).doc(shop);
  return getAdminDb().runTransaction(async transaction => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return;
    const data = doc.data()!;
    const orders = recentRecords(data.orders ?? []);
    const checkouts = recentRecords(data.abandoned_checkouts ?? []);
    if (orders.length !== (data.orders ?? []).length || checkouts.length !== (data.abandoned_checkouts ?? []).length) {
      transaction.update(ref, { orders, abandoned_checkouts: checkouts });
    }
  });
}
