import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase/admin";
import RefreshButton from "./RefreshButton";

export const dynamic = "force-dynamic";

interface Product {
  id: string;
  title: string;
  vendor: string;
  product_type: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    inventory_quantity: number;
  }>;
  image?: {
    src: string;
  };
}

interface Order {
  id: string;
  name: string;
  email: string;
  total_price: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  line_items: Array<{
    title: string;
    quantity: number;
  }>;
}

interface AbandonedCheckout {
  id: string;
  name?: string;
  customer_name?: string | null;
  email?: string | null;
  phone?: string | null;
  sms_marketing_state?: string;
  currency?: string;
  total_price: string;
  created_at: string;
  line_items: Array<{
    title: string;
    quantity: number;
  }>;
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ shop: string }>;
}) {
  const { shop } = await params;
  const db = getAdminDb();
  
  const docRef = db.collection("shopify_installs").doc(shop);
  const doc = await docRef.get();

  if (!doc.exists) {
    notFound();
  }

  const storeData = doc.data();
  const products = (storeData?.products || []) as Product[];
  const orders = (storeData?.orders || []) as Order[];
  const abandonedCheckouts = (storeData?.abandoned_checkouts || []) as AbandonedCheckout[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/shopify/stores"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to stores
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {shop.replace('.myshopify.com', '')}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{shop}</p>
        </div>
        
        <div className="flex gap-2">
          <RefreshButton shop={shop} />
          <form action="/api/shopify/disconnect" method="POST">
            <input type="hidden" name="shop" value={shop} />
            <button
              type="submit"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
            >
              Disconnect Store
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-2 text-sm" role="status">
        <p className="text-zinc-500">{storeData?.lastDataFetch ? 'Last synced: ' + new Date(storeData.lastDataFetch).toLocaleString() : 'Click Refresh Data to load products and recent orders.'}</p>
        {Object.entries(storeData?.syncErrors ?? {}).map(([resource, message]) => (
          <p key={resource} className="text-red-600">{resource}: {String(message)}</p>
        ))}
        <Link href={'/api/auth?shop=' + encodeURIComponent(shop)} className="inline-block underline">Reconnect store permissions</Link>
        <p className="text-zinc-500">Shopify normally provides orders from the last 60 days. Older orders require additional access.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Products</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{products.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Orders</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{orders.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Abandoned Checkouts</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{abandonedCheckouts.length}</div>
        </div>
      </div>

      {/* Products */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Products</h2>
        {products.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No products found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {product.image?.src && (
                  <img
                    src={product.image.src}
                    alt={product.title}
                    className="mb-3 h-40 w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{product.title}</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {product.vendor} • {product.product_type}
                </p>
                {product.variants[0] && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      ${product.variants[0].price}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Stock: {product.variants[0].inventory_quantity}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {products.length > 6 && (
          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Showing 6 of {products.length} products
          </p>
        )}
      </section>

      {/* Orders */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Recent Orders</h2>
        {orders.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">{order.name}</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                        {order.financial_status}
                      </span>
                      {order.fulfillment_status && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                          {order.fulfillment_status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{order.email}</p>
                    <div className="mt-2 space-y-1">
                      {(order.line_items ?? []).map((item, idx) => (
                        <p key={idx} className="text-xs text-zinc-600 dark:text-zinc-400">
                          {item.quantity}x {item.title}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      ${order.total_price}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {orders.length > 5 && (
          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Showing 5 of {orders.length} orders
          </p>
        )}
      </section>

      {/* Abandoned Checkouts */}
      <section>
        <p className="mb-3 text-sm text-zinc-500">Checkouts where a buyer provided contact details but did not finish purchasing.</p>
        <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">Abandoned Checkouts</h2>
        {abandonedCheckouts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No abandoned checkouts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {abandonedCheckouts.slice(0, 5).map((checkout) => (
              <div
                key={checkout.id}
                className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">{checkout.name || checkout.email || "Abandoned checkout"}</span>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                        Abandoned
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <p>{checkout.customer_name || "Name not provided"}</p>
                      <p>{checkout.email || "Email not provided"}</p>
                      <p>{checkout.phone || "Phone not provided"}</p>
                      <p>SMS marketing consent: {checkout.sms_marketing_state || "UNKNOWN"}</p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(checkout.line_items ?? []).map((item, idx) => (
                        <p key={idx} className="text-xs text-zinc-600 dark:text-zinc-400">
                          {item.quantity}x {item.title}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {checkout.currency || "$"} {checkout.total_price}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(checkout.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {abandonedCheckouts.length > 5 && (
          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Showing 5 of {abandonedCheckouts.length} abandoned checkouts
          </p>
        )}
      </section>
    </div>
  );
}
