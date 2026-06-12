"use client";

import { StarIcon } from "./icons";

export function StarButton({
  id,
  name,
  starred,
  onToggle,
  size = "sm",
}: {
  id: string;
  name: string;
  starred: boolean;
  onToggle: (id: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      aria-pressed={starred}
      aria-label={starred ? `Unstar ${name}` : `Star ${name}`}
      title={starred ? "Remove from watchlist" : "Add to watchlist"}
      className={[
        "inline-flex items-center justify-center transition-colors duration-200",
        // 44px touch target via padding while keeping the glyph small.
        size === "md" ? "p-3 -m-1" : "p-2.5 -m-1",
        starred ? "text-rose" : "text-stone-500 hover:text-paper",
      ].join(" ")}
    >
      <StarIcon filled={starred} />
    </button>
  );
}
