import { NextResponse } from "next/server";
import restaurantData from "@/data/restaurants.json";
import type { Restaurant } from "@/lib/types";

// Full restaurant records are static — the dataset only changes on deploy, so
// we can render this once at build time and let CDNs cache it aggressively.
export const dynamic = "force-static";

const restaurants = restaurantData.restaurants as Restaurant[];

// CORS + caching headers shared across the v1 surface. Agents call this
// cross-origin from arbitrary tools, so we allow any origin for GET/OPTIONS.
const HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Static dataset: cache for an hour at the edge, serve stale while revalidating.
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export function GET(): NextResponse {
  return NextResponse.json(
    {
      meta: {
        source: "hardtobook.nyc",
        version: "v1",
        count: restaurants.length,
        disclaimer: "Always confirm with the restaurant.",
        docs: "https://hardtobook.nyc/llms.txt",
      },
      spots: restaurants,
    },
    { headers: HEADERS }
  );
}
