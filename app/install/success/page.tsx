import Link from "next/link";

/**
 * /install/success — shown after a merchant successfully installs the app.
 *
 * Marked `force-dynamic` because it reads `searchParams` at request time.
 */

export const dynamic = "force-dynamic";

export default async function InstallSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          App installed successfully
        </h1>

        {shop && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
              {shop}
            </span>{" "}
            is now connected to Vespire.
          </p>
        )}

        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Your store&apos;s products, orders, and data are being fetched in
          the background. Check your server logs to see the results.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/install"
            className="flex h-10 items-center justify-center rounded-lg border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Install another store
          </Link>
          <Link
            href="/"
            className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
