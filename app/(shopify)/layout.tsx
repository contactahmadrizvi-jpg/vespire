import { ReactNode } from "react";
import Link from "next/link";

/**
 * Layout for Shopify admin pages.
 * Shows navigation for stores, products, orders, etc.
 */
export default function ShopifyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Vespire
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link href="/shopify/stores" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
                Stores
              </Link>
            </nav>
          </div>
          <Link href="/install" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            + Connect Store
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
