import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * GET /api/debug/check-store?shop=xxx.myshopify.com
 * 
 * Debug endpoint to check what data is stored in Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const doc = await db.collection("shopify_installs").doc(shop).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const data = doc.data();
    
    return NextResponse.json({
      shop,
      hasAccessToken: !!data?.accessToken,
      scope: data?.scope,
      productsCount: data?.products?.length || 0,
      ordersCount: data?.orders?.length || 0,
      abandonedCheckoutsCount: data?.abandoned_checkouts?.length || 0,
      lastDataFetch: data?.lastDataFetch,
      installedAt: data?.installedAt,
      // Include sample data for debugging
      sampleProduct: data?.products?.[0] || null,
      sampleOrder: data?.orders?.[0] || null,
      // Show the field names from first product
      productFieldNames: data?.products?.[0] ? Object.keys(data.products[0]) : [],
      orderFieldNames: data?.orders?.[0] ? Object.keys(data.orders[0]) : [],
    });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json(
      { error: "Failed to check store data", details: (error as Error).message },
      { status: 500 }
    );
  }
}
