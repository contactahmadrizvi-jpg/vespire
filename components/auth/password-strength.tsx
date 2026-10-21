"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

type StrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

const strengthConfig: Record<
  Exclude<StrengthLevel, "empty">,
  { label: string; bars: number; color: string }
> = {
  weak: { label: "Weak", bars: 1, color: "bg-red-500" },
  fair: { label: "Fair", bars: 2, color: "bg-orange-500" },
  good: { label: "Good", bars: 3, color: "bg-yellow-500" },
  strong: { label: "Strong", bars: 4, color: "bg-green-500" },
};

function calculateStrength(password: string): StrengthLevel {
  if (!password) return "empty";

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  if (score <= 4) return "good";
  return "strong";
}

/**
 * Password strength meter with 4 segments and a text label.
 * Updates live as the user types.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  if (strength === "empty") {
    return (
      <div className="flex h-5 items-center gap-1.5">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    );
  }

  const config = strengthConfig[strength];

  return (
    <div className="flex h-5 items-center gap-1.5">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i < config.bars ? config.color : "bg-zinc-200 dark:bg-zinc-800",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          strength === "weak" && "text-red-500",
          strength === "fair" && "text-orange-500",
          strength === "good" && "text-yellow-600 dark:text-yellow-500",
          strength === "strong" && "text-green-500",
        )}
      >
        {config.label}
      </span>
    </div>
  );
}
