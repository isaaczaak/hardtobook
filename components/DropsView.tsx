"use client";

import { useEffect, useMemo, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { useNotifications } from "@/lib/useNotifications";
import {
  computeUpcomingDrops,
  formatDropDay,
  formatEtDayAbsolute,
  type UpcomingDrop,
} from "@/lib/time";
import { Countdown } from "./Countdown";
import { StarButton } from "./StarButton";
import { PlatformChip, MicroLabel, BookLink } from "./ui";

const LIVE_WINDOW_MS = 5 * 60 * 1000; // "dropping now" lasts 5 minutes.
const MS_PER_DAY = 86_400_000;

/**
 * "Tables for {date} · {window} out" — the concrete dining date that opens when
 * this drop fires (drop instant + booking window), so the relative "28 days out"
 * is paired with an actual calendar date. Falls back to just the window label
 * for monthly-rule releases where no single day count applies.
 */
function tablesLine(drop: UpcomingDrop): string {
  const r = drop.restaurant;
  if (r.bookingWindowDays == null) return `Tables for ${r.bookingWindow} out`;
  const date = formatEtDayAbsolute(drop.dropAtMs + r.bookingWindowDays * MS_PER_DAY);
  return `Tables for ${date} · ${r.bookingWindow} out`;
}

export function DropsView({
  restaurants,
  isStarred,
  toggle,
  watchlistIds,
}: {
  restaurants: Restaurant[];
  isStarred: (id: string) => boolean;
  toggle: (id: string) => void;
  watchlistIds: string[];
}) {
  const now = useNow();
  const [filter, setFilter] = useState<"all" | "watchlist">("all");
  const notifications = useNotifications();

  const allDrops = useMemo<UpcomingDrop[]>(() => {
    if (now == null) return [];
    return computeUpcomingDrops(restaurants, now);
  }, [restaurants, now]);

  const drops = useMemo(() => {
    if (filter === "watchlist") {
      return allDrops.filter((d) => watchlistIds.includes(d.restaurant.id));
    }
    return allDrops;
  }, [allDrops, filter, watchlistIds]);

  // Fire 10-minute notifications for starred drops on every tick.
  const starredDrops = useMemo(
    () => allDrops.filter((d) => watchlistIds.includes(d.restaurant.id)),
    [allDrops, watchlistIds]
  );
  useEffect(() => {
    if (now == null) return;
    notifications.check(starredDrops);
  }, [now, starredDrops, notifications]);

  // Partition: live (dropped within last 5 min), then upcoming.
  const live = drops.filter((d) => d.msUntil <= 0 && d.msUntil > -LIVE_WINDOW_MS);
  const upcoming = drops.filter((d) => d.msUntil > 0);
  const hero = upcoming[0];
  const queue = upcoming.slice(1);

  // Pre-mount placeholder.
  if (now == null) {
    return (
      <section aria-label="Drops" className="py-16 text-center">
        <MicroLabel>Computing drops…</MicroLabel>
      </section>
    );
  }

  const empty = filter === "watchlist" && watchlistIds.length === 0;

  return (
    <section aria-label="Drops">
      <FilterAndNotify
        filter={filter}
        onFilter={setFilter}
        notifications={notifications}
      />

      {empty ? (
        <EmptyWatchlist />
      ) : drops.length === 0 ? (
        <p className="py-12 text-center text-sm text-stone-500">
          No scheduled drops to track right now.
        </p>
      ) : (
        <>
          {live.map((d) => (
            <DroppingNow key={d.restaurant.id} drop={d} starred={isStarred(d.restaurant.id)} onToggle={toggle} />
          ))}

          {hero && (
            <Hero drop={hero} starred={isStarred(hero.restaurant.id)} onToggle={toggle} now={now} />
          )}

          {queue.length > 0 && (
            <div className="mt-10">
              <MicroLabel className="block mb-3">Drop queue</MicroLabel>
              <ul className="divide-y divide-stone-800 border-t border-stone-800">
                {queue.map((d) => (
                  <QueueRow
                    key={d.restaurant.id}
                    drop={d}
                    starred={isStarred(d.restaurant.id)}
                    onToggle={toggle}
                    now={now}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FilterAndNotify({
  filter,
  onFilter,
  notifications,
}: {
  filter: "all" | "watchlist";
  onFilter: (f: "all" | "watchlist") => void;
  notifications: ReturnType<typeof useNotifications>;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div
        role="group"
        aria-label="Filter drops"
        className="inline-flex border border-stone-800"
      >
        {(["all", "watchlist"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilter(f)}
            aria-pressed={filter === f}
            className={[
              "min-h-[44px] px-4 text-[10px] uppercase tracking-micro transition-colors duration-200",
              filter === f ? "bg-paper text-ink" : "text-stone-400 hover:text-paper",
            ].join(" ")}
          >
            {f === "all" ? "All" : "Watchlist"}
          </button>
        ))}
      </div>

      {notifications.support !== "unsupported" && (
        <button
          type="button"
          onClick={
            notifications.enabled
              ? notifications.disable
              : notifications.requestAndEnable
          }
          aria-pressed={notifications.enabled}
          className={[
            "min-h-[44px] border px-3 text-[10px] uppercase tracking-micro transition-colors duration-200",
            notifications.enabled
              ? "border-emerald-700 text-emerald-300"
              : "border-stone-800 text-stone-400 hover:text-paper",
          ].join(" ")}
        >
          {notifications.support === "denied"
            ? "Notifications blocked"
            : notifications.enabled
              ? "Notify: on"
              : "Notify me"}
        </button>
      )}
    </div>
  );
}

function Hero({
  drop,
  starred,
  onToggle,
  now,
}: {
  drop: UpcomingDrop;
  starred: boolean;
  onToggle: (id: string) => void;
  now: number;
}) {
  const r = drop.restaurant;
  return (
    <div className="border border-stone-800 p-5 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <MicroLabel>Next drop · {formatDropDay(drop.dropAtMs, now)}</MicroLabel>
          <h2 className="mt-1 text-xl sm:text-2xl font-semibold text-paper">
            {r.name}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {r.neighborhood} · {r.cuisine}
          </p>
        </div>
        <StarButton id={r.id} name={r.name} starred={starred} onToggle={onToggle} size="md" />
      </div>

      <div className="mt-6">
        <Countdown msUntil={drop.msUntil} size="hero" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PlatformChip platform={r.platform} />
        <span className="text-xs text-stone-400">
          {tablesLine(drop)} · {r.releaseTime}
        </span>
      </div>

      {r.platformUrl && (
        <div className="mt-6">
          <BookLink href={r.platformUrl}>Book on {r.platform}</BookLink>
        </div>
      )}
    </div>
  );
}

function DroppingNow({
  drop,
  starred,
  onToggle,
}: {
  drop: UpcomingDrop;
  starred: boolean;
  onToggle: (id: string) => void;
}) {
  const r = drop.restaurant;
  return (
    <div className="mb-4 border border-rose p-4 sm:p-5 animate-pulse-rose">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-micro text-rose">
            ● Dropping now
          </span>
          <h2 className="mt-1 text-lg font-semibold text-paper">{r.name}</h2>
          <p className="mt-0.5 text-xs text-stone-400">
            {tablesLine(drop)} are live.
          </p>
        </div>
        <StarButton id={r.id} name={r.name} starred={starred} onToggle={onToggle} />
      </div>
      {r.platformUrl && (
        <div className="mt-4">
          <BookLink href={r.platformUrl}>Book now on {r.platform}</BookLink>
        </div>
      )}
    </div>
  );
}

function QueueRow({
  drop,
  starred,
  onToggle,
  now,
}: {
  drop: UpcomingDrop;
  starred: boolean;
  onToggle: (id: string) => void;
  now: number;
}) {
  const r = drop.restaurant;
  // Extract the clock time from the release label ("10:00 AM ET" → "10:00 AM").
  const clock = r.releaseTime.replace(/\s*ET$/i, "").replace(/\s*\(.*\)/, "");

  return (
    <li className="py-3 flex items-center gap-3">
      <StarButton id={r.id} name={r.name} starred={starred} onToggle={onToggle} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-stone-300">{clock}</span>
          <span className="text-[10px] uppercase tracking-micro text-stone-600">
            {formatDropDay(drop.dropAtMs, now)}
          </span>
        </div>
        <div className="mt-0.5 truncate text-sm text-paper">{r.name}</div>
        <div className="text-[10px] uppercase tracking-micro text-stone-600">
          {tablesLine(drop)}
        </div>
      </div>

      <div className="text-right shrink-0">
        <Countdown msUntil={drop.msUntil} className="text-emerald-400" />
        {r.platformUrl && (
          <a
            href={r.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-[10px] uppercase tracking-micro text-stone-500 hover:text-paper transition-colors duration-200"
          >
            Book →
          </a>
        )}
      </div>
    </li>
  );
}

function EmptyWatchlist() {
  return (
    <div className="border border-dashed border-stone-800 p-10 text-center">
      <p className="text-sm text-paper">Your watchlist is empty.</p>
      <p className="mt-1 text-xs text-stone-500">
        Star a few spots and they&apos;ll show up here, on the clock.
      </p>
    </div>
  );
}
