import Link from "next/link";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/**
 * Lists all connected Shopify stores from Firestore.
 */
export default async function StoresPage() {
  const db = getAdminDb();
  const snapshot = await db.collection("shopify_installs").get();
  
  const stores = snapshot.docs.map((doc) => ({
    shop: doc.id,
    ...doc.data(),
  }));

  if (stores.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <svg
            className="mx-auto h-12 w-12 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          No stores connected
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Connect your first Shopify store to get started.
        </p>
        <Link
          href="/install"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Connect Store
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Connected Stores
        </h1>
        <Link
          href="/install"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          + Connect Store
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store: any) => (
          <Link
            key={store.shop}
            href={`/shopify/stores/${store.shop}`}
            className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                <svg
                  className="h-5 w-5 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="truncate font-semibold text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-50 dark:group-hover:text-zinc-200">
                  {store.shop.replace('.myshopify.com', '')}
                </h3>
                <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {store.shop}
                </p>
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  Scopes: {store.scope}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" className="text-green-500" />
              </svg>
              Connected
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
