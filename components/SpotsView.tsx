"use client";

import { useMemo, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { getNextReleaseMs, parseReleaseTime } from "@/lib/time";
import { SpotCard } from "./SpotCard";
import { MapView } from "./MapView";
import { MicroLabel } from "./ui";

type SortKey = "difficulty" | "soonest" | "az";
type ViewMode = "list" | "map";

const selectCls =
  "w-full min-w-0 bg-stone-950 border border-stone-800 text-paper text-xs px-2 py-2 min-h-[44px] focus-visible:border-stone-500";

export function SpotsView({
  restaurants,
  isStarred,
  toggle,
}: {
  restaurants: Restaurant[];
  isStarred: (id: string) => boolean;
  toggle: (id: string) => void;
}) {
  const now = useNow();
  const [search, setSearch] = useState("");
  const [neighborhood, setNeighborhood] = useState("all");
  const [cuisine, setCuisine] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState<SortKey>("difficulty");
  const [view, setView] = useState<ViewMode>("list");

  const neighborhoods = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.neighborhood))).sort(),
    [restaurants]
  );
  const cuisines = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.cuisine))).sort(),
    [restaurants]
  );
  const platforms = useMemo(
    () => Array.from(new Set(restaurants.map((r) => r.platform))).sort(),
    [restaurants]
  );

  // Soonest-drop ms per restaurant, recomputed only when `now` is set.
  const dropMs = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const r of restaurants) {
      if (now == null || r.releaseSchedule === "none") {
        map.set(r.id, null);
        continue;
      }
      const release = parseReleaseTime(r.releaseTime);
      map.set(
        r.id,
        release
          ? getNextReleaseMs(release, r.releaseSchedule, r.releaseDay, now)
          : null
      );
    }
    return map;
  }, [restaurants, now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = restaurants.filter((r) => {
      if (platform === "walk-ins" && !r.walkIns) return false;
      if (platform !== "all" && platform !== "walk-ins" && r.platform !== platform)
        return false;
      if (neighborhood !== "all" && r.neighborhood !== neighborhood) return false;
      if (cuisine !== "all" && r.cuisine !== cuisine) return false;
      if (q) {
        const hay = `${r.name} ${r.cuisine} ${r.neighborhood}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "difficulty") {
        if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
        return a.name.localeCompare(b.name);
      }
      // soonest drop: nulls (no schedule) sink to the bottom.
      const am = dropMs.get(a.id);
      const bm = dropMs.get(b.id);
      if (am == null && bm == null) return a.name.localeCompare(b.name);
      if (am == null) return 1;
      if (bm == null) return -1;
      return am - bm;
    });

    return result;
  }, [restaurants, search, neighborhood, cuisine, platform, sort, dropMs]);

  return (
    <section aria-label="All spots">
      <div className="mb-4">
        <label className="block">
          <span className="sr-only">Search restaurants</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, cuisine, neighborhood"
            className="w-full bg-stone-950 border border-stone-800 text-paper text-sm px-3 py-2.5 min-h-[44px] placeholder:text-stone-600 focus-visible:border-stone-500"
          />
        </label>
      </div>

      <div className="mb-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="block">
          <MicroLabel className="block mb-1">Neighborhood</MicroLabel>
          <select
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className={selectCls}
          >
            <option value="all">All</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <MicroLabel className="block mb-1">Cuisine</MicroLabel>
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className={selectCls}
          >
            <option value="all">All</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <MicroLabel className="block mb-1">Platform</MicroLabel>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className={selectCls}
          >
            <option value="all">All</option>
            <option value="walk-ins">Walk-ins</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <MicroLabel className="block mb-1">Sort</MicroLabel>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={selectCls}
          >
            <option value="difficulty">Difficulty</option>
            <option value="soonest">Soonest drop</option>
            <option value="az">A–Z</option>
          </select>
        </label>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-micro text-stone-600">
          {filtered.length} {filtered.length === 1 ? "spot" : "spots"}
        </p>
        <div
          role="group"
          aria-label="View mode"
          className="inline-flex border border-stone-800"
        >
          {(["list", "map"] as const).map((mode) => {
            const active = view === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={active}
                className={[
                  "px-3 py-1.5 text-[10px] uppercase tracking-micro transition-colors duration-200",
                  active
                    ? "bg-paper text-ink"
                    : "text-stone-500 hover:text-paper",
                ].join(" ")}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {view === "map" ? (
        <MapView restaurants={filtered} isStarred={isStarred} toggle={toggle} />
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-stone-500">
          Nothing matches. Loosen a filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <SpotCard
              key={r.id}
              restaurant={r}
              starred={isStarred(r.id)}
              onToggle={toggle}
            />
          ))}
        </div>
      )}
    </section>
  );
}
