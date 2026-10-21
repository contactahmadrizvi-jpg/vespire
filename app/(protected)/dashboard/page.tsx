"use client";

import { useAuth } from "@/lib/firebase/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const displayName = user.displayName ?? "there";
  const provider =
    user.providerData?.[0]?.providerId === "google.com"
      ? "Google"
      : "Email & Password";

  // Format the account creation date.
  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome, {displayName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          You&apos;re signed in. Here&apos;s your account overview.
        </p>
      </div>

      {/* Account card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Account
        </h2>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Name
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {user.displayName ?? "Not set"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Email
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {user.email}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Sign-in method
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {provider}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Email verified
            </dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-sm">
              {user.emailVerified ? (
                <>
                  <span className="text-green-500">✓</span>
                  <span className="text-zinc-900 dark:text-zinc-100">Yes</span>
                </>
              ) : (
                <>
                  <span className="text-orange-500">○</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    Not yet
                  </span>
                </>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Member since
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {createdAt}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              User ID
            </dt>
            <dd className="mt-0.5 truncate text-xs font-mono text-zinc-600 dark:text-zinc-400">
              {user.uid}
            </dd>
          </div>
        </dl>
      </div>

      {/* Tip */}
      {!user.emailVerified && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-400">
          Your email isn&apos;t verified yet. Check your inbox for a
          verification link from Firebase.
        </div>
      )}
    </div>
  );
}
