import { getAdminDb } from "@/lib/firebase/admin";
import { pageUser, storeCollection, audit, formCsrfToken } from "@/lib/security/access";

export default async function PrivacyRequests() {
  const user = await pageUser();
  const csrf = await formCsrfToken();
  const db = getAdminDb();
  const stores = await db.collection(storeCollection()).where("ownerUid", "==", user.uid).get();
  const rows = [];
  for (const store of stores.docs) {
    const requests = await db.collection(`${storeCollection()}_privacy_requests`).where("shop", "==", store.id).get();
    for (const doc of requests.docs) if (doc.data().status === "pending" && doc.data().expiresAt.toMillis() > Date.now()) rows.push({ id: doc.id, shop: store.id, receivedAt: doc.data().receivedAt.toDate().toISOString() });
  }
  await audit(user.uid, "account", "privacy_requests.view");
  return <div className="space-y-5"><h1 className="text-2xl font-semibold">Customer data requests</h1>
    <p>Download the requested data, verify the recipient through the merchant, and deliver it securely within the required deadline. Downloads do not send data to the customer.</p>
    {rows.length === 0 && <p>No pending data requests.</p>}
    {rows.map(row => <div key={row.id} className="space-y-3 rounded border p-4"><p>{row.shop} — received {row.receivedAt}</p><a className="underline" href={`/api/shopify/privacy-requests/${encodeURIComponent(row.id)}`}>Download customer data</a><form method="POST" action={`/api/shopify/privacy-requests/${encodeURIComponent(row.id)}`}><input type="hidden" name="csrf" value={csrf} /><button className="rounded border px-3 py-2">Mark fulfilled after secure delivery</button></form></div>)}
  </div>;
}
