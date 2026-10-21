import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Debug endpoint to check what's actually in Firestore
 * GET /api/debug/firestore?shop=your-store.myshopify.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 });
    }

    const db = getAdminDb();
    const doc = await db.collection("shopify_installs").doc(shop).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Shop not found in Firestore" }, { status: 404 });
    }

    const data = doc.data();

    return NextResponse.json({
      exists: true,
      shop: doc.id,
      hasAccessToken: !!data?.accessToken,
      scope: data?.scope,
      productsCount: data?.products?.length || 0,
      ordersCount: data?.orders?.length || 0,
      abandonedCheckoutsCount: data?.abandoned_checkouts?.length || 0,
      lastDataFetch: data?.lastDataFetch,
      installedAt: data?.installedAt,
      // Show first product/order for debugging
      firstProduct: data?.products?.[0] || null,
      firstOrder: data?.orders?.[0] || null,
      // Full data (be careful with large datasets!)
      fullData: data,
    });
  } catch (error) {
    console.error("[Debug] Firestore check error:", error);
    return NextResponse.json(
      { error: "Failed to check Firestore", details: (error as Error).message },
      { status: 500 }
    );
  }
}
