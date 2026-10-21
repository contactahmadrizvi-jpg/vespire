import { storeCollection } from "@/lib/security/access";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { currentUser, ownedStore, audit, sameOrigin, apiError } from "@/lib/security/access";
import { normaliseShop } from "@/lib/shopify/config";

/**
 * POST /api/shopify/disconnect
 * 
 * Disconnects a Shopify store by removing it from Firestore.
 */
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const user = await currentUser();
    const formData = await request.formData();
    const shop = normaliseShop(String(formData.get("shop") ?? ""));
    await ownedStore(shop, user.uid);
    await audit(user.uid, shop, "store.disconnect_and_delete");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection(storeCollection()).doc(shop).delete();
    for (const suffix of ["privacy_requests", "audit"]) {
      while (true) {
        const docs = await db.collection(`${storeCollection()}_${suffix}`).where("shop", "==", shop).limit(200).get();
        if (docs.empty) break;
        const batch = db.batch();
        for (const doc of docs.docs) batch.delete(doc.ref);
        await batch.commit();
      }
    }

    console.log(`[Shopify] ✅ Disconnected store: ${shop}`);

    // Redirect to install page
    const installUrl = new URL("/install", request.url);
    return NextResponse.redirect(installUrl, 303);
  } catch (error) {
    return apiError(error);
  }
}
