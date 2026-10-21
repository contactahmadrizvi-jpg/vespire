/** Shopify Admin GraphQL fetching and UI data mapping. */

import { SHOPIFY_API_VERSION } from "./config";
import { recentRecords } from "@/lib/security/retention";

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  productType: string;
  status: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        inventoryQuantity: number;
      };
    }>;
  };
  featuredImage?: {
    url: string;
  };
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
    };
  };
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  createdAt: string;
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
      };
    }>;
  };
}

/**
 * Make a GraphQL request to Shopify Admin API
 */
async function graphqlRequest(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(response.status === 401
      ? "Shopify connection has expired or been revoked. Reconnect your store."
      : `Shopify request failed [${response.status}]: ${text}`);
  }

  const json = await response.json();
  
  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

/**
 * Fetch all products using GraphQL
 */
export async function fetchProductsGraphQL(
  shop: string,
  accessToken: string
): Promise<any[]> {
  const query = `
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            vendor
            productType
            status
            featuredImage {
              url
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  inventoryQuantity
                }
              }
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `;

  const allProducts: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  try {
    while (hasNextPage) {
      const data = await graphqlRequest(shop, accessToken, query, {
        first: 50,
        after: cursor,
      });

      const edges = data.products.edges;
      allProducts.push(...edges.map((e: any) => e.node));

      hasNextPage = data.products.pageInfo.hasNextPage;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
      
      if (edges.length === 0) break;
    }

    console.log(`[GraphQL] ✅ Fetched ${allProducts.length} products from ${shop}`);
  } catch (error) {
    console.error(`[GraphQL] ❌ Error fetching products:`, error);
    throw error;
  }

  return allProducts;
}

/**
 * Fetch all orders using GraphQL
 */
export async function fetchOrdersGraphQL(
  shop: string,
  accessToken: string
): Promise<any[]> {
  const query = `
    query GetOrders($first: Int!, $after: String, $since: String!) {
      orders(first: $first, after: $after, query: $since, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            totalPriceSet {
              shopMoney {
                amount
              }
            }
            displayFinancialStatus
            displayFulfillmentStatus
            createdAt
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `;

  const allOrders: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  try {
    while (hasNextPage) {
      const data = await graphqlRequest(shop, accessToken, query, {
        first: 50,
        after: cursor,
        since: `created_at:>${new Date(Date.now() - 30 * 86400000).toISOString()}`,
      });

      const edges = data.orders.edges;
      allOrders.push(...edges.map((e: any) => e.node));

      hasNextPage = data.orders.pageInfo.hasNextPage;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
      
      if (edges.length === 0) break;
    }

    console.log(`[GraphQL] ✅ Fetched ${allOrders.length} orders from ${shop}`);
  } catch (error) {
    console.error(`[GraphQL] ❌ Error fetching orders:`, error);
    throw error;
  }

  return allOrders;
}

/**
 * Transform GraphQL product data to match UI expectations (snake_case)
 */
export interface AbandonedCheckout {
  id: string;
  name: string;
  customer_name: string | null;
  customer_id: string | null;
  email: string | null;
  phone: string | null;
  sms_marketing_state: string;
  sms_consent_updated_at: string | null;
  customer_details_available: boolean;
  created_at: string;
  total_price: string;
  currency: string;
  line_items: Array<{ title: string; quantity: number }>;
}

interface CheckoutNode {
  id: string;
  name: string;
  createdAt: string;
  completedAt: string | null;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    defaultEmailAddress: { emailAddress: string } | null;
    defaultPhoneNumber: {
      phoneNumber: string;
      smsMarketingConsent: { state: string; updatedAt: string | null };
    } | null;
  } | null;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  lineItems: { nodes: Array<{ title: string | null; quantity: number }> };
}

/** Shopify exposes abandoned checkouts after the buyer provides contact details. */
export async function fetchAbandonedCheckoutsGraphQL(shop: string, accessToken: string): Promise<AbandonedCheckout[]> {
  const query = `
    query GetAbandonedCheckouts($first: Int!, $after: String, $includeCustomer: Boolean!, $since: String!) {
      abandonedCheckouts(first: $first, after: $after, query: $since, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          name
          createdAt
          completedAt
          customer @include(if: $includeCustomer) {
            id
            firstName
            lastName
            defaultEmailAddress { emailAddress }
            defaultPhoneNumber {
              phoneNumber
              smsMarketingConsent { state updatedAt }
            }
          }
          totalPriceSet { shopMoney { amount currencyCode } }
          lineItems(first: 100) { nodes { title quantity } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const checkouts: AbandonedCheckout[] = [];
  let after: string | null = null;
  let includeCustomer = true;
  while (true) {
    let data;
    try {
      data = await graphqlRequest(shop, accessToken, query, { first: 25, after, includeCustomer,
        since: `created_at:>${new Date(Date.now() - 30 * 86400000).toISOString()}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Customer permission must not prevent loading otherwise accessible checkouts.
      if (includeCustomer && message.includes("ACCESS_DENIED") &&
          (message.includes("read_customers") || message.includes('"customer"') || message.includes("Customer object"))) {
        includeCustomer = false;
        continue;
      }
      throw error;
    }
    const connection = data.abandonedCheckouts as {
      nodes: CheckoutNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    for (const checkout of connection.nodes) {
      if (checkout.completedAt) continue;
      checkouts.push({
        id: checkout.id,
        name: checkout.name,
        customer_details_available: includeCustomer,
        customer_name: [checkout.customer?.firstName, checkout.customer?.lastName].filter(Boolean).join(" ") || null,
        customer_id: checkout.customer?.id ?? null,
        email: checkout.customer?.defaultEmailAddress?.emailAddress ?? null,
        phone: checkout.customer?.defaultPhoneNumber?.phoneNumber ?? null,
        sms_marketing_state: checkout.customer?.defaultPhoneNumber?.smsMarketingConsent?.state ?? "UNKNOWN",
        sms_consent_updated_at: checkout.customer?.defaultPhoneNumber?.smsMarketingConsent?.updatedAt ?? null,
        created_at: checkout.createdAt,
        total_price: checkout.totalPriceSet.shopMoney.amount,
        currency: checkout.totalPriceSet.shopMoney.currencyCode,
        line_items: checkout.lineItems.nodes.map(item => ({ title: item.title ?? "Item", quantity: item.quantity })),
      });
    }
    if (!connection.pageInfo.hasNextPage) break;
    if (!connection.pageInfo.endCursor || connection.pageInfo.endCursor === after) {
      throw new Error("Shopify could not load the next page of abandoned checkouts. Please retry.");
    }
    after = connection.pageInfo.endCursor;
  }
  return recentRecords(checkouts);
}

function transformProduct(product: any): any {
  return {
    id: product.id,
    title: product.title,
    vendor: product.vendor,
    product_type: product.productType, // camelCase → snake_case
    status: product.status,
    variants: product.variants.edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      price: e.node.price,
      inventory_quantity: e.node.inventoryQuantity, // camelCase → snake_case
    })),
    image: product.featuredImage ? {
      src: product.featuredImage.url,
    } : null,
  };
}

/**
 * Transform GraphQL order data to match UI expectations (snake_case)
 */
function transformOrder(order: any): any {
  return {
    id: order.id,
    name: order.name,
    email: "",
    total_price: order.totalPriceSet.shopMoney.amount, // nested → flat
    financial_status: order.displayFinancialStatus, // camelCase → snake_case
    fulfillment_status: order.displayFulfillmentStatus === 'UNFULFILLED' ? null : order.displayFulfillmentStatus, // camelCase → snake_case
    created_at: order.createdAt, // camelCase → snake_case
    line_items: order.lineItems.edges.map((e: any) => ({
      title: e.node.title,
      quantity: e.node.quantity,
    })),
  };
}

/**
 * Fetch all data using GraphQL (products + orders)
 */
export async function fetchAllShopDataGraphQL(
  shop: string,
  accessToken: string
): Promise<{
  products: any[];
  orders: any[];
  abandonedCheckouts: AbandonedCheckout[];
  errors: Partial<Record<"products" | "orders" | "abandonedCheckouts", string>>;
}> {
  const results = await Promise.allSettled([
    fetchProductsGraphQL(shop, accessToken),
    fetchOrdersGraphQL(shop, accessToken),
    fetchAbandonedCheckoutsGraphQL(shop, accessToken),
  ]);
  const errors: Partial<Record<"products" | "orders" | "abandonedCheckouts", string>> = {};
  const [productResult, orderResult, checkoutResult] = results;
  if (productResult.status === "rejected") errors.products = String(productResult.reason?.message || productResult.reason);
  if (orderResult.status === "rejected") errors.orders = String(orderResult.reason?.message || orderResult.reason);
  if (checkoutResult.status === "rejected") {
    const message = String(checkoutResult.reason?.message || checkoutResult.reason);
    errors.abandonedCheckouts = message.includes("not approved to access the AbandonedCheckout object")
      ? "Shopify approval is required. In the Shopify Dev Dashboard, open this app and request protected customer data access for abandoned checkouts, then refresh again."
      : message;
  }
  return {
    products: productResult.status === "fulfilled" ? productResult.value.map(transformProduct) : [],
    orders: orderResult.status === "fulfilled" ? recentRecords(orderResult.value.map(transformOrder)) : [],
    abandonedCheckouts: checkoutResult.status === "fulfilled" ? checkoutResult.value : [],
    errors,
  };
}
