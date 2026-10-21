import { getAdminDb } from "@/lib/firebase/admin";
import { currentUser, ownedStore, storeCollection, audit, apiError, sameOrigin } from "@/lib/security/access";
import { pruneStore } from "@/lib/security/retention";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    const { id } = await params;
    const request = await getAdminDb().collection(`${storeCollection()}_privacy_requests`).doc(id).get();
    const details = request.data();
    if (!details || details.expiresAt.toMillis() <= Date.now()) return new Response(null, { status: 404 });
    await ownedStore(details.shop, user.uid);
    await pruneStore(details.shop);
    const store = (await ownedStore(details.shop, user.uid)).data()!;
    const lastPart = (value: unknown) => String(value ?? "").split("/").pop();
    await audit(user.uid, details.shop, "customer_data.export");
    return Response.json({
      shop: details.shop,
      checkouts: (store.abandoned_checkouts ?? []).filter((row: { customer_id?: string }) => details.customerId && lastPart(row.customer_id) === details.customerId),
      orders: (store.orders ?? []).filter((row: { id: string }) => details.orderIds.includes(lastPart(row.id))),
    }, { headers: { "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="customer-data.json"' } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const form = await request.formData();
    const origin = sameOrigin(request, String(form.get("csrf") ?? ""));
    const user = await currentUser();
    const { id } = await params;
    const ref = getAdminDb().collection(`${storeCollection()}_privacy_requests`).doc(id);
    const data = (await ref.get()).data();
    if (!data) return new Response(null, { status: 404 });
    await ownedStore(data.shop, user.uid);
    await audit(user.uid, data.shop, "customer_data.request_fulfilled");
    await ref.update({ status: "fulfilled", fulfilledAt: new Date() });
    return Response.redirect(new URL("/shopify/privacy-requests", origin), 303);
  } catch (error) { return apiError(error); }
}
