"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { useAuth } from "@/lib/firebase/auth-context";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validation/auth-schema";
import { RATE_LIMITS, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { formatTimeRemaining, getAuthErrorMessage } from "@/lib/utils";
import { FormInput } from "@/components/ui/form-input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [authError, setAuthError] = useState<string | null>(null);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setAuthError(null);
    setRateLimitMsg(null);

    const result = rateLimit(
      "forgotPassword",
      RATE_LIMITS.forgotPassword.maxAttempts,
      RATE_LIMITS.forgotPassword.windowMs,
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
      await resetPassword(data.email);
      resetRateLimit("forgotPassword");
      setSentEmail(data.email);
      setSuccess(true);
    } catch (err) {
      setAuthError(getAuthErrorMessage(err));
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Check your inbox
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {sentEmail}
            </span>
            . The link expires in 1 hour.
          </p>
        </div>

        <div className="rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-400">
          If you don&apos;t see the email, check your spam folder.
        </div>

        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Reset password
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter your email and we&apos;ll send you a reset link.
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting && <LoadingSpinner size="sm" />}
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
