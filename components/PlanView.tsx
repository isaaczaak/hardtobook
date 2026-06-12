"use client";

import { useMemo, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import {
  addDaysToInput,
  computePlan,
  parseDateInput,
  todayInputValue,
  type PlanBucket,
  type PlanResult,
} from "@/lib/time";
import {
  buildGoogleCalendarUrl,
  downloadIcs,
} from "@/lib/calendar";
import { StarButton } from "./StarButton";
import { PlatformChip, MicroLabel, BookLink, GhostLink } from "./ui";
import { CopyPromptButton } from "./CopyPromptButton";
import { buildPlanPrompt } from "@/lib/agentPrompt";

const BUCKET_ORDER: PlanBucket[] = [
  "MARK YOUR CALENDAR",
  "BOOKABLE NOW",
  "JUST SHOW UP",
  "CALL AHEAD",
  "GOOD LUCK",
];

const BUCKET_BLURB: Record<PlanBucket, string> = {
  "MARK YOUR CALENDAR": "Set an alarm. This is the moment to act.",
  "BOOKABLE NOW": "The window's open — go look right now.",
  "JUST SHOW UP": "No reservation game. Show up and wait.",
  "CALL AHEAD": "Pick up the phone.",
  "GOOD LUCK": "Some doors don't open for strangers.",
};

export function PlanView({
  restaurants,
  isStarred,
  toggle,
}: {
  restaurants: Restaurant[];
  isStarred: (id: string) => boolean;
  toggle: (id: string) => void;
}) {
  const now = useNow();
  // Default target: 30 days out. Computed lazily; falls back before mount.
  const [date, setDate] = useState<string>("");

  // Initialise the date once `now` is known (post-mount) to avoid SSR drift.
  const today = now == null ? null : todayInputValue(now);
  const effectiveDate =
    date || (today ? addDaysToInput(today, 30) : "");

  const target = useMemo(
    () => (effectiveDate ? parseDateInput(effectiveDate) : null),
    [effectiveDate]
  );

  const buckets = useMemo(() => {
    if (now == null || !target) return null;
    const results = restaurants.map((r) => computePlan(r, target, now));
    const grouped = new Map<PlanBucket, PlanResult[]>();
    for (const b of BUCKET_ORDER) grouped.set(b, []);
    for (const res of results) grouped.get(res.bucket)!.push(res);

    // MARK YOUR CALENDAR: soonest action first.
    grouped
      .get("MARK YOUR CALENDAR")!
      .sort((a, b) => (a.bookAtMs ?? 0) - (b.bookAtMs ?? 0));
    // Others: alphabetical for stability.
    for (const b of BUCKET_ORDER) {
      if (b === "MARK YOUR CALENDAR") continue;
      grouped.get(b)!.sort((a, b2) => a.restaurant.name.localeCompare(b2.restaurant.name));
    }
    return grouped;
  }, [restaurants, target, now]);

  if (now == null || !target) {
    return (
      <section aria-label="Plan" className="py-16 text-center">
        <MicroLabel>Loading the planner…</MicroLabel>
      </section>
    );
  }

  return (
    <section aria-label="Plan">
      <div className="mb-8 border border-stone-800 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label htmlFor="plan-date" className="block">
            <MicroLabel className="block mb-2">I want a table on…</MicroLabel>
            <input
              id="plan-date"
              type="date"
              value={effectiveDate}
              min={today ?? undefined}
              onChange={(e) => setDate(e.target.value)}
              className="bg-stone-950 border border-stone-800 text-paper font-mono text-base px-3 py-2.5 min-h-[44px] focus-visible:border-stone-500"
            />
          </label>
          <CopyPromptButton text={buildPlanPrompt(effectiveDate)} />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Tell us when. We&apos;ll tell you exactly when to set your alarm.
        </p>
      </div>

      {BUCKET_ORDER.map((bucket) => {
        const items = buckets?.get(bucket) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={bucket} className="mb-10">
            <MicroLabel className="block">{bucket}</MicroLabel>
            <p className="mt-1 mb-3 text-xs text-stone-600">
              {BUCKET_BLURB[bucket]}
            </p>
            <ul className="border-t border-stone-800 divide-y divide-stone-800">
              {items.map((res) => (
                <PlanRow
                  key={res.restaurant.id}
                  result={res}
                  target={target}
                  starred={isStarred(res.restaurant.id)}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function PlanRow({
  result,
  target,
  starred,
  onToggle,
}: {
  result: PlanResult;
  target: { year: number; month: number; day: number };
  starred: boolean;
  onToggle: (id: string) => void;
}) {
  const r = result.restaurant;
  const isCalendar = result.bucket === "MARK YOUR CALENDAR";

  return (
    <li className="py-4 flex items-start gap-3">
      <StarButton id={r.id} name={r.name} starred={starred} onToggle={onToggle} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-paper">{r.name}</span>
          <PlatformChip platform={r.platform} />
        </div>
        <p className="text-[10px] uppercase tracking-micro text-stone-600">
          {r.neighborhood} · {r.cuisine}
        </p>

        {isCalendar && result.actionLabel && (
          <p className="mt-1 font-mono text-xs text-emerald-300">
            {result.actionLabel}
            {result.relativeLabel && (
              <span className="text-stone-500"> · {result.relativeLabel}</span>
            )}
          </p>
        )}
        {!isCalendar && result.note && (
          <p className="mt-1 text-xs text-stone-400">{result.note}</p>
        )}

        {/* Actions */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isCalendar && result.bookAtMs != null && (
            <>
              <GhostLink
                href={buildGoogleCalendarUrl({
                  restaurant: r,
                  bookAtMs: result.bookAtMs,
                  target,
                })}
              >
                Google
              </GhostLink>
              <GhostLink
                as="button"
                onClick={() =>
                  downloadIcs({
                    restaurant: r,
                    bookAtMs: result.bookAtMs!,
                    target,
                  })
                }
              >
                .ics
              </GhostLink>
            </>
          )}
          {result.bucket === "BOOKABLE NOW" && r.platformUrl && (
            <BookLink href={r.platformUrl}>Book on {r.platform}</BookLink>
          )}
          {result.bucket === "CALL AHEAD" && r.phoneNumber && (
            <a
              href={`tel:${r.phoneNumber}`}
              className="inline-flex items-center justify-center border border-stone-700 px-3 py-2 text-xs uppercase tracking-micro text-paper transition-colors duration-200 hover:border-stone-500 hover:bg-stone-900"
            >
              {r.phoneNumber}
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
