"use client";

import { useMemo } from "react";
import type { Restaurant } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import {
  computeWalkInStatus,
  type WalkInStatus,
} from "@/lib/time";
import { StarButton } from "./StarButton";
import { MicroLabel } from "./ui";

const STATUS_ORDER: Record<WalkInStatus, number> = {
  "GO NOW": 0,
  "GO LATER": 1,
  NEUTRAL: 2,
  "LONG SHOT": 3,
};

const STATUS_STYLE: Record<WalkInStatus, string> = {
  "GO NOW": "text-rose border-rose",
  "GO LATER": "text-emerald-300 border-emerald-700",
  NEUTRAL: "text-stone-300 border-stone-700",
  "LONG SHOT": "text-stone-500 border-stone-800",
};

export function TonightView({
  restaurants,
  isStarred,
  toggle,
}: {
  restaurants: Restaurant[];
  isStarred: (id: string) => boolean;
  toggle: (id: string) => void;
}) {
  const now = useNow();

  const walkInPlays = useMemo(() => {
    if (now == null) return [];
    return restaurants
      .filter((r) => r.walkIns)
      .map((r) => computeWalkInStatus(r, now))
      .sort((a, b) => {
        const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (d !== 0) return d;
        return a.restaurant.name.localeCompare(b.restaurant.name);
      });
  }, [restaurants, now]);

  const snipes = useMemo(
    () =>
      [...restaurants.filter((r) => !r.walkIns)].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [restaurants]
  );

  if (now == null) {
    return (
      <section aria-label="Tonight" className="py-16 text-center">
        <MicroLabel>Reading the clock…</MicroLabel>
      </section>
    );
  }

  return (
    <section aria-label="Tonight">
      <p className="mb-6 text-sm text-stone-400">
        Where you can still eat tonight.
      </p>

      <div className="mb-3">
        <MicroLabel>Walk-in playbook</MicroLabel>
      </div>
      {walkInPlays.length === 0 ? (
        <p className="text-sm text-stone-500">No walk-in spots on record.</p>
      ) : (
        <ul className="border-t border-stone-800 divide-y divide-stone-800">
          {walkInPlays.map((play) => {
            const r = play.restaurant;
            return (
              <li key={r.id} className="py-3 flex items-start gap-3">
                <StarButton
                  id={r.id}
                  name={r.name}
                  starred={isStarred(r.id)}
                  onToggle={toggle}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-paper">{r.name}</span>
                    <span
                      className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-micro ${STATUS_STYLE[play.status]}`}
                    >
                      {play.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-400">{play.message}</p>
                  <p className="text-[10px] uppercase tracking-micro text-stone-600">
                    {r.neighborhood} · {r.cuisine}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 mb-3">
        <MicroLabel>Snipe a cancellation</MicroLabel>
      </div>
      {snipes.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing here.</p>
      ) : (
        <ul className="border-t border-stone-800 divide-y divide-stone-800">
          {snipes.map((r) => (
            <li key={r.id} className="py-3 flex items-start gap-3">
              <StarButton
                id={r.id}
                name={r.name}
                starred={isStarred(r.id)}
                onToggle={toggle}
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm text-paper">{r.name}</span>
                <p className="mt-0.5 text-xs text-stone-400">{snipeAdvice(r)}</p>
                <p className="text-[10px] uppercase tracking-micro text-stone-600">
                  {r.neighborhood} · {r.cuisine}
                </p>
              </div>
              {r.platformUrl && (
                <a
                  href={r.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] uppercase tracking-micro text-stone-500 hover:text-paper transition-colors duration-200"
                >
                  Open →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function snipeAdvice(r: Restaurant): string {
  switch (r.platform) {
    case "Resy":
      return "Turn on Resy Notify for tonight.";
    case "Tock":
    case "OpenTable":
    case "SevenRooms":
      return "Check for same-day releases and watch the waitlist.";
    case "Phone":
      return r.phoneNumber
        ? `Call at ${r.phoneNumber} — be polite, ask about bar seats.`
        : "Call and ask about bar seats — be polite.";
    case "Invitation Only":
      return "Know someone.";
    default:
      return "Check the platform for same-day openings.";
  }
}
