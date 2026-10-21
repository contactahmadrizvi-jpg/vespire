/**
 * Post-install data fetching.
 *
 * Immediately after a successful token exchange we fetch:
 *   - Products       (Admin REST API)
 *   - Orders         (Admin REST API)
 *   - Abandoned checkouts / carts  (Admin REST API)
 *
 * All fetches use the Shopify Admin REST API with cursor-based pagination
 * so we collect every record, not just the first 50.
 *
 * Results are console.log'd (visible in your server logs / terminal) and
 * returned so callers can optionally store them in Firestore too.
 *
 * Reference: https://shopify.dev/docs/api/admin-rest
 */

import { SHOPIFY_API_VERSION } from "./config";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: Array<{ id: number; title: string; price: string; sku: string }>;
  [key: string]: unknown;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface ShopifyAbandonedCheckout {
  id: number;
  token: string;
  cart_token: string;
  email: string;
  total_price: string;
  line_items: Array<{ title: string; quantity: number; price: string }>;
  created_at: string;
  [key: string]: unknown;
}

/* ── Generic paginated fetcher ──────────────────────────────────────── */

/**
 * Fetches all pages of a Shopify REST endpoint using Link header pagination.
 * Shopify returns a `Link: <url>; rel="next"` header when more pages exist.
 */
async function fetchAllPages<T>(
  initialUrl: string,
  shop: string,
  accessToken: string,
  dataKey: string,
): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      throw new Error(
        `Shopify API request failed [${response.status}] for ${url}: ${body}`,
      );
    }

    const data = (await response.json()) as Record<string, T[]>;
    const page = data[dataKey] ?? [];
    results.push(...page);

    // Parse the `Link` header for the next-page URL.
    url = parseNextLink(response.headers.get("Link"));
  }

  return results;
}

/**
 * Parse Shopify's Link header to extract the `rel="next"` URL.
 * Example: `<https://...&page_info=abc>; rel="next", <https://...>; rel="previous"`
 */
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const [urlPart, relPart] = part.split(";");
    if (relPart?.trim() === 'rel="next"') {
      return urlPart.trim().replace(/^<|>$/g, "");
    }
  }
  return null;
}

/* ── Public fetch functions ─────────────────────────────────────────── */

/** Fetch all products from the store. */
export async function fetchProducts(
  shop: string,
  accessToken: string,
): Promise<ShopifyProduct[]> {
  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;
  const products = await fetchAllPages<ShopifyProduct>(
    url,
    shop,
    accessToken,
    "products",
  );
  console.log(
    `[Shopify] Fetched ${products.length} products from ${shop}`,
  );
  console.log("[Shopify] Products sample:", JSON.stringify(products.slice(0, 3), null, 2));
  return products;
}

/** Fetch all orders (including closed/cancelled) from the store. */
export async function fetchOrders(
  shop: string,
  accessToken: string,
): Promise<ShopifyOrder[]> {
  // `status=any` returns open, closed, and cancelled orders
  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=250&status=any`;
  const orders = await fetchAllPages<ShopifyOrder>(
    url,
    shop,
    accessToken,
    "orders",
  );
  console.log(
    `[Shopify] Fetched ${orders.length} orders from ${shop}`,
  );
  console.log("[Shopify] Orders sample:", JSON.stringify(orders.slice(0, 3), null, 2));
  return orders;
}

/**
 * Fetch abandoned checkouts from the store.
 *
 * Shopify's "Abandoned checkouts" are carts where a buyer started checkout
 * but did not complete it. The `/checkouts.json` endpoint returns them.
 * Note: requires the `read_orders` scope.
 */
export async function fetchAbandonedCheckouts(
  shop: string,
  accessToken: string,
): Promise<ShopifyAbandonedCheckout[]> {
  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/checkouts.json?limit=250`;
  const checkouts = await fetchAllPages<ShopifyAbandonedCheckout>(
    url,
    shop,
    accessToken,
    "checkouts",
  );
  console.log(
    `[Shopify] Fetched ${checkouts.length} abandoned checkouts from ${shop}`,
  );
  console.log(
    "[Shopify] Abandoned checkouts sample:",
    JSON.stringify(checkouts.slice(0, 3), null, 2),
  );
  return checkouts;
}

/**
 * Convenience: run all three fetches in parallel and return a combined result.
 * Individual fetch failures are caught so one bad endpoint doesn't abort the rest.
 */
export async function fetchAllShopData(
  shop: string,
  accessToken: string,
): Promise<{
  products: ShopifyProduct[];
  orders: ShopifyOrder[];
  abandonedCheckouts: ShopifyAbandonedCheckout[];
}> {
  const [productsResult, ordersResult, checkoutsResult] =
    await Promise.allSettled([
      fetchProducts(shop, accessToken),
      fetchOrders(shop, accessToken),
      fetchAbandonedCheckouts(shop, accessToken),
    ]);

  const products =
    productsResult.status === "fulfilled" ? productsResult.value : [];
  const orders =
    ordersResult.status === "fulfilled" ? ordersResult.value : [];
  const abandonedCheckouts =
    checkoutsResult.status === "fulfilled" ? checkoutsResult.value : [];

  if (productsResult.status === "rejected") {
    console.error("[Shopify] Failed to fetch products:", productsResult.reason);
  }
  if (ordersResult.status === "rejected") {
    console.error("[Shopify] Failed to fetch orders:", ordersResult.reason);
  }
  if (checkoutsResult.status === "rejected") {
    console.error(
      "[Shopify] Failed to fetch abandoned checkouts:",
      checkoutsResult.reason,
    );
  }

  return { products, orders, abandonedCheckouts };
}
