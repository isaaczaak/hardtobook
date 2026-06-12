"use client";

import { formatCountdown } from "@/lib/time";

/**
 * Renders a live countdown for `msUntil` ms. When `now` (and therefore msUntil)
 * is null — i.e. before mount — it shows a stable placeholder to avoid
 * hydration mismatch.
 */
export function Countdown({
  msUntil,
  size = "sm",
  className = "",
}: {
  msUntil: number | null;
  size?: "sm" | "hero";
  className?: string;
}) {
  const base = "font-mono tabular-nums";
  const sizing =
    size === "hero"
      ? "text-[clamp(3rem,12vw,6rem)] leading-none font-medium tracking-tight"
      : "text-sm";

  if (msUntil == null) {
    return (
      <span className={`${base} ${sizing} ${className} text-stone-600`}>
        {size === "hero" ? "—:—:—" : "—"}
      </span>
    );
  }

  return (
    <span
      className={`${base} ${sizing} ${className}`}
      aria-label={`Countdown ${formatCountdown(msUntil)}`}
    >
      {formatCountdown(msUntil)}
    </span>
  );
}
