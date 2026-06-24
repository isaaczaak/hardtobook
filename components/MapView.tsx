"use client";

import { useMemo, useRef, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import {
  getNextReleaseMs,
  parseReleaseTime,
  formatCountdown,
  formatEtDayAbsolute,
} from "@/lib/time";
import { PlatformChip, BookLink, GhostLink, MicroLabel } from "./ui";
import { LAND_PATHS, MAP_VIEW, projectLngLat } from "@/lib/mapGeometry";

// ---------------------------------------------------------------------------
// Projection
//
// Dots are placed at their true lat/lng via the SHARED projection in
// lib/mapGeometry (the same transform the NYC coastline is baked with), so the
// dots sit on the real map. A gentle collision pass then nudges apart only the
// dots that would otherwise overlap in dense clusters.
// ---------------------------------------------------------------------------

// "Dropping now" window: rose is permitted ONLY when a scheduled drop is within
// this many ms of landing (the live moment). Everywhere else rose is forbidden.
const LIVE_WINDOW_MS = 60_000;

// Minimum centre-to-centre distance between dots, in SVG units. Kept small so
// dots stay close to their true location while remaining individually tappable.
const MIN_GAP = 20;

interface Projected {
  r: Restaurant;
  x: number;
  y: number;
  radius: number;
}

function projectRestaurants(restaurants: Restaurant[]): {
  dots: Projected[];
  width: number;
  height: number;
} {
  const dots: Projected[] = restaurants.map((r) => {
    const { x, y } = projectLngLat(r.coordinates.lng, r.coordinates.lat);
    // Difficulty 5 reads slightly larger; everything else is a hair smaller.
    return { r, x, y, radius: r.difficulty >= 5 ? 7.5 : 6 };
  });

  relaxCollisions(dots);

  return { dots, width: MAP_VIEW.width, height: MAP_VIEW.height };
}

/**
 * Deterministic collision relaxation. Dense clusters (the West Village, the
 * Flatiron/NoMad band) sit nearly on top of each other; a few fixed-point
 * iterations nudge any pair closer than MIN_GAP apart along the line between
 * them. Deterministic because it depends only on the incoming positions — no
 * randomness, so render is stable across reloads.
 */
function relaxCollisions(dots: Projected[]): void {
  const ITERATIONS = 80;
  for (let pass = 0; pass < ITERATIONS; pass++) {
    let moved = false;
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i];
        const b = dots[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        // Exactly-coincident points: separate along a stable, index-derived
        // angle so the spread is reproducible rather than random.
        if (dist === 0) {
          const angle = ((i * 73 + j * 31) % 360) * (Math.PI / 180);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }
        if (dist < MIN_GAP) {
          const push = (MIN_GAP - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

interface DropInfo {
  hasSchedule: boolean;
  ms: number | null; // ms until next drop (null if unknown / no schedule)
  live: boolean;
  dropAtMs: number | null; // absolute instant of the next drop
}

/** Next-drop facts for the flyout, derived from the shared 1s `now` tick. */
function getDropInfo(r: Restaurant, now: number | null): DropInfo {
  if (r.releaseSchedule === "none") {
    return { hasSchedule: false, ms: null, live: false, dropAtMs: null };
  }
  if (now == null) {
    return { hasSchedule: true, ms: null, live: false, dropAtMs: null };
  }
  const release = parseReleaseTime(r.releaseTime);
  if (!release) {
    return { hasSchedule: true, ms: null, live: false, dropAtMs: null };
  }
  const ms = getNextReleaseMs(release, r.releaseSchedule, r.releaseDay, now);
  return {
    hasSchedule: true,
    ms,
    live: ms != null && ms <= LIVE_WINDOW_MS,
    dropAtMs: ms != null ? now + ms : null,
  };
}

/** Human "books N days out" / window label for the flyout. */
function bookingWindowLabel(r: Restaurant): string {
  if (r.bookingWindowDays != null) {
    return `${r.bookingWindowDays} days out`;
  }
  return r.bookingWindow;
}

export function MapView({
  restaurants,
  isStarred,
  toggle,
}: {
  restaurants: Restaurant[];
  isStarred: (id: string) => boolean;
  toggle: (id: string) => void;
}) {
  const now = useNow();
  // Single active spot. Hover (desktop), focus (keyboard), or tap (touch) opens
  // it; a short close delay bridges the gap between the dot and the flyout so
  // you can move onto the flyout to click the Book link without it vanishing.
  const [activeId, setActiveId] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const show = (id: string) => {
    cancelHide();
    setActiveId(id);
  };
  const hideSoon = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => setActiveId(null), 180);
  };

  const { dots, width, height } = useMemo(
    () => projectRestaurants(restaurants),
    [restaurants]
  );

  const shown = dots.find((d) => d.r.id === activeId) ?? null;

  if (restaurants.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-stone-500">
        Nothing matches. Loosen a filter.
      </p>
    );
  }

  return (
    <div
      className="relative border border-stone-800 bg-ink"
      // Tapping the map background (not a dot) dismisses the flyout.
      onClick={() => {
        cancelHide();
        setActiveId(null);
      }}
    >
      <div className="pointer-events-none absolute left-3 top-3 z-10">
        <MicroLabel className="text-stone-600">
          NYC · {restaurants.length} spots
        </MicroLabel>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-10 text-right">
        <MicroLabel className="text-stone-700">
          Hover or tap a dot
        </MicroLabel>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
        role="group"
        aria-label="Map of tracked restaurants. Hover or select a dot for details."
      >
        {/* Stylized geography: river strokes as negative space + a fine grid.
            Transit-diagram abstraction, not cartography. */}
        <MapBackground width={width} height={height} />

        {/* Area micro-labels, anchored to real coordinates. */}
        <g
          fontSize="13"
          letterSpacing="1.4"
          textAnchor="middle"
          className="fill-stone-700"
          style={{ textTransform: "uppercase" }}
          aria-hidden="true"
        >
          {(
            [
              ["MANHATTAN", -73.984, 40.778],
              ["BROOKLYN", -73.949, 40.682],
              ["QUEENS", -73.927, 40.752],
            ] as const
          ).map(([label, lng, lat]) => {
            const p = projectLngLat(lng, lat);
            return (
              <text key={label} x={p.x} y={p.y}>
                {label}
              </text>
            );
          })}
        </g>

        {/* Dots */}
        {dots.map((d) => {
          const starred = isStarred(d.r.id);
          const info = getDropInfo(d.r, now);
          const live = info.live;
          const isShown = d.r.id === activeId;
          const fill = live
            ? "fill-rose"
            : starred
              ? "fill-paper"
              : "fill-stone-400";
          return (
            <g key={d.r.id}>
              {isShown && (
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={d.radius + 6}
                  className="fill-none stroke-stone-500"
                  strokeWidth={1}
                />
              )}
              {live && (
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={d.radius + 4}
                  className="fill-none stroke-rose animate-pulse-rose"
                  strokeWidth={1.5}
                />
              )}
              <circle
                cx={d.x}
                cy={d.y}
                r={d.radius}
                className={`${fill} cursor-pointer transition-[r] duration-200`}
                tabIndex={0}
                role="button"
                aria-label={`${d.r.name}, ${d.r.neighborhood}, ${d.r.cuisine}${
                  live ? ", dropping now" : ""
                }${starred ? ", on your watchlist" : ""}`}
                aria-pressed={isShown}
                onMouseEnter={() => show(d.r.id)}
                onMouseLeave={hideSoon}
                onFocus={() => show(d.r.id)}
                onBlur={hideSoon}
                onClick={(e) => {
                  e.stopPropagation();
                  show(d.r.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    show(d.r.id);
                  }
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Flyout — HTML overlay anchored to the dot via percentage coordinates so
          it tracks the dot at any render size. Lives outside the SVG so its type
          renders crisply and it can host real links when pinned. */}
      {shown && (
        <MapFlyout
          dot={shown}
          width={width}
          height={height}
          now={now}
          starred={isStarred(shown.r.id)}
          onToggleStar={toggle}
          onPointerKeep={() => cancelHide()}
          onPointerLeave={hideSoon}
          onClose={() => {
            cancelHide();
            setActiveId(null);
          }}
        />
      )}
    </div>
  );
}

function MapFlyout({
  dot,
  width,
  height,
  now,
  starred,
  onToggleStar,
  onPointerKeep,
  onPointerLeave,
  onClose,
}: {
  dot: Projected;
  width: number;
  height: number;
  now: number | null;
  starred: boolean;
  onToggleStar: (id: string) => void;
  onPointerKeep: () => void;
  onPointerLeave: () => void;
  onClose: () => void;
}) {
  const r = dot.r;
  const info = getDropInfo(r, now);

  const leftPct = (dot.x / width) * 100;
  const topPct = (dot.y / height) * 100;

  // Flip below when near the top edge; align toward the dot when near a side
  // edge — so the box never spills outside the map.
  const flipBelow = topPct < 26;
  const vertical = flipBelow ? "top-full mt-2" : "bottom-full mb-2";
  const horizontal =
    leftPct < 28
      ? "left-0"
      : leftPct > 72
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name} ${r.neighborhood} NYC`
  )}`;

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
    >
      <article
        className={[
          "pointer-events-auto absolute w-52 border border-stone-700 bg-ink p-3",
          vertical,
          horizontal,
        ].join(" ")}
        // Keep the flyout open while the pointer is over it, and stop clicks from
        // bubbling to the map's background dismiss handler.
        onMouseEnter={onPointerKeep}
        onMouseLeave={onPointerLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-paper">
              {r.name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-stone-500">
              {r.neighborhood} · {r.cuisine}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 px-1 text-stone-600 transition-colors duration-200 hover:text-paper"
          >
            ×
          </button>
        </div>

        {/* Countdown block */}
        <div className="mt-3 border-t border-stone-800 pt-2">
          {info.live ? (
            <>
              <MicroLabel className="block text-rose">Dropping now</MicroLabel>
              <p className="mt-0.5 font-mono text-base tabular-nums text-rose">
                LIVE
              </p>
            </>
          ) : info.hasSchedule ? (
            <>
              <MicroLabel className="block">Drops in</MicroLabel>
              <p className="mt-0.5 font-mono text-base tabular-nums text-paper">
                {info.ms != null ? formatCountdown(info.ms) : "--:--:--"}
              </p>
            </>
          ) : (
            <>
              <MicroLabel className="block">Reservations</MicroLabel>
              <p className="mt-0.5 text-xs text-stone-400">No scheduled drop.</p>
            </>
          )}
        </div>

        {/* Concrete next-drop date + time, and the booking window. */}
        {info.hasSchedule && (
          <dl className="mt-2 space-y-1 text-[11px]">
            {info.dropAtMs != null && (
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-stone-600">Next drop</dt>
                <dd className="font-mono tabular-nums text-stone-300">
                  {formatEtDayAbsolute(info.dropAtMs)} · {r.releaseTime}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-stone-600">Books</dt>
              <dd className="text-stone-300">{bookingWindowLabel(r)}</dd>
            </div>
          </dl>
        )}

        {/* Booking actions — always present so the CTA is one move away. */}
        <div className="mt-3 flex flex-col gap-2 border-t border-stone-800 pt-3">
          <div className="flex items-center justify-between gap-2">
            <PlatformChip platform={r.platform} />
            <button
              type="button"
              onClick={() => onToggleStar(r.id)}
              className="text-[10px] uppercase tracking-micro text-stone-500 transition-colors duration-200 hover:text-paper"
              aria-pressed={starred}
            >
              {starred ? "★ Watching" : "☆ Watch"}
            </button>
          </div>
          {r.platformUrl ? (
            <BookLink href={r.platformUrl} full>
              Book on {r.platform}
            </BookLink>
          ) : (
            <span className="border border-stone-800 px-3 py-2 text-center text-[10px] uppercase tracking-micro text-stone-600">
              {r.platform}
            </span>
          )}
          <GhostLink href={directionsUrl}>Directions</GhostLink>
        </div>
      </article>
    </div>
  );
}

/**
 * Real, minimal NYC geography. The water is the ink background; land masses
 * (Manhattan, Brooklyn, Queens, the Bronx) are drawn as a faint fill with a 1px
 * stone coastline, so the Hudson and East River read as negative space. Paths
 * are pre-projected in lib/mapGeometry with the same transform as the dots. A
 * very faint dotted grid keeps the departures-board "instrument" texture.
 */
function MapBackground({ width, height }: { width: number; height: number }) {
  const step = 80;
  const lines: React.ReactNode[] = [];
  for (let x = step; x < width; x += step) {
    lines.push(
      <line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        className="stroke-stone-900"
        strokeWidth={0.5}
        strokeDasharray="1 9"
      />
    );
  }
  for (let y = step; y < height; y += step) {
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        className="stroke-stone-900"
        strokeWidth={0.5}
        strokeDasharray="1 9"
      />
    );
  }

  return (
    <g aria-hidden="true">
      {lines}
      {LAND_PATHS.map((p, i) => (
        <path
          key={i}
          d={p.d}
          className="fill-stone-900/70 stroke-stone-700"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}
