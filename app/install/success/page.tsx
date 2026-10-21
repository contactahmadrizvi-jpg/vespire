"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop") || "your store";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Installation Complete! 🎉
        </h1>
        
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Successfully connected <span className="font-semibold">{shop}</span> to Vespire.
        </p>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          We're fetching your products, orders, and abandoned carts now...
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href={`/shopify/stores/${shop}`}
            className="block w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            View Store Dashboard
          </Link>
          
          <Link
            href="/shopify/stores"
            className="block w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            View All Stores
          </Link>
        </div>

        <p className="mt-6 text-xs text-zinc-400">
          You can now manage your Shopify data from Vespire
        </p>
      </div>
    </div>
  );
}

export default function InstallSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
