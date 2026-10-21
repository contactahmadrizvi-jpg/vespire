"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function InstallPage() {
  const router = useRouter();
  const [shop, setShop] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validatedShop, setValidatedShop] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Check if user already has connected stores
  useEffect(() => {
    async function checkStores() {
      try {
        const res = await fetch("/api/shopify/stores");
        if (res.ok) {
          const data = await res.json();
          if (data.stores && data.stores.length > 0) {
            // Redirect to stores dashboard
            router.push("/shopify/stores");
            return;
          }
        }
      } catch (err) {
        console.error("Failed to check stores:", err);
      } finally {
        setChecking(false);
      }
    }
    
    checkStores();
  }, [router]);

  function normaliseInput(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "");
  }

  function validate(value: string): string | null {
    if (!value) return "Please enter your store URL.";
    const full = value.includes(".") ? value : `${value}.myshopify.com`;
    const valid = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(full);
    if (!valid)
      return 'Enter a valid Shopify store URL, e.g. "your-store.myshopify.com".';
    return null;
  }

  function handleClick() {
    setError(null);

    const normalised = normaliseInput(shop);
    const validationError = validate(normalised);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setValidatedShop(normalised);
  }

  // If validated, show a direct link instead of JavaScript redirect
  if (validatedShop) {
    const authUrl = `/api/auth?shop=${encodeURIComponent(validatedShop)}`;
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Vespire
            </h1>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Ready to Connect
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Click the button below to authorize Vespire on Shopify.
            </p>

            <a
              href={authUrl}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              Continue to Shopify
            </a>

            <button
              onClick={() => setValidatedShop(null)}
              className="mt-3 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              ← Change store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking stores
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100"></div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Vespire
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Connect your Shopify store to get started.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Install App
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Enter your Shopify store&apos;s URL to begin.
              </p>
            </div>

            {error && (
              <div
                className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="shop-url"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Store URL
              </label>
              <div className="flex items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white transition-colors focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900">
                <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
                  https://
                </span>
                <input
                  id="shop-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="your-store.myshopify.com"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                Example: <span className="font-mono">my-store.myshopify.com</span>
              </p>
            </div>

            <button
              onClick={handleClick}
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              Connect with Shopify
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
          You&apos;ll be asked to approve permissions on your Shopify store.
        </p>
      </div>
    </div>
  );
}
