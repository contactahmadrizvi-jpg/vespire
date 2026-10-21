/**
 * Shopify GraphQL Admin API client
 * 
 * Using GraphQL instead of REST to avoid token expiration issues
 * GraphQL API is more modern and doesn't have the non-expiring token problem
 */

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
  const url = `https://${shop}/admin/api/2026-10/graphql.json`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GraphQL request failed [${response.status}]: ${text}`);
  }

  const json = await response.json();
  
  if (json.errors) {
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
      products(first: $first, after: $after, query: "status:active OR status:draft") {
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
    while (hasNextPage && allProducts.length < 250) {
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
    if (allProducts.length > 0) {
      console.log(`[GraphQL] Sample product:`, JSON.stringify(allProducts[0], null, 2));
    } else {
      console.log(`[GraphQL] ⚠️ No products found - may need to check Shopify admin`);
    }
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
    query GetOrders($first: Int!, $after: String) {
      orders(first: $first, after: $after) {
        edges {
          node {
            id
            name
            email
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
    while (hasNextPage && allOrders.length < 250) {
      const data = await graphqlRequest(shop, accessToken, query, {
        first: 50,
        after: cursor,
      });

      const edges = data.orders.edges;
      allOrders.push(...edges.map((e: any) => e.node));

      hasNextPage = data.orders.pageInfo.hasNextPage;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
      
      if (edges.length === 0) break;
    }

    console.log(`[GraphQL] ✅ Fetched ${allOrders.length} orders from ${shop}`);
    if (allOrders.length > 0) {
      console.log(`[GraphQL] Sample order:`, JSON.stringify(allOrders[0], null, 2));
    } else {
      console.log(`[GraphQL] ⚠️ No orders found`);
    }
  } catch (error) {
    console.error(`[GraphQL] ❌ Error fetching orders:`, error);
    throw error;
  }

  return allOrders;
}

/**
 * Transform GraphQL product data to match UI expectations (snake_case)
 */
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
    } : undefined,
  };
}

/**
 * Transform GraphQL order data to match UI expectations (snake_case)
 */
function transformOrder(order: any): any {
  return {
    id: order.id,
    name: order.name,
    email: order.email,
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
}> {
  console.log(`[GraphQL] Starting data fetch for: ${shop}`);

  const [rawProducts, rawOrders] = await Promise.all([
    fetchProductsGraphQL(shop, accessToken).catch((err) => {
      console.error("[GraphQL] Products fetch error:", err);
      return [];
    }),
    fetchOrdersGraphQL(shop, accessToken).catch((err) => {
      console.error("[GraphQL] Orders fetch error:", err);
      return [];
    }),
  ]);

  // Transform GraphQL camelCase to UI snake_case format
  const products = rawProducts.map(transformProduct);
  const orders = rawOrders.map(transformOrder);

  console.log(
    `[GraphQL] ✅ Fetch complete - Products: ${products.length}, Orders: ${orders.length}`
  );
  
  // Log transformed sample for debugging
  if (products.length > 0) {
    console.log(`[GraphQL] Transformed product sample:`, JSON.stringify(products[0], null, 2));
  }
  if (orders.length > 0) {
    console.log(`[GraphQL] Transformed order sample:`, JSON.stringify(orders[0], null, 2));
  }

  return { products, orders };
}
