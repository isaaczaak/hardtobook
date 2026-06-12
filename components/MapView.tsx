"use client";

import { useMemo, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { getNextReleaseMs, parseReleaseTime } from "@/lib/time";
import { DifficultyMeter } from "./DifficultyMeter";
import { StarButton } from "./StarButton";
import { PlatformChip, BookLink, GhostLink, MicroLabel } from "./ui";

// ---------------------------------------------------------------------------
// Projection
//
// A simple equirectangular projection with a latitude-corrected x-scale. NYC
// sits at ~40.74°N where one degree of longitude is much shorter than one
// degree of latitude; multiplying lng-extent by cos(40.74°) keeps the city
// from looking horizontally stretched. The dots are stylized, not navigational
// — neighborhood-centroid accuracy is all we need.
// ---------------------------------------------------------------------------

const LAT_REF = 40.74;
const LNG_SCALE = Math.cos((LAT_REF * Math.PI) / 180); // ~0.758

// Internal SVG units. We project lat/lng into a [0, SPAN] box (before padding)
// then size the viewBox around it. Larger numbers give the collision pass more
// room to nudge overlapping dots apart.
const SPAN = 1000;
const PAD = 90; // viewBox padding around the projected bounding box

// "Dropping now" window: rose is permitted ONLY when a scheduled drop is within
// this many ms of landing (the live moment). Everywhere else rose is forbidden.
const LIVE_WINDOW_MS = 60_000;

// Minimum centre-to-centre distance between dots, in SVG units, enforced by the
// collision pass below. Tuned so dots stay individually tappable at render size.
const MIN_GAP = 30;

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
  if (restaurants.length === 0) {
    return { dots: [], width: SPAN + PAD * 2, height: SPAN + PAD * 2 };
  }

  const lats = restaurants.map((r) => r.coordinates.lat);
  const lngs = restaurants.map((r) => r.coordinates.lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);

  // Raw extents in "corrected degrees" so x and y share a scale.
  const latExtent = Math.max(latMax - latMin, 1e-6);
  const lngExtent = Math.max((lngMax - lngMin) * LNG_SCALE, 1e-6);
  const extent = Math.max(latExtent, lngExtent);
  const scale = SPAN / extent;

  // Centre the smaller axis within the SPAN box.
  const xOffset = (SPAN - lngExtent * scale) / 2;
  const yOffset = (SPAN - latExtent * scale) / 2;

  const dots: Projected[] = restaurants.map((r) => ({
    r,
    x: PAD + xOffset + (r.coordinates.lng - lngMin) * LNG_SCALE * scale,
    // Higher latitude (north) → smaller y → top of the SVG.
    y: PAD + yOffset + (latMax - r.coordinates.lat) * scale,
    // Difficulty 5 reads slightly larger; everything else is a hair smaller.
    radius: r.difficulty >= 5 ? 8 : 6.5,
  }));

  relaxCollisions(dots);

  return {
    dots,
    width: SPAN + PAD * 2,
    height: SPAN + PAD * 2,
  };
}

/**
 * Deterministic collision relaxation. Dots in the West Village cluster (Carbone,
 * Via Carota, 4 Charles, Don Angie, Torrisi-ish) sit nearly on top of each
 * other; a few fixed-point iterations nudge any pair closer than MIN_GAP apart
 * along the line between them. Deterministic because it depends only on the
 * incoming positions — no randomness, so render is stable across reloads.
 */
function relaxCollisions(dots: Projected[]): void {
  const ITERATIONS = 60;
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

/** Is this spot in its live "dropping now" window right now? */
function isLiveNow(r: Restaurant, now: number | null): boolean {
  if (now == null || r.releaseSchedule === "none") return false;
  const release = parseReleaseTime(r.releaseTime);
  if (!release) return false;
  const ms = getNextReleaseMs(release, r.releaseSchedule, r.releaseDay, now);
  return ms != null && ms <= LIVE_WINDOW_MS;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { dots, width, height } = useMemo(
    () => projectRestaurants(restaurants),
    [restaurants]
  );

  // Resolve selection against the current filtered set. If the selected spot
  // was filtered out, it simply resolves to null and the panel reverts to its
  // hint state — no stale detail panel.
  const selected = dots.find((d) => d.r.id === selectedId)?.r ?? null;

  if (restaurants.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-stone-500">
        Nothing matches. Loosen a filter.
      </p>
    );
  }

  return (
    <div className="lg:flex lg:items-start lg:gap-4">
      {/* Map panel */}
      <div className="relative flex-1 border border-stone-800 bg-ink">
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <MicroLabel className="text-stone-600">NYC · 16 spots</MicroLabel>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          role="group"
          aria-label="Map of tracked restaurants. Select a dot for details."
        >
          {/* Stylized geography: river strokes as negative space + a fine grid.
              Transit-diagram abstraction, not cartography. Coordinates are in
              the same projected SPAN+PAD space as the dots. */}
          <MapBackground width={width} height={height} />

          {/* Area micro-labels */}
          <g
            fontSize="13"
            letterSpacing="1.4"
            className="fill-stone-700"
            style={{ textTransform: "uppercase" }}
            aria-hidden="true"
          >
            <text x={PAD + 250} y={PAD + 120}>
              MANHATTAN
            </text>
            <text x={PAD + 760} y={PAD + 760}>
              BROOKLYN
            </text>
            <text
              x={PAD + 120}
              y={PAD + 560}
              fontSize="10"
              className="fill-stone-800"
            >
              W. VILLAGE
            </text>
          </g>

          {/* Dots */}
          {dots.map((d) => {
            const starred = isStarred(d.r.id);
            const live = isLiveNow(d.r, now);
            const isSelected = d.r.id === selectedId;
            const fill = live
              ? "fill-rose"
              : starred
                ? "fill-paper"
                : "fill-stone-400";
            return (
              <g key={d.r.id}>
                {isSelected && (
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
                  aria-label={`${d.r.name}, ${d.r.neighborhood}, difficulty ${Math.round(
                    d.r.difficulty
                  )} of 5${live ? ", dropping now" : ""}${
                    starred ? ", on your watchlist" : ""
                  }`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(d.r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(d.r.id);
                    }
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel — floats beside the map on desktop, drops under it on
          mobile. Never clipped: it lives outside the SVG entirely. */}
      <div className="mt-3 lg:mt-0 lg:w-72 lg:flex-shrink-0">
        {selected ? (
          <MapDetailPanel
            restaurant={selected}
            starred={isStarred(selected.id)}
            live={isLiveNow(selected, now)}
            onToggle={toggle}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="border border-stone-800 p-4">
            <MicroLabel className="block">Detail</MicroLabel>
            <p className="mt-2 text-xs text-stone-500">
              Select a dot to see booking intel. Larger dots are difficulty 5.
              Starred spots fill paper-white.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MapDetailPanel({
  restaurant,
  starred,
  live,
  onToggle,
  onClose,
}: {
  restaurant: Restaurant;
  starred: boolean;
  live: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${restaurant.name} ${restaurant.neighborhood} NYC`
  )}`;

  return (
    <article className="border border-stone-800 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight text-paper">
            {restaurant.name}
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {restaurant.neighborhood} · {restaurant.cuisine}
          </p>
        </div>
        <StarButton
          id={restaurant.id}
          name={restaurant.name}
          starred={starred}
          onToggle={onToggle}
        />
      </div>

      {live && (
        <p className="mt-2 inline-block border border-rose/60 px-1.5 py-0.5 text-[10px] uppercase tracking-micro text-rose">
          Dropping now
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <PlatformChip platform={restaurant.platform} />
        <DifficultyMeter difficulty={restaurant.difficulty} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {restaurant.platformUrl && (
          <BookLink href={restaurant.platformUrl} full>
            Book on {restaurant.platform}
          </BookLink>
        )}
        <GhostLink href={directionsUrl}>Directions</GhostLink>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-3 text-[10px] uppercase tracking-micro text-stone-600 transition-colors duration-200 hover:text-paper"
      >
        Close
      </button>
    </article>
  );
}

/**
 * Abstract geography. Two soft polyline strokes suggest the Hudson (west) and
 * the East River bend separating Manhattan from Brooklyn, over a faint dotted
 * grid. Thin stone strokes on ink — negative space does the work, no fills.
 */
function MapBackground({ width, height }: { width: number; height: number }) {
  // Fine dotted grid across the whole viewBox.
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
        strokeDasharray="1 7"
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
        strokeDasharray="1 7"
      />
    );
  }

  return (
    <g aria-hidden="true">
      {lines}
      {/* Hudson — a near-vertical sweep down the west edge of Manhattan. */}
      <path
        d={`M ${width * 0.16} ${height * 0.04}
            C ${width * 0.2} ${height * 0.3}, ${width * 0.12} ${height * 0.55}, ${width * 0.22} ${height * 0.82}`}
        className="fill-none stroke-stone-800"
        strokeWidth={1}
        strokeLinecap="round"
      />
      {/* East River — bends southeast, dividing Manhattan from Brooklyn. */}
      <path
        d={`M ${width * 0.58} ${height * 0.04}
            C ${width * 0.6} ${height * 0.34}, ${width * 0.72} ${height * 0.5}, ${width * 0.62} ${height * 0.92}`}
        className="fill-none stroke-stone-800"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </g>
  );
}
