import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * POST /api/shopify/disconnect
 * 
 * Disconnects a Shopify store by removing it from Firestore.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const shop = formData.get("shop") as string;

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("shopify_installs").doc(shop).delete();

    console.log(`[Shopify] Disconnected store: ${shop}`);

    // Redirect to install page
    return NextResponse.redirect(new URL("/install", request.url));
  } catch (error) {
    console.error("[API] Failed to disconnect store:", error);
    return NextResponse.json(
      { error: "Failed to disconnect store" },
      { status: 500 }
    );
  }
}
