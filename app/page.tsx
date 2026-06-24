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
import { MapView } from "@/components/MapView";

const restaurants = (restaurantData as { restaurants: Restaurant[] }).restaurants;

const MODES: Mode[] = ["drops", "tonight", "plan", "spots", "map"];

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
        {mode === "map" && (
          <MapView
            restaurants={restaurants}
            isStarred={watchlist.isStarred}
            toggle={watchlist.toggle}
          />
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 border-t border-stone-800">
        <p className="mb-4 max-w-xl border border-stone-700 px-3 py-2 text-xs leading-relaxed text-stone-300">
          <span className="font-medium text-paper">No booking bots.</span> This
          is a timing tracker, not an auto-booker. It will never reserve a table
          for you. Booking bots violate Resy/Tock/OpenTable terms.
        </p>
        <p className="text-[10px] uppercase tracking-micro text-stone-600">
          Times in ET. Always confirm directly with the restaurant.
        </p>
        <p className="mt-2 text-xs text-stone-600">
          for agents →{" "}
          <a
            href="/llms.txt"
            className="underline decoration-stone-700 underline-offset-2 transition-colors duration-200 hover:text-paper"
          >
            /llms.txt
          </a>{" "}
          ·{" "}
          <a
            href="/skill.md"
            className="underline decoration-stone-700 underline-offset-2 transition-colors duration-200 hover:text-paper"
          >
            /skill.md
          </a>{" "}
          ·{" "}
          <a
            href="/api/v1/spots"
            className="underline decoration-stone-700 underline-offset-2 transition-colors duration-200 hover:text-paper"
          >
            api
          </a>
        </p>
        <p className="mt-2 text-xs text-stone-600">
          <a
            href="https://x.com/isaaccyn"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-stone-700 underline-offset-2 transition-colors duration-200 hover:text-paper"
          >
            share feedback →
          </a>
        </p>
      </footer>
    </NowProvider>
  );
}
