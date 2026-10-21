import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Test Shopify API directly
 * GET /api/test-shopify?shop=your-store.myshopify.com
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

    console.log(`[Test] Testing API calls for: ${shop}`);
    console.log(`[Test] Access token: ${accessToken.substring(0, 20)}...`);
    console.log(`[Test] Scope: ${scope}`);

    // Test 1: Fetch products
    console.log(`[Test] Fetching products...`);
    const productsUrl = `https://${shop}/admin/api/2025-01/products.json?limit=10`;
    const productsRes = await fetch(productsUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    console.log(`[Test] Products response status: ${productsRes.status}`);
    const productsData = await productsRes.json();
    console.log(`[Test] Products response:`, productsData);

    // Test 2: Fetch orders
    console.log(`[Test] Fetching orders...`);
    const ordersUrl = `https://${shop}/admin/api/2025-01/orders.json?limit=10&status=any`;
    const ordersRes = await fetch(ordersUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    console.log(`[Test] Orders response status: ${ordersRes.status}`);
    const ordersData = await ordersRes.json();
    console.log(`[Test] Orders response:`, ordersData);

    // Test 3: Fetch checkouts
    console.log(`[Test] Fetching checkouts...`);
    const checkoutsUrl = `https://${shop}/admin/api/2025-01/checkouts.json?limit=10`;
    const checkoutsRes = await fetch(checkoutsUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    console.log(`[Test] Checkouts response status: ${checkoutsRes.status}`);
    const checkoutsData = await checkoutsRes.json();
    console.log(`[Test] Checkouts response:`, checkoutsData);

    return NextResponse.json({
      shop,
      scope,
      tests: {
        products: {
          status: productsRes.status,
          ok: productsRes.ok,
          count: productsData.products?.length || 0,
          data: productsData,
        },
        orders: {
          status: ordersRes.status,
          ok: ordersRes.ok,
          count: ordersData.orders?.length || 0,
          data: ordersData,
        },
        checkouts: {
          status: checkoutsRes.status,
          ok: checkoutsRes.ok,
          count: checkoutsData.checkouts?.length || 0,
          data: checkoutsData,
        },
      },
    });
  } catch (error) {
    console.error("[Test] Error:", error);
    return NextResponse.json(
      { error: "Test failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
