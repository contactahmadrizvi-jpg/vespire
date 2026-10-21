import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { fetchAllShopDataGraphQL } from "@/lib/shopify/graphql-fetch";

/**
 * Test GraphQL API directly
 * GET /api/test-graphql?shop=your-store.myshopify.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 });
    }

    // Get credentials from Firestore
    const db = getAdminDb();
    const doc = await db.collection("shopify_installs").doc(shop).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { accessToken, scope } = doc.data() as { accessToken: string; scope: string };

    console.log(`[GraphQL Test] Testing for: ${shop}`);
    console.log(`[GraphQL Test] Scope: ${scope}`);

    // Test GraphQL fetch
    const data = await fetchAllShopDataGraphQL(shop, accessToken);

    return NextResponse.json({
      success: true,
      shop,
      scope,
      results: {
        products: {
          count: data.products.length,
          sample: data.products.slice(0, 2),
        },
        orders: {
          count: data.orders.length,
          sample: data.orders.slice(0, 2),
        },
      },
    });
  } catch (error) {
    console.error("[GraphQL Test] Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "GraphQL test failed", 
        details: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 }
    );
  }
}
