import type { Platform } from "@/lib/types";

// Desaturated, bordered platform chips — tinted border + faint bg, no bright
// solid blocks. Each uses a 1px border with ~15% bg tint.
const PLATFORM_CHIP: Record<Platform, string> = {
  Resy: "border-sky-700/60 bg-sky-500/10 text-sky-300",
  Tock: "border-violet-700/60 bg-violet-500/10 text-violet-300",
  OpenTable: "border-red-800/60 bg-red-500/10 text-red-300",
  SevenRooms: "border-amber-700/60 bg-amber-500/10 text-amber-300",
  Phone: "border-emerald-800/60 bg-emerald-500/10 text-emerald-300",
  "Invitation Only": "border-stone-700 bg-stone-500/10 text-stone-300",
  "Walk-in Only": "border-teal-800/60 bg-teal-500/10 text-teal-300",
};

export function PlatformChip({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-block border px-1.5 py-0.5 text-[10px] uppercase tracking-micro ${
        PLATFORM_CHIP[platform] ?? PLATFORM_CHIP["Invitation Only"]
      }`}
    >
      {platform}
    </span>
  );
}

export function MicroLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-[10px] uppercase tracking-micro text-stone-500 ${className}`}
    >
      {children}
    </span>
  );
}

/** Primary action — the white "Book on {platform}" link. */
export function BookLink({
  href,
  children,
  full = false,
}: {
  href: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "inline-flex items-center justify-center bg-paper text-ink",
        "px-4 py-2.5 text-xs font-medium uppercase tracking-micro",
        "transition-colors duration-200 hover:bg-stone-300",
        full ? "w-full" : "",
      ].join(" ")}
    >
      {children}
    </a>
  );
}

/** Secondary bordered action (phone, calendar, etc.). */
export function GhostLink({
  href,
  onClick,
  children,
  as = "a",
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  as?: "a" | "button";
}) {
  const cls =
    "inline-flex items-center justify-center border border-stone-700 px-3 py-2 text-xs uppercase tracking-micro text-paper transition-colors duration-200 hover:border-stone-500 hover:bg-stone-900";
  if (as === "button") {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  );
}
