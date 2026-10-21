"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton({ shop }: { shop: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function handleRefresh() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/shopify/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop }),
      });

      if (res.ok) {
        router.refresh(); // Reload server component data
      } else {
        const error = await res.json();
        setMessage(error.error || "Could not refresh. Please try again.");
        router.refresh();
      }
    } catch {
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Refreshing...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </span>
      )}
    </button>
    {message && <p role="alert" className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}
