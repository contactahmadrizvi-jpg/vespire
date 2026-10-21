import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { fetchAllShopData } from "@/lib/shopify/fetch-shop-data";

/**
 * POST /api/shopify/refresh
 * 
 * Manually refresh products, orders, and abandoned checkouts for a shop.
 * Useful when automatic sync during install fails or data needs updating.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop } = body;

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    // Get shop credentials from Firestore
    const db = getAdminDb();
    const doc = await db.collection("shopify_installs").doc(shop).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const { accessToken } = doc.data() as { accessToken: string };

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found for shop" },
        { status: 400 }
      );
    }

    // Fetch fresh data from Shopify
    console.log(`[Shopify Refresh] Starting fetch for: ${shop}`);
    const data = await fetchAllShopData(shop, accessToken);
    console.log(
      `[Shopify Refresh] ✅ Fetched data for: ${shop} - ` +
      `Products: ${data.products.length}, Orders: ${data.orders.length}, Carts: ${data.abandonedCheckouts.length}`
    );

    // Update Firestore
    console.log(`[Shopify Refresh] Updating Firestore for: ${shop}`);
    await db.collection("shopify_installs").doc(shop).update({
      products: data.products,
      orders: data.orders,
      abandoned_checkouts: data.abandonedCheckouts,
      lastDataFetch: new Date().toISOString(),
    });

    console.log(`[Shopify Refresh] ✅ Data saved for: ${shop}`);

    return NextResponse.json({
      success: true,
      counts: {
        products: data.products.length,
        orders: data.orders.length,
        abandoned_checkouts: data.abandonedCheckouts.length,
      },
    });
  } catch (error) {
    console.error("[API] Failed to refresh shop data:", error);
    return NextResponse.json(
      { error: "Failed to refresh shop data", details: (error as Error).message },
      { status: 500 }
    );
  }
}
