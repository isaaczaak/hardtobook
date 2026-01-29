"use client";

import { useState, useMemo } from "react";
import { RestaurantCard } from "@/components/RestaurantCard";
import restaurantData from "@/data/restaurants.json";
import { Restaurant } from "@/lib/types";

const restaurants = restaurantData.restaurants as Restaurant[];

export default function Home() {
  const [platform, setPlatform] = useState<string>("all");
  const [neighborhood, setNeighborhood] = useState<string>("all");
  const [cuisine, setCuisine] = useState<string>("all");

  const platforms = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.platform));
    return Array.from(set).sort();
  }, []);

  const neighborhoods = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.neighborhood));
    return Array.from(set).sort();
  }, []);

  const cuisines = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.cuisine));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    let result = [...restaurants];

    if (platform === "walk-ins") {
      result = result.filter((r) => r.walkIns);
    } else if (platform !== "all") {
      result = result.filter((r) => r.platform === platform);
    }
    if (neighborhood !== "all") {
      result = result.filter((r) => r.neighborhood === neighborhood);
    }
    if (cuisine !== "all") {
      result = result.filter((r) => r.cuisine === cuisine);
    }

    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [platform, neighborhood, cuisine]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <header className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">🥀🍴 hard to book</h1>
        <p className="text-zinc-500 text-sm">NYC's hardest reservations. Release times, tips, strategies.</p>
      </header>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <select
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="bg-zinc-900 text-white px-2 py-1.5 border border-zinc-700 text-xs w-full min-w-0"
        >
          <option value="all">All locations</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        <select
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          className="bg-zinc-900 text-white px-2 py-1.5 border border-zinc-700 text-xs w-full min-w-0"
        >
          <option value="all">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="bg-zinc-900 text-white px-2 py-1.5 border border-zinc-700 text-xs w-full min-w-0"
        >
          <option value="all">All platforms</option>
          <option value="walk-ins">Walk-ins</option>
          {platforms.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">No restaurants match your filters.</p>
      )}

      <footer className="mt-8 pt-4 border-t border-zinc-800 text-zinc-600 text-xs">
        <p>Data last verified: January 2026. Always confirm directly with restaurant.</p>
      </footer>
    </main>
  );
}
