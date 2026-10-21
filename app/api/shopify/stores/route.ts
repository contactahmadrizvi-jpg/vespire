import { storeCollection } from "@/lib/security/access";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { currentUser, audit, apiError } from "@/lib/security/access";

export const dynamic = "force-dynamic";

/**
 * GET /api/shopify/stores
 * 
 * Returns list of all connected Shopify stores from Firestore.
 * Used to check if user has any connected stores.
 */
export async function GET() {
  try {
    const user = await currentUser();
    const db = getAdminDb();
    const snapshot = await db.collection(storeCollection()).where("ownerUid", "==", user.uid).get();
    await audit(user.uid, "account", "stores.list");
    
    const stores = snapshot.docs.map((doc) => ({
      shop: doc.id,
      scope: doc.data().scope,
      installedAt: doc.data().installedAt,
    }));

    return NextResponse.json({ stores });
  } catch (error) {
    return apiError(error);
  }
}
