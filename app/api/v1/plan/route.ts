import { NextRequest, NextResponse } from "next/server";
import restaurantData from "@/data/restaurants.json";
import type { Restaurant } from "@/lib/types";
import {
  computePlan,
  parseDateInput,
  todayInputValue,
  formatEtDayAbsolute,
  type PlanBucket,
} from "@/lib/time";

// Plans are computed against an absolute `now` (a given release moment may
// already be in the past), so this must run per request.
export const dynamic = "force-dynamic";

const restaurants = restaurantData.restaurants as Restaurant[];

const HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

// The API `action` enum is the frozen contract. The PLAN view's internal bucket
// names differ, so we map them here — change the UI, not this mapping.
const ACTION_BY_BUCKET: Record<PlanBucket, PlanAction> = {
  "MARK YOUR CALENDAR": "mark-calendar",
  "BOOKABLE NOW": "bookable-now",
  "JUST SHOW UP": "walk-in",
  "CALL AHEAD": "call",
  "GOOD LUCK": "invitation-only",
};

type PlanAction =
  | "mark-calendar"
  | "bookable-now"
  | "walk-in"
  | "call"
  | "invitation-only";

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

function errorResponse(status: number, message: string): NextResponse {
  return NextResponse.json(
    {
      meta: {
        source: "hardtobook.xyz",
        version: "v1",
        disclaimer: "Always confirm with the restaurant.",
        docs: "https://www.hardtobook.xyz/llms.txt",
      },
      error: message,
    },
    { status, headers: HEADERS }
  );
}

export function GET(request: NextRequest): NextResponse {
  const now = Date.now();
  const dateParam = request.nextUrl.searchParams.get("date");

  // Boundary validation: trust nothing from the client. Never 500 on bad input.
  if (!dateParam) {
    return errorResponse(
      400,
      "Missing required query parameter `date`. Use ?date=YYYY-MM-DD (today or later)."
    );
  }

  const parsed = parseDateInput(dateParam);
  if (!parsed) {
    return errorResponse(
      400,
      `Invalid date \`${dateParam}\`. Expected format YYYY-MM-DD, e.g. ${todayInputValue(now)}.`
    );
  }

  // Reject impossible calendar dates that still match the YYYY-MM-DD shape
  // (e.g. 2026-13-40) before they reach the date math.
  if (
    parsed.month < 1 ||
    parsed.month > 12 ||
    parsed.day < 1 ||
    parsed.day > 31
  ) {
    return errorResponse(
      400,
      `Invalid date \`${dateParam}\`. Month must be 01-12 and day 01-31.`
    );
  }

  // Must be today or later (NY calendar). Lexicographic compare is safe for
  // zero-padded YYYY-MM-DD strings.
  const today = todayInputValue(now);
  const normalized = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
  if (normalized < today) {
    return errorResponse(
      400,
      `Date \`${normalized}\` is in the past. Use today (${today}) or a future date.`
    );
  }

  const plans = restaurants.map((r) => {
    const result = computePlan(r, parsed, now);
    const action = ACTION_BY_BUCKET[result.bucket];

    // advice: prefer the computed note, else fall back to the action label.
    const advice = result.note ?? result.actionLabel ?? "";

    const base = {
      id: r.id,
      name: r.name,
      action,
      platform: r.platform,
      platformUrl: r.platformUrl,
      phoneNumber: r.phoneNumber,
      advice,
    };

    // Only mark-calendar plans carry an absolute book-at moment.
    if (action === "mark-calendar" && result.bookAtMs != null) {
      const parsedClock = r.releaseTime;
      return {
        ...base,
        bookAtIso: new Date(result.bookAtMs).toISOString(),
        bookAtEt: `${parsedClock}, ${formatEtDayAbsolute(result.bookAtMs)}`,
        advice: result.actionLabel ?? advice,
      };
    }

    return base;
  });

  return NextResponse.json(
    {
      meta: {
        source: "hardtobook.xyz",
        version: "v1",
        count: plans.length,
        date: normalized,
        disclaimer: "Always confirm with the restaurant.",
        docs: "https://www.hardtobook.xyz/llms.txt",
      },
      plans,
    },
    { headers: HEADERS }
  );
}
