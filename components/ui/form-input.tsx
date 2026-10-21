"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Optional leading icon rendered inside the input. */
  icon?: ReactNode;
  /** When true and type is "password", renders a show/hide toggle. */
  showPasswordToggle?: boolean;
}

/**
 * Reusable form input with label, error display, optional leading icon,
 * and password visibility toggle.  Built with `forwardRef` so it works
 * seamlessly with react-hook-form's `register()`.
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      icon,
      showPasswordToggle = false,
      type = "text",
      id,
      className,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId =
      id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const inputType =
      showPasswordToggle && showPassword ? "text" : type;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
        </label>

        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            aria-invalid={!!error}
            className={cn(
              "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400",
              "focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100",
              icon && "pl-10",
              showPasswordToggle && "pr-10",
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                : "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-900/10 dark:border-zinc-700",
              className,
            )}
            {...props}
          />

          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormInput.displayName = "FormInput";
