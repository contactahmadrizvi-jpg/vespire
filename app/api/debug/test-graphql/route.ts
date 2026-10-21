import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * GET /api/debug/test-graphql?shop=xxx.myshopify.com
 * 
 * Test GraphQL queries directly to see what Shopify returns
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

    // Test 1: Simple shop query
    const shopQuery = `
      query {
        shop {
          name
          email
          currencyCode
        }
      }
    `;

    // Test 2: Products query
    const productsQuery = `
      query {
        products(first: 5, query: "status:active OR status:draft") {
          edges {
            node {
              id
              title
              status
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    // Test 3: Orders query
    const ordersQuery = `
      query {
        orders(first: 5) {
          edges {
            node {
              id
              name
              email
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const url = `https://${shop}/admin/api/2026-10/graphql.json`;

    // Execute all queries
    const results = {
      shop,
      accessToken: accessToken ? "present" : "missing",
      installedScopes: scope,
      requestedScopes: process.env.SHOPIFY_SCOPES,
      tests: {} as Record<string, any>,
    };

    // Test shop query
    try {
      const shopRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query: shopQuery }),
      });
      const shopData = await shopRes.json();
      results.tests.shop = {
        status: shopRes.status,
        success: !shopData.errors,
        data: shopData.data,
        errors: shopData.errors,
      };
    } catch (err) {
      results.tests.shop = { error: (err as Error).message };
    }

    // Test products query
    try {
      const productsRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query: productsQuery }),
      });
      const productsData = await productsRes.json();
      results.tests.products = {
        status: productsRes.status,
        success: !productsData.errors,
        count: productsData.data?.products?.edges?.length || 0,
        hasNextPage: productsData.data?.products?.pageInfo?.hasNextPage,
        data: productsData.data,
        errors: productsData.errors,
      };
    } catch (err) {
      results.tests.products = { error: (err as Error).message };
    }

    // Test orders query
    try {
      const ordersRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query: ordersQuery }),
      });
      const ordersData = await ordersRes.json();
      results.tests.orders = {
        status: ordersRes.status,
        success: !ordersData.errors,
        count: ordersData.data?.orders?.edges?.length || 0,
        hasNextPage: ordersData.data?.orders?.pageInfo?.hasNextPage,
        data: ordersData.data,
        errors: ordersData.errors,
      };
    } catch (err) {
      results.tests.orders = { error: (err as Error).message };
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("[Debug API] Error:", error);
    return NextResponse.json(
      { error: "Failed to test GraphQL", details: (error as Error).message },
      { status: 500 }
    );
  }
}
