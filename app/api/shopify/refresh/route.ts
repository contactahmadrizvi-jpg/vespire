import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { fetchAllShopDataGraphQL } from "@/lib/shopify/graphql-fetch";
import { normaliseShop } from "@/lib/shopify/config";
import { getShopAccessToken } from "@/lib/shopify/access-token";

/**
 * POST /api/shopify/refresh
 * 
 * Manually refresh products and orders using GraphQL API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let shop: string;
    try {
      shop = normaliseShop(typeof body.shop === "string" ? body.shop : "");
    } catch {
      return NextResponse.json({ error: "Enter a valid Shopify store domain." }, { status: 400 });
    }

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

    const accessToken = await getShopAccessToken(shop);

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found for shop" },
        { status: 400 }
      );
    }

    // Fetch fresh data from Shopify using GraphQL
    console.log(`[Shopify Refresh] Starting GraphQL fetch for: ${shop}`);
    const data = await fetchAllShopDataGraphQL(shop, accessToken);
    console.log(
      `[Shopify Refresh] ✅ Fetched data for: ${shop} - ` +
      `Products: ${data.products.length}, Orders: ${data.orders.length}`
    );

    // Update Firestore
    console.log(`[Shopify Refresh] Updating Firestore for: ${shop}`);
    const updates: Record<string, unknown> = { syncErrors: data.errors };
    if (!data.errors.products) updates.products = data.products;
    if (!data.errors.orders) updates.orders = data.orders;
    if (Object.keys(data.errors).length === 0) updates.lastDataFetch = new Date().toISOString();
    await db.collection("shopify_installs").doc(shop).update(updates);

    if (Object.keys(data.errors).length) {
      return NextResponse.json({ error: Object.entries(data.errors).map(([resource, message]) => `${resource}: ${message}`).join(" "), partial: true }, { status: 502 });
    }

    console.log(`[Shopify Refresh] ✅ Data saved for: ${shop}`);

    return NextResponse.json({
      success: true,
      counts: {
        products: data.products.length,
        orders: data.orders.length,
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
