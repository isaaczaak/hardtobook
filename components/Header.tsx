"use client";

import { formatEtClock } from "@/lib/time";
import { useNow } from "@/lib/useNow";

export type Mode = "drops" | "tonight" | "plan" | "spots" | "map";

const MODES: { key: Mode; label: string }[] = [
  { key: "drops", label: "Drops" },
  { key: "map", label: "Map" },
  { key: "tonight", label: "Tonight" },
  { key: "plan", label: "Plan" },
  { key: "spots", label: "Spots" },
];

export function Header({
  mode,
  onModeChange,
}: {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}) {
  const now = useNow();

  return (
    <header className="border-b border-stone-800">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif lowercase text-2xl sm:text-3xl text-paper leading-none">
              hard to book <span aria-hidden="true">🥀</span>
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              NYC&apos;s hardest reservations, on the clock.
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-micro text-stone-600">
              never books for you · no bots
            </p>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-micro text-stone-500">
              NYC · ET
            </div>
            <div
              className="font-mono tabular-nums text-lg sm:text-xl text-paper"
              aria-label="Current New York time"
            >
              {now == null ? "--:--:--" : formatEtClock(now)}
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="View" className="mx-auto max-w-6xl px-4">
        <ul className="grid grid-cols-5 gap-px">
          {MODES.map((m) => {
            const active = m.key === mode;
            return (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => onModeChange(m.key)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "w-full min-h-[44px] px-2 py-3 text-xs uppercase tracking-micro",
                    "border-t-2 transition-colors duration-200",
                    active
                      ? "border-paper text-paper"
                      : "border-transparent text-stone-500 hover:text-paper",
                  ].join(" ")}
                >
                  {m.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
