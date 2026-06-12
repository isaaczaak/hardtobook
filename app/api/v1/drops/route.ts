import { NextResponse } from "next/server";
import restaurantData from "@/data/restaurants.json";
import type { Restaurant } from "@/lib/types";
import {
  computeUpcomingDrops,
  formatEtDayAbsolute,
  parseReleaseTime,
  formatClockLabel,
} from "@/lib/time";

// Drops are time-relative ("seconds until the next 10 AM release"), so they
// must be computed per request — never cached as a static snapshot.
export const dynamic = "force-dynamic";

const restaurants = restaurantData.restaurants as Restaurant[];

const HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Time-sensitive: do not cache.
  "Cache-Control": "no-store",
};

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

/** Human "X days out" label from the booking window; falls back gracefully. */
function becomesBookableLabel(r: Restaurant): string {
  if (r.bookingWindowDays != null) {
    return `tables ${r.bookingWindowDays} days out`;
  }
  // Some venues (e.g. monthly full-month releases) have no day count — use the
  // human bookingWindow label instead of fabricating a number.
  if (r.bookingWindow && r.bookingWindow !== "N/A") {
    return `tables for the next ${r.bookingWindow}`;
  }
  return "new tables become bookable";
}

export function GET(): NextResponse {
  const now = Date.now();
  const drops = computeUpcomingDrops(restaurants, now);

  const payload = drops.map(({ restaurant: r, dropAtMs, msUntil }) => {
    // dropAtEt combines the parsed release clock with the absolute NY day so
    // the string reads "10:00 AM ET, Mon Jun 16" regardless of caller timezone.
    const parsed = parseReleaseTime(r.releaseTime);
    const clock = parsed ? formatClockLabel(parsed) : r.releaseTime;
    const dropAtEt = `${clock} ET, ${formatEtDayAbsolute(dropAtMs)}`;

    return {
      id: r.id,
      name: r.name,
      platform: r.platform,
      platformUrl: r.platformUrl,
      dropAtIso: new Date(dropAtMs).toISOString(),
      dropAtEt,
      secondsUntil: Math.max(0, Math.round(msUntil / 1000)),
      becomesBookable: becomesBookableLabel(r),
    };
  });

  return NextResponse.json(
    {
      meta: {
        source: "hardtobook.nyc",
        version: "v1",
        count: payload.length,
        disclaimer: "Always confirm with the restaurant.",
        docs: "https://hardtobook.nyc/llms.txt",
      },
      drops: payload,
    },
    { headers: HEADERS }
  );
}
