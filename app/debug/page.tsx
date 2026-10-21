"use client";

import { useState } from "react";

export default function DebugPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const shop = "ahmad-kwz2ciyr.myshopify.com";

  async function runTests() {
    setLoading(true);
    setResults(null);

    try {
      const [storeData, graphqlData, restData] = await Promise.all([
        fetch(`/api/debug/check-store?shop=${shop}`).then(r => r.json()),
        fetch(`/api/debug/test-graphql?shop=${shop}`).then(r => r.json()),
        fetch(`/api/debug/test-rest?shop=${shop}`).then(r => r.json()),
      ]);

      setResults({
        store: storeData,
        graphql: graphqlData,
        rest: restData,
      });
    } catch (error) {
      setResults({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          🔍 Shopify Integration Debug Dashboard
        </h1>

        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Testing Store: {shop}
          </h2>
          <button
            onClick={runTests}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Running Tests..." : "Run All Diagnostic Tests"}
          </button>
        </div>

        {results && (
          <div className="space-y-6">
            {/* Store Data */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                📦 Firestore Data
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Has Access Token:</span>
                  <span className={results.store.hasAccessToken ? "text-green-600" : "text-red-600"}>
                    {results.store.hasAccessToken ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Installed Scopes:</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-50">
                    {results.store.scope}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Products Count:</span>
                  <span className={results.store.productsCount > 0 ? "text-green-600" : "text-orange-600"}>
                    {results.store.productsCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Orders Count:</span>
                  <span className={results.store.ordersCount > 0 ? "text-green-600" : "text-orange-600"}>
                    {results.store.ordersCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Last Fetch:</span>
                  <span className="text-zinc-900 dark:text-zinc-50">
                    {new Date(results.store.lastDataFetch).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* REST API Tests */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                🌐 REST API Tests
              </h3>
              <div className="space-y-4">
                {results.rest.tests?.productsCount && (
                  <div>
                    <div className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      Products Count:
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {results.rest.tests.productsCount.count}
                      </div>
                      <div className="text-sm text-zinc-500">
                        Status: {results.rest.tests.productsCount.status}
                      </div>
                    </div>
                  </div>
                )}
                {results.rest.tests?.products && (
                  <div>
                    <div className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      Products (First 5):
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      {results.rest.tests.products.count > 0 ? (
                        <ul className="list-inside list-disc space-y-1">
                          {results.rest.tests.products.products.map((p: any) => (
                            <li key={p.id} className="text-sm text-zinc-900 dark:text-zinc-50">
                              {p.title} - ${p.variants?.[0]?.price}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-zinc-500">No products found</div>
                      )}
                    </div>
                  </div>
                )}
                {results.rest.tests?.ordersCount && (
                  <div>
                    <div className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      Orders Count:
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      {results.rest.tests.ordersCount.errors ? (
                        <div className="text-sm text-red-600">
                          ❌ Error: {JSON.stringify(results.rest.tests.ordersCount.errors)}
                          <div className="mt-2 text-zinc-600">
                            Likely missing <code>read_orders</code> scope
                          </div>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                          {results.rest.tests.ordersCount.count}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* GraphQL Tests */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                🔷 GraphQL API Tests
              </h3>
              <div className="space-y-4">
                {results.graphql.tests?.shop && (
                  <div>
                    <div className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      Shop Query:
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      {results.graphql.tests.shop.success ? (
                        <div className="text-sm text-green-600">
                          ✅ Success - {results.graphql.tests.shop.data?.shop?.name}
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          ❌ Failed: {JSON.stringify(results.graphql.tests.shop.errors)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {results.graphql.tests?.products && (
                  <div>
                    <div className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      Products Query:
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      {results.graphql.tests.products.success ? (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                            {results.graphql.tests.products.count}
                          </div>
                          <div className="text-sm text-zinc-500">products found</div>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          ❌ Failed: {JSON.stringify(results.graphql.tests.products.errors)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {results.graphql.tests?.orders && (
                  <div>
                    <div className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                      Orders Query:
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      {results.graphql.tests.orders.success ? (
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                            {results.graphql.tests.orders.count}
                          </div>
                          <div className="text-sm text-zinc-500">orders found</div>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          ❌ Failed: {JSON.stringify(results.graphql.tests.orders.errors)}
                          <div className="mt-2 text-zinc-600">
                            Likely missing <code>read_orders</code> scope
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Raw JSON */}
            <details className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <summary className="cursor-pointer text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                📄 Raw JSON Results
              </summary>
              <pre className="mt-4 overflow-auto rounded-lg bg-zinc-900 p-4 text-xs text-green-400">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
