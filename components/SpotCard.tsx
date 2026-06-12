"use client";

import { useState } from "react";
import type { Restaurant } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import {
  getNextReleaseMs,
  parseReleaseTime,
} from "@/lib/time";
import { Countdown } from "./Countdown";
import { DifficultyMeter } from "./DifficultyMeter";
import { StarButton } from "./StarButton";
import { PlatformChip, MicroLabel, BookLink } from "./ui";
import { CopyPromptButton } from "./CopyPromptButton";
import { buildSpotPrompt } from "@/lib/agentPrompt";
import { LinkIcon, InstagramIcon } from "./icons";

export function SpotCard({
  restaurant,
  starred,
  onToggle,
}: {
  restaurant: Restaurant;
  starred: boolean;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const now = useNow();

  // Live countdown to this spot's next drop (null if no schedule / pre-mount).
  let msUntil: number | null = null;
  if (now != null && restaurant.releaseSchedule !== "none") {
    const release = parseReleaseTime(restaurant.releaseTime);
    if (release) {
      msUntil = getNextReleaseMs(
        release,
        restaurant.releaseSchedule,
        restaurant.releaseDay,
        now
      );
    }
  }

  return (
    <article className="border border-stone-800 p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-paper leading-tight">
              {restaurant.name}
            </h3>
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 hover:text-paper transition-colors duration-200"
                aria-label={`${restaurant.name} website`}
              >
                <LinkIcon />
              </a>
            )}
            {restaurant.instagram && (
              <a
                href={`https://instagram.com/${restaurant.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 hover:text-paper transition-colors duration-200"
                aria-label={`${restaurant.name} on Instagram`}
              >
                <InstagramIcon />
              </a>
            )}
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            {restaurant.neighborhood} · {restaurant.cuisine} ·{" "}
            <span className="font-mono">{restaurant.priceRange}</span>
          </p>
        </div>
        <StarButton
          id={restaurant.id}
          name={restaurant.name}
          starred={starred}
          onToggle={onToggle}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformChip platform={restaurant.platform} />
          {restaurant.walkIns && (
            <span className="inline-block border border-teal-800/60 bg-teal-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-micro text-teal-300">
              Walk-ins
            </span>
          )}
        </div>
        <DifficultyMeter difficulty={restaurant.difficulty} />
      </div>

      <dl className="mt-3 border-t border-stone-800 pt-3 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-stone-500">Window</dt>
          <dd className="text-stone-300">{restaurant.bookingWindow}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-stone-500">Release</dt>
          <dd className="font-mono text-stone-300">{restaurant.releaseTime}</dd>
        </div>
        {restaurant.releaseSchedule !== "none" && (
          <div className="flex justify-between gap-2">
            <dt className="text-stone-500">Next drop</dt>
            <dd className="text-emerald-400">
              <Countdown msUntil={msUntil} />
            </dd>
          </div>
        )}
      </dl>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-3 self-start text-[10px] uppercase tracking-micro text-stone-500 hover:text-paper transition-colors duration-200"
      >
        {expanded ? "− Hide guide" : "+ Guide"}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-stone-800 pt-3 space-y-3">
          <div>
            <MicroLabel>Signature</MicroLabel>
            <p className="mt-0.5 text-xs text-stone-300">
              {restaurant.signatureDish}
            </p>
          </div>
          {restaurant.tips.length > 0 && (
            <div>
              <MicroLabel>Strategy</MicroLabel>
              <ul className="mt-1 space-y-1 text-xs text-stone-400">
                {restaurant.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-stone-600" aria-hidden="true">
                      ·
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {restaurant.walkIn?.advice && (
            <div>
              <MicroLabel>Walk-in</MicroLabel>
              <p className="mt-0.5 text-xs text-stone-400">
                {restaurant.walkIn.advice}
              </p>
            </div>
          )}
          <div>
            <MicroLabel className="block mb-1.5">Hand to your agent</MicroLabel>
            <CopyPromptButton
              text={buildSpotPrompt(restaurant)}
              label="COPY PROMPT"
              compact
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {restaurant.platformUrl && (
          <BookLink href={restaurant.platformUrl} full>
            Book on {restaurant.platform}
          </BookLink>
        )}
        {restaurant.phoneNumber && (
          <a
            href={`tel:${restaurant.phoneNumber}`}
            className="inline-flex w-full items-center justify-center border border-stone-700 px-4 py-2.5 text-xs uppercase tracking-micro text-paper transition-colors duration-200 hover:border-stone-500 hover:bg-stone-900"
          >
            {restaurant.phoneNumber}
          </a>
        )}
      </div>
    </article>
  );
}
