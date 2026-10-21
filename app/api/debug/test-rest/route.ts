import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * GET /api/debug/test-rest?shop=xxx.myshopify.com
 * 
 * Test REST API to see if products exist
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

    const { accessToken, scope } = doc.data() as { accessToken: string; scope: string };

    const results = {
      shop,
      installedScopes: scope,
      tests: {} as Record<string, any>,
    };

    // Test products count via REST
    try {
      const productsCountUrl = `https://${shop}/admin/api/2026-10/products/count.json`;
      const countRes = await fetch(productsCountUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      });
      const countData = await countRes.json();
      results.tests.productsCount = {
        status: countRes.status,
        count: countData.count,
        raw: countData,
      };
    } catch (err) {
      results.tests.productsCount = { error: (err as Error).message };
    }

    // Test get first 5 products via REST
    try {
      const productsUrl = `https://${shop}/admin/api/2026-10/products.json?limit=5`;
      const productsRes = await fetch(productsUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      });
      const productsData = await productsRes.json();
      results.tests.products = {
        status: productsRes.status,
        count: productsData.products?.length || 0,
        products: productsData.products || [],
        errors: productsData.errors,
      };
    } catch (err) {
      results.tests.products = { error: (err as Error).message };
    }

    // Test orders count via REST (will fail if read_orders scope missing)
    try {
      const ordersCountUrl = `https://${shop}/admin/api/2026-10/orders/count.json`;
      const countRes = await fetch(ordersCountUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      });
      const countData = await countRes.json();
      results.tests.ordersCount = {
        status: countRes.status,
        count: countData.count,
        errors: countData.errors,
      };
    } catch (err) {
      results.tests.ordersCount = { error: (err as Error).message };
    }

    // Test get first 5 orders via REST
    try {
      const ordersUrl = `https://${shop}/admin/api/2026-10/orders.json?limit=5&status=any`;
      const ordersRes = await fetch(ordersUrl, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      });
      const ordersData = await ordersRes.json();
      results.tests.orders = {
        status: ordersRes.status,
        count: ordersData.orders?.length || 0,
        orders: ordersData.orders || [],
        errors: ordersData.errors,
      };
    } catch (err) {
      results.tests.orders = { error: (err as Error).message };
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json(
      { error: "Failed to test REST API", details: (error as Error).message },
      { status: 500 }
    );
  }
}
