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
      products(first: $first, after: $after) {
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

  while (hasNextPage) {
    const data = await graphqlRequest(shop, accessToken, query, {
      first: 50,
      after: cursor,
    });

    const edges = data.products.edges;
    allProducts.push(...edges.map((e: any) => e.node));

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
  }

  console.log(`[GraphQL] Fetched ${allProducts.length} products from ${shop}`);
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

  while (hasNextPage) {
    const data = await graphqlRequest(shop, accessToken, query, {
      first: 50,
      after: cursor,
    });

    const edges = data.orders.edges;
    allOrders.push(...edges.map((e: any) => e.node));

    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
  }

  console.log(`[GraphQL] Fetched ${allOrders.length} orders from ${shop}`);
  return allOrders;
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

  const [products, orders] = await Promise.all([
    fetchProductsGraphQL(shop, accessToken).catch((err) => {
      console.error("[GraphQL] Products fetch error:", err);
      return [];
    }),
    fetchOrdersGraphQL(shop, accessToken).catch((err) => {
      console.error("[GraphQL] Orders fetch error:", err);
      return [];
    }),
  ]);

  console.log(
    `[GraphQL] ✅ Fetch complete - Products: ${products.length}, Orders: ${orders.length}`
  );

  return { products, orders };
}
