import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/shopify/stores
 * 
 * Returns list of all connected Shopify stores from Firestore.
 * Used to check if user has any connected stores.
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("shopify_installs").get();
    
    const stores = snapshot.docs.map((doc) => ({
      shop: doc.id,
      scope: doc.data().scope,
      installedAt: doc.data().installedAt,
    }));

    return NextResponse.json({ stores });
  } catch (error) {
    console.error("[API] Failed to fetch stores:", error);
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}
