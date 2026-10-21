"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { getAuthErrorMessage } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Layout for all protected routes.
 *
 * - Shows a full-screen spinner while the initial auth state resolves.
 * - Redirects unauthenticated users to /login.
 * - Renders a top nav bar with the brand and a sign-out button.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      // The auth layout will pick up the null user and render the login.
    } catch (err) {
      console.error(getAuthErrorMessage(err));
      setSigningOut(false);
    }
  };

  // Spinner during initial load or while redirecting to login.
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <LoadingSpinner size="lg" className="text-zinc-400" />
      </div>
    );
  }

  // Derive initials for the avatar fallback.
  const displayName = user.displayName ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Nav bar */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Vespire
          </span>

          <div className="flex items-center gap-3">
            {/* Avatar */}
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                {initials}
              </div>
            )}

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {signingOut && <LoadingSpinner size="sm" />}
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
