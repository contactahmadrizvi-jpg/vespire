import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          Welcome to Vespire
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Connect your Shopify store or sign in to your account.
        </p>

        {/* ── Shopify section ──────────────────────────────── */}
        <div className="mt-10 rounded-2xl border border-green-200 bg-white p-6 shadow-sm dark:border-green-900 dark:bg-zinc-950">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            {/* Shopify bag icon */}
            <svg
              className="h-6 w-6 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Connect a Shopify Store
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
            Install the Vespire app on your Shopify store to sync products,
            orders, and abandoned checkouts.
          </p>
          <Link
            href="/install"
            className="inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-green-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-700 w-full sm:w-auto"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            Connect Shopify Store
          </Link>
        </div>

        {/* ── Divider ──────────────────────────────────────── */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-zinc-50 px-3 text-xs text-zinc-400 dark:bg-black dark:text-zinc-600">
              or
            </span>
          </div>
        </div>

        {/* ── Auth section ─────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="flex h-11 items-center justify-center rounded-lg border border-zinc-200 px-6 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
