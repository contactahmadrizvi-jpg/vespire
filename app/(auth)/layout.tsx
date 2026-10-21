"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Layout for all authentication pages (login, signup, forgot-password).
 *
 * - Shows a brief spinner only while Firebase resolves the initial auth state.
 * - Redirects already-authenticated users to the dashboard.
 * - Falls through immediately once loading is done and there's no user.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Only block the UI while we don't yet know whether someone is logged in.
  // Once loading=false and user=null we render the form immediately.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <LoadingSpinner size="lg" className="text-zinc-400" />
      </div>
    );
  }

  // loading done but user exists — redirecting, keep spinner visible.
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <LoadingSpinner size="lg" className="text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Vespire
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {children}
        </div>
      </div>
    </div>
  );
}
