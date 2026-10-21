"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/lib/firebase/auth-context";
import { loginSchema, type LoginInput } from "@/lib/validation/auth-schema";
import { RATE_LIMITS, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { formatTimeRemaining, getAuthErrorMessage } from "@/lib/utils";
import { FormInput } from "@/components/ui/form-input";
import { GoogleButton } from "@/components/auth/google-button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function LoginForm() {
  const { signInWithEmail } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [authError, setAuthError] = useState<string | null>(null);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setAuthError(null);
    setRateLimitMsg(null);

    const result = rateLimit(
      "login",
      RATE_LIMITS.login.maxAttempts,
      RATE_LIMITS.login.windowMs,
    );
    if (!result.success) {
      setRateLimitMsg(
        `Too many attempts. Try again in ${formatTimeRemaining(
          result.resetAt - Date.now(),
        )}.`,
      );
      return;
    }

    try {
      await signInWithEmail(data.email, data.password);
      resetRateLimit("login");
      router.push(redirectTo);
    } catch (err) {
      setAuthError(getAuthErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Sign in
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back. Enter your details to continue.
        </p>
      </div>

      {authError && (
        <div
          className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
          role="alert"
        >
          {authError}
        </div>
      )}

      {rateLimitMsg && (
        <div
          className="rounded-lg bg-orange-50 px-3 py-2.5 text-sm text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"
          role="alert"
        >
          {rateLimitMsg}
        </div>
      )}

      <FormInput
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <FormInput
        label="Password"
        type="password"
        placeholder="Your password"
        autoComplete="current-password"
        showPasswordToggle
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting && <LoadingSpinner size="sm" />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>

      {/* Divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-xs text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
            or
          </span>
        </div>
      </div>

      <GoogleButton />

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
