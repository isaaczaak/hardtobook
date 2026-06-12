"use client";

import { useEffect, useState } from "react";
import restaurantData from "@/data/restaurants.json";
import type { Restaurant } from "@/lib/types";
import { NowProvider } from "@/lib/useNow";
import { useWatchlist } from "@/lib/useWatchlist";
import { Header, type Mode } from "@/components/Header";
import { DropsView } from "@/components/DropsView";
import { TonightView } from "@/components/TonightView";
import { PlanView } from "@/components/PlanView";
import { SpotsView } from "@/components/SpotsView";

const restaurants = (restaurantData as { restaurants: Restaurant[] }).restaurants;

const MODES: Mode[] = ["drops", "tonight", "plan", "spots"];

function isMode(value: string | null): value is Mode {
  return value != null && (MODES as string[]).includes(value);
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("drops");
  const watchlist = useWatchlist();

  // Read ?view= on mount so shared links land on the right mode.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (isMode(view)) setMode(view);
  }, []);

  // Keep the URL in sync without adding history entries.
  const changeMode = (next: Mode) => {
    setMode(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <NowProvider>
      <Header mode={mode} onModeChange={changeMode} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {mode === "drops" && (
          <DropsView
            restaurants={restaurants}
            isStarred={watchlist.isStarred}
            toggle={watchlist.toggle}
            watchlistIds={watchlist.ids}
          />
        )}
        {mode === "tonight" && (
          <TonightView
            restaurants={restaurants}
            isStarred={watchlist.isStarred}
            toggle={watchlist.toggle}
          />
        )}
        {mode === "plan" && (
          <PlanView
            restaurants={restaurants}
            isStarred={watchlist.isStarred}
            toggle={watchlist.toggle}
          />
        )}
        {mode === "spots" && (
          <SpotsView
            restaurants={restaurants}
            isStarred={watchlist.isStarred}
            toggle={watchlist.toggle}
          />
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 border-t border-stone-800">
        <p className="text-[10px] uppercase tracking-micro text-stone-600">
          Times in ET. Always confirm directly with the restaurant.
        </p>
      </footer>
    </NowProvider>
  );
}
